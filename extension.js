const vscode = require('vscode');
const { AntigravityHandler } = require('./antigravity');
const { CursorCDPHandler } = require('./cursor-cdp');
const { CursorLauncher } = require('./cursor-launcher');
const { SettingsPanel } = require('./settings-panel');

// ============================================================================
// STATE
// ============================================================================

const GLOBAL_STATE_KEY = 'auto-accept-enabled-global';
const FREQUENCY_KEY = 'auto-accept-frequency';
const STATS_KEY = 'auto-accept-stats';
const PRO_KEY = 'auto-accept-isPro';

let isEnabled = false;
let pollInterval = 1000;
let statusBarItem;
let settingsStatusBarItem; // NEW
let pollTimer;
let globalStateInterval;
let extensionContext;

let currentIDE = 'vscode';
let antigravityHandler = null;
let cursorCDPHandler = null;
let cursorLauncher = null;

// ============================================================================
// IDE DETECTION
// ============================================================================

function detectIDE() {
    const appName = (vscode.env.appName || '').toLowerCase();
    if (appName.includes('cursor')) return 'cursor';
    return 'vscode';
}

// ============================================================================
// PRO GATING
// ============================================================================

function isPro() {
    return extensionContext.globalState.get(PRO_KEY, false);
}

/**
 * Determines if the extension should execute this polling cycle
 * Free users: Only when window is focused
 * Pro users: Always (background operation enabled)
 */
function shouldExecute() {
    if (isPro()) {
        return true; // Pro: always execute
    }

    // Free: only when focused
    return vscode.window.state.focused;
}

// ============================================================================
// LICENSE CHECK
// ============================================================================

const LICENSE_API = 'https://auto-accept-backend.onrender.com/api';

async function checkLicense() {
    const userId = extensionContext.globalState.get('auto-accept-userId');
    if (!userId) return;

    try {
        const response = await fetch(`${LICENSE_API}/check-license?userId=${userId}`);
        const data = await response.json();
        if (data.isPro) {
            await extensionContext.globalState.update(PRO_KEY, true);
        }
    } catch (e) {
        // Silent fail - offline check
    }
}

// ============================================================================
// ANALYTICS
// ============================================================================

function incrementClicks() {
    const stats = extensionContext.globalState.get(STATS_KEY, { clicks: 0, sessions: 0 });
    stats.clicks++;
    extensionContext.globalState.update(STATS_KEY, stats);
}

function incrementSessions() {
    const stats = extensionContext.globalState.get(STATS_KEY, { clicks: 0, sessions: 0 });
    stats.sessions++;
    stats.lastSession = new Date().toISOString();
    extensionContext.globalState.update(STATS_KEY, stats);
}

// ============================================================================
// ACTIVATION
// ============================================================================

async function activate(context) {
    console.log('Auto Accept Agent v2.9.4: Activating...');
    extensionContext = context;

    // Check license with backend
    checkLicense();

    // Load saved frequency
    pollInterval = context.globalState.get(FREQUENCY_KEY, 1000);

    // Detect IDE
    currentIDE = detectIDE();
    console.log(`Auto Accept Agent: IDE = ${currentIDE}, Pro = ${isPro()}`);

    // Initialize handlers based on IDE
    if (currentIDE === 'cursor') {
        cursorCDPHandler = new CursorCDPHandler();
        cursorLauncher = new CursorLauncher();
    } else {
        antigravityHandler = new AntigravityHandler();
        await antigravityHandler.refreshCommands();
    }

    // Global sync
    const globalEnabled = context.globalState.get(GLOBAL_STATE_KEY, false);
    if (globalEnabled) {
        isEnabled = true;
        await startAutoAccept();
    }

    // Global state poller
    globalStateInterval = setInterval(async () => {
        const g = context.globalState.get(GLOBAL_STATE_KEY, false);
        if (g !== isEnabled) {
            isEnabled = g;
            updateStatusBar();
            if (isEnabled) await startAutoAccept();
            else await stopAutoAccept();
        }
    }, 2000);

    // Status bar - Main Toggle
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'auto-accept.toggle';
    context.subscriptions.push(statusBarItem);

    // Status bar - Settings Gear
    settingsStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    settingsStatusBarItem.text = '$(gear)';
    settingsStatusBarItem.tooltip = 'Auto Accept Settings & Pro Features';
    settingsStatusBarItem.command = 'auto-accept.showSettings';
    context.subscriptions.push(settingsStatusBarItem);

    updateStatusBar();
    statusBarItem.show();
    settingsStatusBarItem.show();

    // Update status bar when focus changes
    context.subscriptions.push(
        vscode.window.onDidChangeWindowState((e) => {
            updateStatusBar();
        })
    );

    // Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('auto-accept.toggle', handleToggle),
        vscode.commands.registerCommand('auto-accept.acceptNow', executeAccept),
        vscode.commands.registerCommand('auto-accept.showSettings', () => {
            SettingsPanel.createOrShow(context.extensionUri, context);
        }),
        vscode.commands.registerCommand('auto-accept.updateFrequency', (value) => {
            pollInterval = value;
            if (isEnabled) {
                stopPolling();
                startPolling();
            }
        })
    );

    console.log('Auto Accept Agent: Active');
}

