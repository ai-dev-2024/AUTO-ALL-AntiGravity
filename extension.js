const vscode = require('vscode');
const path = require('path');

let SettingsPanel = null;
function getSettingsPanel() {
    if (!SettingsPanel) {
        try {
            SettingsPanel = require('./settings-panel').SettingsPanel;
        } catch (e) {
            console.error('Failed to load SettingsPanel:', e);
        }
    }
    return SettingsPanel;
}

const GLOBAL_STATE_KEY = 'auto-all-enabled-global';
const PRO_STATE_KEY = 'auto-all-isPro';
const FREQ_STATE_KEY = 'auto-all-frequency';
const BANNED_COMMANDS_KEY = 'auto-all-banned-commands';
const ROI_STATS_KEY = 'auto-all-roi-stats';
const SECONDS_PER_CLICK = 5;

const LOCK_KEY = 'auto-all-instance-lock';
const HEARTBEAT_KEY = 'auto-all-instance-heartbeat';
const INSTANCE_ID = Math.random().toString(36).substring(7);

let isEnabled = false;
let isPro = false;
let isLockedOut = false;
let pollFrequency = 100;
let bannedCommands = [];
let acceptPatterns = [];

let backgroundModeEnabled = false;
const BACKGROUND_DONT_SHOW_KEY = 'auto-all-background-dont-show';
const BACKGROUND_MODE_KEY = 'auto-all-background-mode';
const VERSION_7_0_KEY = 'auto-all-version-7.0-notification-shown';

let pollTimer;
let statsCollectionTimer;
let statusBarItem;
let outputChannel;
let currentIDE = 'unknown';
let globalContext;

let cdpHandler;
let relauncher;

// CDP health tracking for auto-recovery
let hadCDPConnection = false;
let lastRelaunchPromptTime = 0;
const RELAUNCH_PROMPT_COOLDOWN = 60000; // 1 minute cooldown

function log(message) {
    try {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const logLine = `[${timestamp}] ${message}`;
        console.log(logLine);
    } catch (e) {
        console.error('Logging failed:', e);
    }
}

function detectIDE() {
    const appName = vscode.env.appName || '';
    if (appName.toLowerCase().includes('cursor')) return 'Cursor';
    if (appName.toLowerCase().includes('antigravity')) return 'Antigravity';
    return 'Code';
}

