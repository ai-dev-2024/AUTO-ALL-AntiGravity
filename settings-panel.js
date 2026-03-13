const vscode = require('vscode');

class SettingsPanel {
    static currentPanel = undefined;
    static viewType = 'autoAllSettings';

    static createOrShow(extensionUri, context, mode = 'settings') {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (SettingsPanel.currentPanel) {

            SettingsPanel.currentPanel.panel.reveal(column);
            SettingsPanel.currentPanel.updateMode(mode);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            SettingsPanel.viewType,
            mode === 'prompt' ? 'auto-all-Antigravity' : 'auto-all-Antigravity Settings',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
                retainContextWhenHidden: true
            }
        );

        SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri, context, mode);
    }

    static showUpgradePrompt(context) {
        SettingsPanel.createOrShow(context.extensionUri, context, 'prompt');
    }

    constructor(panel, extensionUri, context, mode) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.context = context;
        this.mode = mode;
        this.disposables = [];

        this.update();

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'setFrequency':
                        if (this.isPro()) {
                            await this.context.globalState.update('auto-all-frequency', message.value);
                            vscode.commands.executeCommand('auto-all.updateFrequency', message.value);
                        }
                        break;
                    case 'getStats':
                        this.sendStats();
                        break;
                    case 'getROIStats':
                        this.sendROIStats();
                        break;
                    case 'updateBannedCommands':
                        if (this.isPro()) {
                            await this.context.globalState.update('auto-all-banned-commands', message.commands);
                            vscode.commands.executeCommand('auto-all.updateBannedCommands', message.commands);
                        }
                        break;
                    case 'getBannedCommands':
                        this.sendBannedCommands();
                        break;
                    case 'getAcceptPatterns':
                        this.sendAcceptPatterns();
                        break;
                    case 'updateAcceptPatterns':
                        await this.context.globalState.update('auto-all-accept-patterns', message.patterns);
                        vscode.commands.executeCommand('auto-all.updateAcceptPatterns', message.patterns);
                        break;
                    case 'upgrade':

                        this.openUpgrade(message.promoCode);
                        this.startPolling(this.getUserId());
                        break;
                    case 'checkPro':
                        this.handleCheckPro();
                        break;
                    case 'dismissPrompt':
                        await this.handleDismiss();
                        break;
                }
            },
            null,
            this.disposables
        );
    }

    async handleDismiss() {

        const now = Date.now();
        await this.context.globalState.update('auto-all-lastDismissedAt', now);
        this.dispose();
    }

    async handleCheckPro() {

        vscode.window.showInformationMessage('All Pro features are already unlocked!');
    }

    isPro() {
        return true;
    }

    getUserId() {
        let userId = this.context.globalState.get('auto-all-userId');
        if (!userId) {

            userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
            this.context.globalState.update('auto-all-userId', userId);
        }
        return userId;
    }

    openUpgrade(promoCode) {

    }

    updateMode(mode) {
        this.mode = mode;
        this.panel.title = mode === 'prompt' ? 'auto-all-Antigravity Agent' : 'auto-all-Antigravity Settings';
        this.update();
    }

    sendStats() {
        const stats = this.context.globalState.get('auto-all-stats', {
            clicks: 0,
            sessions: 0,
            lastSession: null
        });
        const isPro = this.isPro();

        const frequency = isPro ? this.context.globalState.get('auto-all-frequency', 1000) : 300;

        this.panel.webview.postMessage({
            command: 'updateStats',
            stats,
            frequency,
            isPro
        });
    }

    async sendROIStats() {
        try {
            const roiStats = await vscode.commands.executeCommand('auto-all.getROIStats');
            this.panel.webview.postMessage({
                command: 'updateROIStats',
                roiStats
            });
        } catch (e) {

        }
    }

    sendBannedCommands() {
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
        const bannedCommands = this.context.globalState.get('auto-all-banned-commands', defaultBannedCommands);
        this.panel.webview.postMessage({
            command: 'updateBannedCommands',
            bannedCommands
        });
    }

    sendAcceptPatterns() {
        const defaultPatterns = [
            'accept', 'accept all', 'run', 'run command', 'retry', 'apply',
            'execute', 'confirm', 'allow once', 'allow', 'proceed', 'continue',
            'yes', 'ok', 'save', 'approve', 'enable', 'install', 'update', 'overwrite'
        ];
        const patterns = this.context.globalState.get('auto-all-accept-patterns', defaultPatterns);
        this.panel.webview.postMessage({
            command: 'updateAcceptPatterns',
            patterns,
            defaultPatterns
        });
    }

    update() {
        this.panel.webview.html = this.getHtmlContent();
        setTimeout(() => {
            this.sendStats();
            this.sendROIStats();
        }, 100);
    }

    getHtmlContent() {
        const isPro = this.isPro();
        const isPrompt = this.mode === 'prompt';

        const css = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            :root {
                --bg: #09090b;
                --bg-card: #18181b;
                --bg-card-hover: #27272a;
                --border: #27272a;
                --border-hover: #3f3f46;
                --accent: #22c55e;
                --accent-dim: rgba(34, 197, 94, 0.15);
                --accent-glow: rgba(34, 197, 94, 0.3);
                --fg: #fafafa;
                --fg-dim: #a1a1aa;
                --fg-muted: #71717a;
                --font: 'Inter', system-ui, -apple-system, sans-serif;
            }

            * { box-sizing: border-box; margin: 0; padding: 0; }

            body {
                font-family: var(--font);
                background: var(--bg);
                color: var(--fg);
                margin: 0;
                padding: 32px 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
            }
            
            @keyframes pulse-glow {
                0%, 100% { box-shadow: 0 0 15px var(--accent-glow); }
                50% { box-shadow: 0 0 25px var(--accent-glow), 0 0 40px var(--accent-dim); }
            }

            .container {
                max-width: ${isPrompt ? '500px' : '720px'};
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 24px;
                position: relative;
                z-index: 1;
            }

            .header {
                text-align: center;
                margin-bottom: 16px;
                padding: 24px;
                background: var(--bg-card);
                border-radius: 16px;
                border: 1px solid var(--border);
            }
            .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin: 0;
                letter-spacing: -0.5px;
                color: var(--fg);
            }
            .subtitle {
                color: var(--fg-dim);
                font-size: 14px;
                margin-top: 8px;
                font-weight: 400;
            }

            .pro-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: var(--accent);
                color: #000;
                font-size: 11px;
                font-weight: 600;
                padding: 6px 14px;
                border-radius: 6px;
                margin-top: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .section {
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 24px;
                transition: border-color 0.2s;
            }
            .section:hover {
                border-color: var(--border-hover);
            }
            .section-label {
                color: var(--fg-dim);
                font-size: 12px;
                font-weight: 600;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .section-label span:last-child {
                color: var(--fg-muted);
                font-weight: 400;
                font-size: 11px;
            }

            .impact-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }
            .impact-card {
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 10px;
                padding: 20px 16px;
                text-align: center;
                transition: border-color 0.2s, background 0.2s;
            }
            .impact-card:hover {
                border-color: var(--border-hover);
                background: var(--bg-card-hover);
            }
            .impact-card.green { border-left: 3px solid var(--accent); }
            .impact-card.purple { border-left: 3px solid #a855f7; }
            .impact-card.pink { border-bottom: 3px solid var(--pink); }
            .impact-card.orange { border-bottom: 3px solid var(--orange); }
            
            .stat-val {
                font-size: 36px;
                font-weight: 700;
                line-height: 1;
                margin-bottom: 8px;
                font-variant-numeric: tabular-nums;
                color: var(--fg);
            }
            .stat-val.green { color: var(--accent); }
            .stat-val.purple { color: #a855f7; }
            .stat-val.pink { color: #ec4899; }
            .stat-val.orange { color: #f97316; }
            
            .stat-label {
                font-size: 11px;
                color: var(--fg-muted);
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            input[type="range"] {
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: var(--border);
                -webkit-appearance: none;
                appearance: none;
            }
            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: var(--accent);
                cursor: pointer;
                border: 2px solid var(--bg);
                transition: transform 0.2s ease;
            }
            input[type="range"]::-webkit-slider-thumb:hover {
                transform: scale(1.1);
            }
            
            textarea {
                width: 100%;
                min-height: 120px;
                background: var(--bg);
                border: 1px solid var(--border);
                border-radius: 8px;
                color: var(--fg);
                font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
                font-size: 13px;
                padding: 14px;
                resize: vertical;
                outline: none;
                transition: border-color 0.2s;
            }
            textarea:focus { 
                border-color: var(--accent);
            }

            .btn-primary {
                background: var(--accent);
                color: #000;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: opacity 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                text-decoration: none;
            }
            .btn-primary:hover {
                opacity: 0.9;
            }
            
            .btn-outline {
                background: transparent;
                border: 1px solid var(--border);
                color: var(--fg);
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: border-color 0.2s, background 0.2s;
            }
            .btn-outline:hover {
                background: var(--bg-card-hover);
                border-color: var(--border-hover);
            }

            .link-secondary {
                color: var(--fg-dim);
                cursor: pointer;
                text-decoration: none;
                font-size: 13px;
                display: block;
                text-align: center;
                margin-top: 16px;
                font-weight: 500;
                transition: color 0.2s;
            }
            .link-secondary:hover { 
                color: var(--fg);
            }

            .prompt-card {
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 16px;
                padding: 40px;
                text-align: center;
            }
            .prompt-title { 
                font-size: 24px; 
                font-weight: 700; 
                margin-bottom: 12px; 
                color: var(--accent);
            }
            .prompt-text { 
                font-size: 14px; 
                color: var(--fg-dim); 
                line-height: 1.7; 
                margin-bottom: 28px; 
            }

            .footer {
                background: var(--bg-card);
                border-radius: 12px;
                border: 1px solid var(--border);
                padding: 20px;
                text-align: center;
            }
            .footer a {
                transition: color 0.2s;
                text-decoration: none;
                font-weight: 500;
                color: var(--fg-dim);
            }
            .footer a:hover {
                color: var(--fg);
            }
            .footer-brand {
                color: var(--fg-muted);
                font-size: 11px;
                letter-spacing: 0.5px;
                margin-top: 10px;
            }
            .footer-link {
                color: var(--fg-dim);
                text-decoration: none;
                font-size: 13px;
            }
            .footer-link:hover {
                color: var(--accent);
            }
            
            /* Checkbox toggle styling */
            .pattern-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 12px;
                background: var(--bg);
                border: 1px solid var(--border);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                user-select: none;
            }
            .pattern-item:hover {
                border-color: var(--accent);
                background: var(--bg-card-hover);
            }
            .pattern-item.active {
                border-color: var(--accent);
                background: var(--accent-dim);
            }
            .pattern-checkbox {
                width: 18px;
                height: 18px;
                border: 2px solid var(--border);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: all 0.2s;
            }
            .pattern-item.active .pattern-checkbox {
                background: var(--accent);
                border-color: var(--accent);
            }
            .pattern-checkbox::after {
                content: '✓';
                color: #000;
                font-size: 12px;
                font-weight: bold;
                opacity: 0;
                transition: opacity 0.2s;
            }
            .pattern-item.active .pattern-checkbox::after {
                opacity: 1;
            }
            .pattern-label {
                font-size: 12px;
                color: var(--fg-dim);
                text-transform: capitalize;
            }
            .pattern-item.active .pattern-label {
                color: var(--fg);
                font-weight: 500;
            }
        `;

        if (isPrompt) {

            return `<!DOCTYPE html>
            <html>
            <head><style>${css}</style></head>
            <body>
                <div class="container">
                    <div class="prompt-card">
                        <div style="font-size: 32px; margin-bottom: 20px;">✅</div>
                        <div class="prompt-title">All Features Unlocked!</div>
                        <div class="prompt-text">
                            All Pro features are enabled for free.<br/><br/>
                            <strong style="color: var(--green); opacity: 1;">Enjoy unlimited auto-all functionality!</strong>
                        </div>
                        <a class="btn-primary" onclick="dismiss()" style="cursor: pointer;">
                            Continue
                        </a>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    function dismiss() {
                        vscode.postMessage({ command: 'dismissPrompt' });
                    }
                </script>
            </body>
            </html>`;
        }

        return `<!DOCTYPE html>
        <html>
        <head><style>${css}</style></head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>auto-all-Antigravity</h1>
                    <div class="subtitle">Multi-agent automation for AntiGravity</div>
                    <div class="pro-badge">✨ All Features Unlocked</div>
                </div>

                <!-- All Pro features enabled -->

                <div class="section">
                    <div class="section-label">
                        <span>📊 IMPACT DASHBOARD</span>
                        <span>Resets Sunday</span>
                    </div>
                    <div class="impact-grid">
                        <div class="impact-card green">
                            <div class="stat-val green" id="roiClickCount">0</div>
                            <div class="stat-label">Clicks Saved</div>
                        </div>
                        <div class="impact-card purple">
                            <div class="stat-val purple" id="roiTimeSaved">0m</div>
                            <div class="stat-label">Time Saved</div>
                        </div>
                        <div class="impact-card pink">
                            <div class="stat-val pink" id="roiSessionCount">0</div>
                            <div class="stat-label">Sessions</div>
                        </div>
                        <div class="impact-card orange">
                            <div class="stat-val orange" id="roiBlockedCount">0</div>
                            <div class="stat-label">Blocked</div>
                        </div>
                    </div>
                </div>

                <div class="section" id="performanceSection">
                    <div class="section-label">
                        <span>⚡ PERFORMANCE MODE</span>
                        <span class="val-display" id="freqVal" style="color: var(--accent); font-weight: 700;">...</span>
                    </div>
                    <div>
                        <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 12px; font-weight: 600; color: var(--fg-dim);">⚡ Instant</span>
                            <div style="flex: 1;"><input type="range" id="freqSlider" min="200" max="3000" step="100" value="1000"></div>
                            <span style="font-size: 12px; font-weight: 600; color: var(--fg-dim);">🔋 Battery</span>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-label">🛡️ SAFETY RULES</div>
                    <div style="font-size: 13px; color: var(--fg-dim); margin-bottom: 18px; line-height: 1.6;">
                        Patterns that will <strong>NEVER</strong> be auto-alled.
                    </div>
                    <textarea id="bannedCommandsInput" 
                        placeholder="rm -rf /&#10;format c:&#10;del /f /s /q"></textarea>
                    
                    <div style="display: flex; gap: 14px; margin-top: 22px;">
                        <button id="saveBannedBtn" class="btn-primary" style="flex: 2;">
                            💾 Update Rules
                        </button>
                        <button id="resetBannedBtn" class="btn-outline" style="flex: 1;">
                            ↺ Reset
                        </button>
                    </div>
                    <div id="bannedStatus" style="font-size: 12px; margin-top: 14px; text-align: center; height: 18px; font-weight: 600;"></div>
                </div>

                <div class="section">
                    <div class="section-label">
                        <span>🎯 AUTO-ACCEPT BUTTONS</span>
                        <span id="patternsStatus" style="color: var(--accent);"></span>
                    </div>
                    <div style="font-size: 13px; color: var(--fg-dim); margin-bottom: 18px; line-height: 1.6;">
                        Select which button types to <strong>automatically click</strong>. Changes are saved instantly.
                    </div>
                    <div id="patternsGrid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;"></div>
                    <div style="display: flex; gap: 14px; margin-top: 22px;">
                        <button id="selectAllPatternsBtn" class="btn-outline" style="flex: 1;">
                            ✓ Select All
                        </button>
                        <button id="resetPatternsBtn" class="btn-outline" style="flex: 1;">
                            ↺ Reset to Defaults
                        </button>
                    </div>
                </div>

                <div class="footer">
                    <div style="display: flex; justify-content: center; gap: 32px; margin-bottom: 14px;">
                        <a href="https://ko-fi.com/ai_dev_2024" class="footer-link">☕ Support Development</a>
                        <a href="https://github.com/ai-dev-2024/AUTO-ALL-AntiGravity" class="footer-link">GitHub</a>
                    </div>
                    <div class="footer-brand">
                        Open Source • All Features Free • Made with ❤️
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function refreshStats() {
                    vscode.postMessage({ command: 'getStats' });
                    vscode.postMessage({ command: 'getROIStats' });
                }

                const refreshInterval = setInterval(refreshStats, 5000);

                const slider = document.getElementById('freqSlider');
                const valDisplay = document.getElementById('freqVal');
                
                if (slider) {
                    slider.addEventListener('input', (e) => {
                         const s = (e.target.value/1000).toFixed(1) + 's';
                         valDisplay.innerText = s;
                         vscode.postMessage({ command: 'setFrequency', value: e.target.value });
                    });
                }

                const bannedInput = document.getElementById('bannedCommandsInput');
                const saveBannedBtn = document.getElementById('saveBannedBtn');
                const resetBannedBtn = document.getElementById('resetBannedBtn');
                const bannedStatus = document.getElementById('bannedStatus');

                const defaultBannedCommands = ["rm -rf /", "rm -rf ~", "rm -rf *", "format c:", "del /f /s /q", "rmdir /s /q", ":(){:|:&};:", "dd if=", "mkfs.", "> /dev/sda", "chmod -R 777 /"];

                if (saveBannedBtn) {
                    saveBannedBtn.addEventListener('click', () => {
                        const lines = bannedInput.value.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
                        vscode.postMessage({ command: 'updateBannedCommands', commands: lines });
                        bannedStatus.innerText = '✓ Safety Rules Updated';
                        bannedStatus.style.color = 'var(--green)';
                        setTimeout(() => { bannedStatus.innerText = ''; }, 3000);
                    });
                }

                if (resetBannedBtn) {
                    resetBannedBtn.addEventListener('click', () => {
                        bannedInput.value = defaultBannedCommands.join('\\n');
                        vscode.postMessage({ command: 'updateBannedCommands', commands: defaultBannedCommands });
                        bannedStatus.innerText = '✓ Defaults Restored';
                        bannedStatus.style.color = 'var(--accent)';
                        setTimeout(() => { bannedStatus.innerText = ''; }, 3000);
                    });
                }

                function animateCountUp(element, target, duration = 1200, suffix = '') {
                    const currentVal = parseInt(element.innerText.replace(/[^0-9]/g, '')) || 0;
                    if (currentVal === target && !suffix) return;
                    
                    const startTime = performance.now();
                    function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
                    
                    function update(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const current = Math.round(currentVal + (target - currentVal) * easeOutExpo(progress));
                        element.innerText = current + suffix;
                        if (progress < 1) requestAnimationFrame(update);
                    }
                    requestAnimationFrame(update);
                }
                
                window.addEventListener('message', e => {
                    const msg = e.data;
                    if (msg.command === 'updateStats') {
                        if (slider && !${!isPro}) {
                            slider.value = msg.frequency;
                            valDisplay.innerText = (msg.frequency/1000).toFixed(1) + 's';
                        }
                    }
                    if (msg.command === 'updateROIStats') {
                        const roi = msg.roiStats;
                        if (roi) {
                            animateCountUp(document.getElementById('roiClickCount'), roi.clicksThisWeek || 0);
                            animateCountUp(document.getElementById('roiSessionCount'), roi.sessionsThisWeek || 0);
                            animateCountUp(document.getElementById('roiBlockedCount'), roi.blockedThisWeek || 0);
                            document.getElementById('roiTimeSaved').innerText = roi.timeSavedFormatted || '0m';
                        }
                    }
                    if (msg.command === 'updateBannedCommands') {
                        if (bannedInput && msg.bannedCommands) {
                            bannedInput.value = msg.bannedCommands.join('\\n');
                        }
                    }
                    if (msg.command === 'updateAcceptPatterns') {
                        if (msg.patterns && msg.defaultPatterns) {
                            renderPatterns(msg.patterns, msg.defaultPatterns);
                        }
                    }
                });

                refreshStats();
                vscode.postMessage({ command: 'getBannedCommands' });
                vscode.postMessage({ command: 'getAcceptPatterns' });

                // Accept patterns management
                const patternsGrid = document.getElementById('patternsGrid');
                const patternsStatus = document.getElementById('patternsStatus');
                const selectAllBtn = document.getElementById('selectAllPatternsBtn');
                const resetPatternsBtn = document.getElementById('resetPatternsBtn');
                let currentPatterns = [];
                let allPatterns = [];

                function renderPatterns(patterns, defaults) {
                    currentPatterns = patterns;
                    allPatterns = defaults;
                    patternsGrid.innerHTML = '';
                    
                    defaults.forEach(pattern => {
                        const isActive = patterns.includes(pattern);
                        const item = document.createElement('div');
                        item.className = 'pattern-item' + (isActive ? ' active' : '');
                        item.innerHTML = '<div class="pattern-checkbox"></div><span class="pattern-label">' + pattern + '</span>';
                        item.addEventListener('click', () => togglePattern(pattern));
                        patternsGrid.appendChild(item);
                    });
                }

                function togglePattern(pattern) {
                    const idx = currentPatterns.indexOf(pattern);
                    if (idx >= 0) {
                        currentPatterns.splice(idx, 1);
                    } else {
                        currentPatterns.push(pattern);
                    }
                    savePatterns();
                }

                function savePatterns() {
                    vscode.postMessage({ command: 'updateAcceptPatterns', patterns: currentPatterns });
                    renderPatterns(currentPatterns, allPatterns);
                    patternsStatus.innerText = '✓ Saved';
                    setTimeout(() => { patternsStatus.innerText = ''; }, 2000);
                }

                if (selectAllBtn) {
                    selectAllBtn.addEventListener('click', () => {
                        currentPatterns = [...allPatterns];
                        savePatterns();
                    });
                }

                if (resetPatternsBtn) {
                    resetPatternsBtn.addEventListener('click', () => {
                        currentPatterns = [...allPatterns];
                        savePatterns();
                        patternsStatus.innerText = '✓ Defaults Restored';
                    });
                }
            </script>
        </body>
        </html>`;
    }

    dispose() {
        SettingsPanel.currentPanel = undefined;
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.panel.dispose();
        while (this.disposables.length) {
            const d = this.disposables.pop();
            if (d) d.dispose();
        }
    }

    async checkProStatus() {
        return true;
    }

    startPolling() {

    }
}

module.exports = { SettingsPanel };