// ============================================================================
// TOGGLE
// ============================================================================

async function handleToggle() {
    const newState = !isEnabled;

    if (newState && currentIDE === 'cursor') {
        const cdpAvailable = await cursorCDPHandler.isCDPAvailable();

        if (!cdpAvailable) {
            await cursorLauncher.showLaunchPrompt();
            return;
        }
    }

    isEnabled = newState;
    extensionContext.globalState.update(GLOBAL_STATE_KEY, isEnabled);
    updateStatusBar();

    if (isEnabled) {
        incrementSessions();
        await startAutoAccept();
    } else {
        await stopAutoAccept();
    }
}

// ============================================================================
// AUTO-ACCEPT
// ============================================================================

async function startAutoAccept() {
    if (currentIDE === 'cursor') {
        await cursorCDPHandler.start();
    }
    startPolling();
    updateStatusBar();
}

async function stopAutoAccept() {
    stopPolling();
    if (cursorCDPHandler) {
        await cursorCDPHandler.stop();
    }
    updateStatusBar();
}

function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
        if (!isEnabled) return;

        // PRO GATING: Check if we should execute
        if (!shouldExecute()) {
            return; // Free user + unfocused = skip
        }

        await executeAccept();
    }, pollInterval);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

async function executeAccept() {
    let clicked = false;

    if (currentIDE === 'cursor' && cursorCDPHandler) {
        const result = await cursorCDPHandler.executeAccept();
        if (result.executed > 0) clicked = true;
    } else if (antigravityHandler) {
        const result = await antigravityHandler.executeAccept(true);
        if (result.executed > 0) clicked = true;
    }

    if (clicked) {
        incrementClicks();
    }
}

// ============================================================================
// STATUS BAR
// ============================================================================

function updateStatusBar() {
    if (!statusBarItem) return;

    const pro = isPro();
    const focused = vscode.window.state.focused;

    let info = '';
    if (currentIDE === 'cursor' && cursorCDPHandler && isEnabled) {
        const count = cursorCDPHandler.getConnectionCount();
        info = ` (${count})`;
    }

    if (isEnabled) {
        // Show if paused due to focus (free users)
        if (!pro && !focused) {
            statusBarItem.text = `$(debug-pause) Auto Accept: PAUSED${info}`;
            statusBarItem.tooltip = 'Paused - window unfocused (Pro enables background)';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            statusBarItem.text = `$(check) Auto Accept: ON${info}`;
            statusBarItem.tooltip = pro ? 'Pro: Background enabled' : 'Click to disable';
            statusBarItem.backgroundColor = undefined;
        }
    } else {
        statusBarItem.text = '$(circle-slash) Auto Accept: OFF';
        statusBarItem.tooltip = 'Click to enable';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
}

// ============================================================================
// DEACTIVATION
// ============================================================================

async function deactivate() {
    await stopAutoAccept();
    if (globalStateInterval) clearInterval(globalStateInterval);
}

module.exports = { activate, deactivate };