async function activate(context) {
    globalContext = context;
    console.log('auto-all-Antigravity: Activator called.');

    try {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.command = 'auto-all.cycleState';
        statusBarItem.text = '$(sync~spin)';
        statusBarItem.tooltip = 'auto-all-Antigravity: Loading...';
        context.subscriptions.push(statusBarItem);
        statusBarItem.show();

        console.log('auto-all-Antigravity: Status bar items created and shown.');
    } catch (sbError) {
        console.error('CRITICAL: Failed to create status bar items:', sbError);
    }

    try {

        isEnabled = context.globalState.get(GLOBAL_STATE_KEY, true);
        isPro = context.globalState.get(PRO_STATE_KEY, false);
        isPro = true;

        if (isPro) {
            pollFrequency = context.globalState.get(FREQ_STATE_KEY, 100);
        } else {
            pollFrequency = 100;
        }

        backgroundModeEnabled = false;
        context.globalState.update(BACKGROUND_MODE_KEY, false);

        const defaultBannedCommands = [
            'rm -rf /',
            'rm -rf ~',
            'rm -rf *',
            'format c:',
            'del /f /s /q',
            'rmdir /s /q',
            ':(){:|:&};:',
            'dd if=',
            'mkfs.',
            '> /dev/sda',
            'chmod -R 777 /'
        ];
        bannedCommands = context.globalState.get(BANNED_COMMANDS_KEY, defaultBannedCommands);

        currentIDE = detectIDE();

        outputChannel = vscode.window.createOutputChannel('auto-all-Antigravity');
        context.subscriptions.push(outputChannel);

        log(`auto-all-Antigravity: Activating...`);
        log(`auto-all-Antigravity: Detected environment: ${currentIDE.toUpperCase()}`);

        vscode.window.onDidChangeWindowState(async (e) => {

            if (cdpHandler && cdpHandler.setFocusState) {
                await cdpHandler.setFocusState(e.focused);
            }

            if (e.focused && isEnabled) {
                log(`[Away] Window focus detected by VS Code API. Checking for away actions...`);

                setTimeout(() => checkForAwayActions(context), 500);
            }
        });

        try {
            const { CDPHandler } = require('./main_scripts/cdp-handler');
            const { Relauncher, BASE_CDP_PORT } = require('./main_scripts/relauncher');

            cdpHandler = new CDPHandler(BASE_CDP_PORT, BASE_CDP_PORT + 10, log);
            if (cdpHandler.setProStatus) {
                cdpHandler.setProStatus(isPro);
            }

            try {
                const logPath = path.join(context.extensionPath, 'auto-all-cdp.log');
                cdpHandler.setLogFile(logPath);
                log(`CDP logging to: ${logPath}`);
            } catch (e) {
                log(`Failed to set log file: ${e.message}`);
            }

            relauncher = new Relauncher(log);
            log(`CDP handlers initialized for ${currentIDE}.`);
        } catch (err) {
            log(`Failed to initialize CDP handlers: ${err.message}`);
            vscode.window.showErrorMessage(`auto-all-Antigravity Error: ${err.message}`);
        }

        updateStatusBar();
        log('Status bar updated with current state.');

        context.subscriptions.push(
            vscode.commands.registerCommand('auto-all.toggle', () => handleToggle(context)),
            vscode.commands.registerCommand('auto-all.cycleState', () => handleCycleState(context)),
            vscode.commands.registerCommand('auto-all.relaunch', () => handleRelaunch()),
            vscode.commands.registerCommand('auto-all.updateFrequency', (freq) => handleFrequencyUpdate(context, freq)),
            vscode.commands.registerCommand('auto-all.toggleBackground', () => handleBackgroundToggle(context)),
            vscode.commands.registerCommand('auto-all.updateBannedCommands', (commands) => handleBannedCommandsUpdate(context, commands)),
            vscode.commands.registerCommand('auto-all.getBannedCommands', () => bannedCommands),
            vscode.commands.registerCommand('auto-all.updateAcceptPatterns', (patterns) => handleAcceptPatternsUpdate(context, patterns)),
            vscode.commands.registerCommand('auto-all.getAcceptPatterns', () => acceptPatterns),
            vscode.commands.registerCommand('auto-all.getROIStats', async () => {
                const stats = await loadROIStats(context);
                const timeSavedSeconds = stats.clicksThisWeek * SECONDS_PER_CLICK;
                const timeSavedMinutes = Math.round(timeSavedSeconds / 60);
                return {
                    ...stats,
                    timeSavedMinutes,
                    timeSavedFormatted: timeSavedMinutes >= 60
                        ? `${(timeSavedMinutes / 60).toFixed(1)} hours`
                        : `${timeSavedMinutes} minutes`
                };
            }),
            vscode.commands.registerCommand('auto-all.openSettings', () => {
                const panel = getSettingsPanel();
                if (panel) {
                    panel.createOrShow(context.extensionUri, context);
                } else {
                    vscode.window.showErrorMessage('Failed to load Settings Panel.');
                }
            })
        );

        try {
            await checkEnvironmentAndStart();
        } catch (err) {
            log(`Error in environment check: ${err.message}`);
        }

        showVersionNotification(context);

        log('auto-all-Antigravity: Activation complete');
    } catch (error) {
        console.error('ACTIVATION CRITICAL FAILURE:', error);
        log(`ACTIVATION CRITICAL FAILURE: ${error.message}`);
        vscode.window.showErrorMessage(`auto-all-Antigravity failed to activate: ${error.message}`);
    }
}

async function ensureCDPOrPrompt(showPrompt = false) {
    if (!cdpHandler) return;

    log('Checking for active CDP session...');
    const cdpAvailable = await cdpHandler.isCDPAvailable();
    log(`Environment check: CDP Available = ${cdpAvailable}`);

    if (cdpAvailable) {
        log('CDP is active and available.');
    } else {
        log('CDP not found on expected ports (9000-9030).');

        if (showPrompt && relauncher) {
            log('Prompting user for relaunch...');
            await relauncher.showRelaunchPrompt();
        } else {
            log('Skipping relaunch prompt (startup). User can click status bar to trigger.');
        }
    }
}

async function checkEnvironmentAndStart() {
    log('Initializing auto-all-Antigravity environment...');

    // Always check CDP availability on startup (even if disabled)
    const cdpAvailable = cdpHandler ? await cdpHandler.isCDPAvailable() : false;
    log(`CDP availability check: ${cdpAvailable}`);

    if (!cdpAvailable && relauncher) {
        const lastAutoAttempt = globalContext.globalState.get('autoAll.lastAutoRelaunch', 0);
        const autoCooldown = 120000; // 2 minutes
        const now = Date.now();

        if (now - lastAutoAttempt < autoCooldown) {
            log('Auto-relaunch blocked by 2-minute cooldown to prevent infinite loops.');
            vscode.window.showWarningMessage('⚡ auto-all-Antigravity: Auto-restart prevented to avoid infinite loop. Please check terminal logs.');
        } else {
            // Auto-relaunch with CDP enabled (no prompts needed)
            await globalContext.globalState.update('autoAll.lastAutoRelaunch', now);
            log('CDP not available. Auto-relaunching with CDP enabled...');
            vscode.window.showInformationMessage('⚡ auto-all-Antigravity: Setting up CDP, restarting...');

            const result = await relauncher.relaunchWithCDP();
            if (result.success && result.action === 'relaunched') {
                log('Relaunch initiated. Exiting current instance...');
                return; // Will quit and relaunch
            } else if (!result.success) {
                log(`Auto-relaunch failed: ${result.message}`);
                // Fall through to normal operation - user can manually trigger via status bar
            }
        }
    }

    // Only start polling if enabled
    if (isEnabled) {
        await startPolling();
        startStatsCollection(globalContext);
    }
    updateStatusBar();
}

async function handleToggle(context) {
    log('=== handleToggle CALLED ===');
    log(`  Previous isEnabled: ${isEnabled}`);

    try {
        isEnabled = !isEnabled;
        log(`  New isEnabled: ${isEnabled}`);

        await context.globalState.update(GLOBAL_STATE_KEY, isEnabled);
        log(`  GlobalState updated`);

        log('  Calling updateStatusBar...');
        updateStatusBar();

        if (isEnabled) {
            log('auto-all-Antigravity: Enabled');

            ensureCDPOrPrompt(true).then(() => startPolling());
            startStatsCollection(context);
            incrementSessionCount(context);
        } else {
            log('auto-all-Antigravity: Disabled');

            if (cdpHandler) {
                cdpHandler.getSessionSummary()
                    .then(summary => showSessionSummaryNotification(context, summary))
                    .catch(() => { });
            }

            collectAndSaveStats(context).catch(() => { });
            stopPolling().catch(() => { });
            hadCDPConnection = false; // Reset for next session
        }

        log('=== handleToggle COMPLETE ===');
    } catch (e) {
        log(`Error toggling: ${e.message}`);
        log(`Error stack: ${e.stack}`);
    }
}

async function handleRelaunch() {
    if (!relauncher) {
        vscode.window.showErrorMessage('Relauncher not initialized.');
        return;
    }

    log('Initiating Relaunch...');
    const result = await relauncher.relaunchWithCDP();
    if (!result.success) {
        vscode.window.showErrorMessage(`Relaunch failed: ${result.message}`);
    }
}

async function handleFrequencyUpdate(context, freq) {
    pollFrequency = freq;
    await context.globalState.update(FREQ_STATE_KEY, freq);
    log(`Poll frequency updated to: ${freq}ms`);
    if (isEnabled) {
        await syncSessions();
    }
}

async function handleBannedCommandsUpdate(context, commands) {

    if (!isPro) {
        log('Banned commands customization requires Pro');
        return;
    }
    bannedCommands = Array.isArray(commands) ? commands : [];
    await context.globalState.update(BANNED_COMMANDS_KEY, bannedCommands);
    log(`Banned commands updated: ${bannedCommands.length} patterns`);
    if (bannedCommands.length > 0) {
        log(`Banned patterns: ${bannedCommands.slice(0, 5).join(', ')}${bannedCommands.length > 5 ? '...' : ''}`);
    }
    if (isEnabled) {
        await syncSessions();
    }
}

async function handleAcceptPatternsUpdate(context, patterns) {
    acceptPatterns = Array.isArray(patterns) ? patterns : [];
    await context.globalState.update('auto-all-accept-patterns', acceptPatterns);
    log(`Accept patterns updated: ${acceptPatterns.length} patterns`);
    if (isEnabled) {
        await syncSessions();
    }
}

async function handleBackgroundToggle(context) {
    log('Background toggle clicked');

    if (!isPro) {
        vscode.window.showInformationMessage(
            'Background Mode is a Pro feature.',
            'Learn More'
        ).then(choice => {
            if (choice === 'Learn More') {
                const panel = getSettingsPanel();
                if (panel) panel.createOrShow(context.extensionUri, context);
            }
        });
        return;
    }

    const dontShowAgain = context.globalState.get(BACKGROUND_DONT_SHOW_KEY, false);

    if (!dontShowAgain && !backgroundModeEnabled) {

        const choice = await vscode.window.showInformationMessage(
            'Turn on Multi-Tab Mode?\n\n' +
            'This lets auto-all-Antigravity work on all your open conversation tabs at once. ' +
            'It will switch between tabs to click Accept for you.\n\n' +
            'You might see tabs change quickly while it works.',
            { modal: true },
            'Enable',
            "Don't Show Again & Enable",
            'Cancel'
        );

        if (choice === 'Cancel' || !choice) {
            log('Background mode cancelled by user');
            return;
        }

        if (choice === "Don't Show Again & Enable") {
            await context.globalState.update(BACKGROUND_DONT_SHOW_KEY, true);
            log('Background mode: Dont show again set');
        }

        backgroundModeEnabled = true;
        await context.globalState.update(BACKGROUND_MODE_KEY, true);
        log('Background mode enabled');
    } else {

        backgroundModeEnabled = !backgroundModeEnabled;
        await context.globalState.update(BACKGROUND_MODE_KEY, backgroundModeEnabled);
        log(`Background mode toggled: ${backgroundModeEnabled}`);

        if (!backgroundModeEnabled && cdpHandler) {
            cdpHandler.hideBackgroundOverlay().catch(() => { });
        }
    }

    updateStatusBar();

    if (isEnabled) {
        syncSessions().catch(() => { });
    }
}

async function handleCycleState(context) {
    log('=== handleCycleState CALLED ===');
    log(`  Current state: isEnabled=${isEnabled}, backgroundModeEnabled=${backgroundModeEnabled}`);

    // Cycle: OFF → ON+Single → ON+Multi → OFF
    if (!isEnabled) {
        // OFF → ON + Single Tab
        isEnabled = true;
        backgroundModeEnabled = false;
        await context.globalState.update(GLOBAL_STATE_KEY, true);
        await context.globalState.update(BACKGROUND_MODE_KEY, false);
        log('  Cycled to: ON + Single Tab');

        ensureCDPOrPrompt(true).then(() => startPolling());
        startStatsCollection(context);
        incrementSessionCount(context);

    } else if (!backgroundModeEnabled) {
        // ON + Single → ON + Multi-Tab
        backgroundModeEnabled = true;
        await context.globalState.update(BACKGROUND_MODE_KEY, true);
        log('  Cycled to: ON + Multi-Tab');

        if (isEnabled) {
            syncSessions().catch(() => { });
        }

    } else {
        // ON + Multi-Tab → OFF
        isEnabled = false;
        backgroundModeEnabled = false;
        await context.globalState.update(GLOBAL_STATE_KEY, false);
        await context.globalState.update(BACKGROUND_MODE_KEY, false);
        log('  Cycled to: OFF');

        if (cdpHandler) {
            cdpHandler.getSessionSummary()
                .then(summary => showSessionSummaryNotification(context, summary))
                .catch(() => { });
            cdpHandler.hideBackgroundOverlay().catch(() => { });
        }

        collectAndSaveStats(context).catch(() => { });
        stopPolling().catch(() => { });
        hadCDPConnection = false; // Reset for next session
    }

    updateStatusBar();
    log('=== handleCycleState COMPLETE ===');
}

async function syncSessions() {
    if (cdpHandler && !isLockedOut) {
        log(`CDP: Syncing sessions (Mode: ${backgroundModeEnabled ? 'Background' : 'Simple'})...`);
        try {
            await cdpHandler.start({
                isPro,
                isBackgroundMode: backgroundModeEnabled,
                pollInterval: pollFrequency,
                ide: currentIDE,
                bannedCommands: bannedCommands,
                acceptPatterns: acceptPatterns
            });

            // CDP health check for auto-recovery
            const connectionCount = cdpHandler.getConnectionCount();

            if (connectionCount > 0) {
                hadCDPConnection = true;
            } else if (hadCDPConnection && isEnabled) {
                // We HAD connections but lost them - Antigravity probably restarted without CDP
                const now = Date.now();
                if (now - lastRelaunchPromptTime > RELAUNCH_PROMPT_COOLDOWN) {
                    lastRelaunchPromptTime = now;
                    log('CDP connection lost! Antigravity may have restarted. Prompting for relaunch...');
                    if (relauncher) {
                        relauncher.showRelaunchPrompt();
                    }
                }
            }
        } catch (err) {
            log(`CDP: Sync error: ${err.message}`);
        }
    }
}

async function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    log('auto-all-Antigravity: Monitoring session...');

    await syncSessions();

    pollTimer = setInterval(async () => {
        if (!isEnabled) return;

        const lockKey = `${currentIDE.toLowerCase()}-instance-lock`;
        const activeInstance = globalContext.globalState.get(lockKey);
        const myId = globalContext.extension.id;

        if (activeInstance && activeInstance !== myId) {
            const lastPing = globalContext.globalState.get(`${lockKey}-ping`);
            if (lastPing && (Date.now() - lastPing) < 15000) {
                if (!isLockedOut) {
                    log(`CDP Control: Locked by another instance (${activeInstance}). Standby mode.`);
                    isLockedOut = true;
                    updateStatusBar();
                }
                return;
            }
        }

        globalContext.globalState.update(lockKey, myId);
        globalContext.globalState.update(`${lockKey}-ping`, Date.now());

        if (isLockedOut) {
            log('CDP Control: Lock acquired. Resuming control.');
            isLockedOut = false;
            updateStatusBar();
        }

        await syncSessions();
    }, 5000);
}

async function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    if (statsCollectionTimer) {
        clearInterval(statsCollectionTimer);
        statsCollectionTimer = null;
    }
    if (cdpHandler) await cdpHandler.stop();
    log('auto-all-Antigravity: Polling stopped');
}

function getWeekStart() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek;
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.getTime();
}

async function loadROIStats(context) {
    const defaultStats = {
        weekStart: getWeekStart(),
        clicksThisWeek: 0,
        blockedThisWeek: 0,
        sessionsThisWeek: 0
    };

    let stats = context.globalState.get(ROI_STATS_KEY, defaultStats);

    const currentWeekStart = getWeekStart();
    if (stats.weekStart !== currentWeekStart) {
        log(`ROI Stats: New week detected. Showing summary and resetting.`);

        if (stats.clicksThisWeek > 0) {
            await showWeeklySummaryNotification(context, stats);
        }

        stats = { ...defaultStats, weekStart: currentWeekStart };
        await context.globalState.update(ROI_STATS_KEY, stats);
    }

    return stats;
}

async function showWeeklySummaryNotification(context, lastWeekStats) {
    const timeSavedSeconds = lastWeekStats.clicksThisWeek * SECONDS_PER_CLICK;
    const timeSavedMinutes = Math.round(timeSavedSeconds / 60);

    let timeStr;
    if (timeSavedMinutes >= 60) {
        timeStr = `${(timeSavedMinutes / 60).toFixed(1)} hours`;
    } else {
        timeStr = `${timeSavedMinutes} minutes`;
    }

    const message = `📊 Last week, auto-all-Antigravity saved you ${timeStr} by auto-clicking ${lastWeekStats.clicksThisWeek} buttons!`;

    let detail = '';
    if (lastWeekStats.sessionsThisWeek > 0) {
        detail += `Recovered ${lastWeekStats.sessionsThisWeek} stuck sessions. `;
    }
    if (lastWeekStats.blockedThisWeek > 0) {
        detail += `Blocked ${lastWeekStats.blockedThisWeek} dangerous commands.`;
    }

    const choice = await vscode.window.showInformationMessage(
        message,
        { detail: detail.trim() || undefined },
        'View Details'
    );

    if (choice === 'View Details') {
        const panel = getSettingsPanel();
        if (panel) {
            panel.createOrShow(context.extensionUri, context);
        }
    }
}

async function showSessionSummaryNotification(context, summary) {
    log(`[Notification] showSessionSummaryNotification called with: ${JSON.stringify(summary)}`);
    if (!summary || summary.clicks === 0) {
        log(`[Notification] Session summary skipped: no clicks`);
        return;
    }
    log(`[Notification] Showing session summary for ${summary.clicks} clicks`);

    const lines = [
        `✅ This session:`,
        `• ${summary.clicks} actions auto-alled`,
        `• ${summary.terminalCommands} terminal commands`,
        `• ${summary.fileEdits} file edits`,
        `• ${summary.blocked} interruptions blocked`
    ];

    if (summary.estimatedTimeSaved) {
        lines.push(`\n⏱ Estimated time saved: ~${summary.estimatedTimeSaved} minutes`);
    }

    const message = lines.join('\n');

    vscode.window.showInformationMessage(
        `🤖 auto-all-Antigravity: ${summary.clicks} actions handled this session`,
        { detail: message },
        'View Stats'
    ).then(choice => {
        if (choice === 'View Stats') {
            const panel = getSettingsPanel();
            if (panel) panel.createOrShow(context.extensionUri, context);
        }
    });
}

async function showAwayActionsNotification(context, actionsCount) {
    log(`[Notification] showAwayActionsNotification called with: ${actionsCount}`);
    if (!actionsCount || actionsCount === 0) {
        log(`[Notification] Away actions skipped: count is 0 or undefined`);
        return;
    }
    log(`[Notification] Showing away actions notification for ${actionsCount} actions`);

    const message = `🚀 auto-all-Antigravity handled ${actionsCount} action${actionsCount > 1 ? 's' : ''} while you were away.`;
    const detail = `Agents stayed autonomous while you focused elsewhere.`;

    vscode.window.showInformationMessage(
        message,
        { detail },
        'View Dashboard'
    ).then(choice => {
        if (choice === 'View Dashboard') {
            const panel = getSettingsPanel();
            if (panel) panel.createOrShow(context.extensionUri, context);
        }
    });
}

async function showBackgroundModeUpsell(context) {
    if (isPro) return;

    const UPSELL_COOLDOWN_KEY = 'auto-all-bg-upsell-last';
    const UPSELL_COOLDOWN_MS = 1000 * 60 * 30;

    const lastUpsell = context.globalState.get(UPSELL_COOLDOWN_KEY, 0);
    const now = Date.now();

    if (now - lastUpsell < UPSELL_COOLDOWN_MS) return;

    await context.globalState.update(UPSELL_COOLDOWN_KEY, now);

    const choice = await vscode.window.showInformationMessage(
        `💡 auto-all-Antigravity could've handled this tab switch automatically.`,
        { detail: 'Enable Background Mode to keep all your agents moving in parallel—no manual tab switching needed.' },
        'Enable Background Mode',
        'Not Now'
    );

    if (choice === 'Enable Background Mode') {
        const panel = getSettingsPanel();
        if (panel) panel.createOrShow(context.extensionUri, context);
    }
}

let lastAwayCheck = Date.now();
async function checkForAwayActions(context) {
    log(`[Away] checkForAwayActions called. cdpHandler=${!!cdpHandler}, isEnabled=${isEnabled}`);
    if (!cdpHandler || !isEnabled) {
        log(`[Away] Skipping check: cdpHandler=${!!cdpHandler}, isEnabled=${isEnabled}`);
        return;
    }

    try {
        log(`[Away] Calling cdpHandler.getAwayActions()...`);
        const awayActions = await cdpHandler.getAwayActions();
        log(`[Away] Got awayActions: ${awayActions}`);
        if (awayActions > 0) {
            log(`[Away] Detected ${awayActions} actions while user was away. Showing notification...`);
            await showAwayActionsNotification(context, awayActions);
        } else {
            log(`[Away] No away actions to report`);
        }
    } catch (e) {
        log(`[Away] Error checking away actions: ${e.message}`);
    }
}

async function collectAndSaveStats(context) {
    if (!cdpHandler) return;

    try {

        const browserStats = await cdpHandler.resetStats();

        if (browserStats.clicks > 0 || browserStats.blocked > 0) {
            const currentStats = await loadROIStats(context);
            currentStats.clicksThisWeek += browserStats.clicks;
            currentStats.blockedThisWeek += browserStats.blocked;

            await context.globalState.update(ROI_STATS_KEY, currentStats);
            log(`ROI Stats collected: +${browserStats.clicks} clicks, +${browserStats.blocked} blocked (Total: ${currentStats.clicksThisWeek} clicks, ${currentStats.blockedThisWeek} blocked)`);
        }
    } catch (e) {

    }
}

async function incrementSessionCount(context) {
    const stats = await loadROIStats(context);
    stats.sessionsThisWeek++;
    await context.globalState.update(ROI_STATS_KEY, stats);
    log(`ROI Stats: Session count incremented to ${stats.sessionsThisWeek}`);
}

function startStatsCollection(context) {
    if (statsCollectionTimer) clearInterval(statsCollectionTimer);

    statsCollectionTimer = setInterval(() => {
        if (isEnabled) {
            collectAndSaveStats(context);
            checkForAwayActions(context);
        }
    }, 30000);

    log('ROI Stats: Collection started (every 30s)');
}

function updateStatusBar() {
    if (!statusBarItem) return;

    // Create rich markdown tooltip
    const createTooltip = (state, action) => {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.appendMarkdown(`**auto-all-Antigravity:** ${state}\n\n`);
        md.appendMarkdown(`→ ${action}\n\n`);
        md.appendMarkdown(`[⚙️ Open Settings](command:auto-all.openSettings)`);
        return md;
    };

    if (!isEnabled) {
        statusBarItem.text = '$(zap) OFF';
        statusBarItem.tooltip = createTooltip('OFF', 'Click to enable (Single Tab)');
    } else if (!backgroundModeEnabled) {
        statusBarItem.text = '⚡ ON';
        statusBarItem.tooltip = createTooltip('ON (Single Tab)', 'Click for Multi-Tab mode');
    } else {
        statusBarItem.text = '⚡ Multi';
        statusBarItem.tooltip = createTooltip('ON (Multi-Tab)', 'Click to disable');
    }
}

async function checkInstanceLock() {
    if (isPro) return true;
    if (!globalContext) return true;

    const lockId = globalContext.globalState.get(LOCK_KEY);
    const lastHeartbeat = globalContext.globalState.get(HEARTBEAT_KEY, 0);
    const now = Date.now();

    if (!lockId || (now - lastHeartbeat > 10000)) {
        await globalContext.globalState.update(LOCK_KEY, INSTANCE_ID);
        await globalContext.globalState.update(HEARTBEAT_KEY, now);
        return true;
    }

    if (lockId === INSTANCE_ID) {
        await globalContext.globalState.update(HEARTBEAT_KEY, now);
        return true;
    }

    return false;
}

async function showVersionNotification(context) {
    const hasShown = context.globalState.get(VERSION_7_0_KEY, false);
    if (hasShown) return;

    const title = "🚀 Welcome to AUTO ALL AntiGravity!";
    const body = `All Pro Features Unlocked. Free Forever.

✅ Multi-Tab Mode — Run multiple conversations in parallel, auto-alls in all tabs.

⚡ Instant Polling — Fastest possible response time for auto-alling.

🛡️ Dangerous Command Blocking — Built-in protection with customizable blocklist.

📊 Session Insights — Track auto-alls, time saved, and blocked commands.

☕ Support development: ko-fi.com/ai_dev_2024`;
    const btnDashboard = "View Dashboard";
    const btnGotIt = "Let's Go!";

    await context.globalState.update(VERSION_7_0_KEY, true);

    const selection = await vscode.window.showInformationMessage(
        `${title}\n\n${body}`,
        { modal: true },
        btnGotIt,
        btnDashboard
    );

    if (selection === btnDashboard) {
        const panel = getSettingsPanel();
        if (panel) panel.createOrShow(context.extensionUri, context);
    }
}

function deactivate() {
    stopPolling();
    if (cdpHandler) {
        cdpHandler.stop();
    }
}

module.exports = { activate, deactivate };
