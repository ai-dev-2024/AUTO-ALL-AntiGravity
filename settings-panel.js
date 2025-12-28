const vscode = require('vscode');

// All Pro features enabled - open source version

class SettingsPanel {
    static currentPanel = undefined;
    static viewType = 'autoAcceptSettings';

    static createOrShow(extensionUri, context, mode = 'settings') {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (SettingsPanel.currentPanel) {
            // If requesting prompt mode but panel is open, reveal it and update mode
            SettingsPanel.currentPanel.panel.reveal(column);
            SettingsPanel.currentPanel.updateMode(mode);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            SettingsPanel.viewType,
            mode === 'prompt' ? 'Auto Accept ALL' : 'Auto Accept ALL Settings',
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
        this.mode = mode; // 'settings' | 'prompt'
        this.disposables = [];

        this.update();

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'setFrequency':
                        if (this.isPro()) {
                            await this.context.globalState.update('auto-accept-frequency', message.value);
                            vscode.commands.executeCommand('auto-accept.updateFrequency', message.value);
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
                            await this.context.globalState.update('auto-accept-banned-commands', message.commands);
                            vscode.commands.executeCommand('auto-accept.updateBannedCommands', message.commands);
                        }
                        break;
                    case 'getBannedCommands':
                        this.sendBannedCommands();
                        break;
                    case 'upgrade':
                        // Existing upgrade logic (maybe from Settings mode)
                        // For prompt mode, links are direct <a> tags usually, but if we need logic:
                        this.openUpgrade(message.promoCode); // Keeps existing logic for legacy/settings
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
        // Persist dismissal timestamp
        const now = Date.now();
        await this.context.globalState.update('auto-accept-lastDismissedAt', now);
        this.dispose();
    }

    async handleCheckPro() {
        // All Pro features are already enabled
        vscode.window.showInformationMessage('All Pro features are already unlocked!');
    }

    isPro() {
        return true; // All features enabled (open-source modification)
    }

    getUserId() {
        let userId = this.context.globalState.get('auto-accept-userId');
        if (!userId) {
            // Generate UUID v4 format
            userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
            this.context.globalState.update('auto-accept-userId', userId);
        }
        return userId;
    }

    openUpgrade(promoCode) {
        // Fallback legacy method or used by Settings
        // We might not need this if we use direct links, but keeping for compatibility
    }

    updateMode(mode) {
        this.mode = mode;
        this.panel.title = mode === 'prompt' ? 'Auto Accept Agent' : 'Auto Accept Settings';
        this.update();
    }

    sendStats() {
        const stats = this.context.globalState.get('auto-accept-stats', {
            clicks: 0,
            sessions: 0,
            lastSession: null
        });
        const isPro = this.isPro();
        // If not Pro, force display of 300ms
        const frequency = isPro ? this.context.globalState.get('auto-accept-frequency', 1000) : 300;

        this.panel.webview.postMessage({
            command: 'updateStats',
            stats,
            frequency,
            isPro
        });
    }

    async sendROIStats() {
        try {
            const roiStats = await vscode.commands.executeCommand('auto-accept.getROIStats');
            this.panel.webview.postMessage({
                command: 'updateROIStats',
                roiStats
            });
        } catch (e) {
            // ROI stats not available yet
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
        const bannedCommands = this.context.globalState.get('auto-accept-banned-commands', defaultBannedCommands);
        this.panel.webview.postMessage({
            command: 'updateBannedCommands',
            bannedCommands
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

        // Premium Design System - Shadcn-inspired with glassmorphism
        const css = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            
            :root {
                --bg: #09090b;
                --bg-gradient: linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%);
                --card-bg: rgba(24, 24, 27, 0.8);
                --card-glass: rgba(255, 255, 255, 0.03);
                --border: rgba(147, 51, 234, 0.15);
                --border-hover: rgba(147, 51, 234, 0.5);
                --accent: #a855f7;
                --accent-glow: rgba(168, 85, 247, 0.4);
                --accent-soft: rgba(168, 85, 247, 0.1);
                --green: #22c55e;
                --green-glow: rgba(34, 197, 94, 0.4);
                --cyan: #06b6d4;
                --fg: #fafafa;
                --fg-dim: rgba(250, 250, 250, 0.5);
                --font: 'Inter', system-ui, -apple-system, sans-serif;
            }

            * { box-sizing: border-box; }

            body {
                font-family: var(--font);
                background: var(--bg);
                background-image: var(--bg-gradient);
                color: var(--fg);
                margin: 0;
                padding: 40px 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
                position: relative;
            }
            
            /* Subtle background glow */
            body::before {
                content: '';
                position: fixed;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(ellipse at center, rgba(147, 51, 234, 0.08) 0%, transparent 50%);
                pointer-events: none;
                animation: bgPulse 8s ease-in-out infinite;
            }
            
            @keyframes bgPulse {
                0%, 100% { opacity: 0.5; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.1); }
            }

            .container {
                max-width: ${isPrompt ? '500px' : '680px'};
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 20px;
                position: relative;
                z-index: 1;
            }

            /* Header Section */
            .header {
                text-align: center;
                margin-bottom: 12px;
            }
            .header h1 {
                font-size: 28px;
                font-weight: 800;
                margin: 0;
                letter-spacing: -0.5px;
                background: linear-gradient(135deg, #ffffff 0%, #a855f7 50%, #22c55e 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .subtitle {
                color: var(--fg-dim);
                font-size: 13px;
                margin-top: 8px;
                font-weight: 500;
            }

            /* Glassmorphism Sections */
            .section {
                background: var(--card-bg);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid var(--border);
                border-radius: 16px;
                padding: 24px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }
            .section::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            }
            .section:hover {
                border-color: var(--border-hover);
                box-shadow: 0 0 40px rgba(147, 51, 234, 0.1);
                transform: translateY(-2px);
            }
            .section-label {
                color: var(--accent);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .section-label span:last-child {
                color: var(--fg-dim);
                font-weight: 500;
            }

            /* Impact Grid - Enhanced */
            .impact-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }
            .impact-card {
                background: linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 20px 16px;
                text-align: center;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }
            .impact-card::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 40%;
                height: 2px;
                border-radius: 2px;
            }
            .impact-card:first-child::after { background: var(--green); box-shadow: 0 0 20px var(--green-glow); }
            .impact-card:nth-child(2)::after { background: var(--accent); box-shadow: 0 0 20px var(--accent-glow); }
            .impact-card:nth-child(3)::after { background: var(--cyan); }
            .impact-card:nth-child(4)::after { background: rgba(255,255,255,0.3); }
            .impact-card:hover {
                transform: translateY(-4px) scale(1.02);
                border-color: rgba(255, 255, 255, 0.1);
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            .stat-val {
                font-size: 32px;
                font-weight: 800;
                line-height: 1;
                margin-bottom: 8px;
                font-variant-numeric: tabular-nums;
            }
            .stat-label {
                font-size: 10px;
                color: var(--fg-dim);
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            /* Inputs and Buttons - Enhanced */
            input[type="range"] {
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: rgba(255,255,255,0.1);
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
                box-shadow: 0 0 15px var(--accent-glow);
                transition: all 0.2s ease;
            }
            input[type="range"]::-webkit-slider-thumb:hover {
                transform: scale(1.2);
                box-shadow: 0 0 25px var(--accent-glow);
            }
            
            textarea {
                width: 100%;
                min-height: 120px;
                background: rgba(0,0,0,0.4);
                border: 1px solid var(--border);
                border-radius: 12px;
                color: var(--fg);
                font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
                font-size: 12px;
                padding: 16px;
                resize: vertical;
                outline: none;
                transition: all 0.3s ease;
            }
            textarea:focus { 
                border-color: var(--accent); 
                box-shadow: 0 0 20px rgba(147, 51, 234, 0.15);
            }

            .btn-primary {
                background: linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%);
                color: white;
                border: none;
                padding: 14px 24px;
                border-radius: 10px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                text-decoration: none;
                box-shadow: 0 4px 20px rgba(147, 51, 234, 0.3);
            }
            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 30px rgba(147, 51, 234, 0.5);
            }
            .btn-outline {
                background: transparent;
                border: 1px solid var(--border);
                color: var(--fg);
                padding: 12px 20px;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .btn-outline:hover {
                background: var(--accent-soft);
                border-color: var(--accent);
                box-shadow: 0 0 20px rgba(147, 51, 234, 0.15);
            }

            .link-secondary {
                color: var(--accent);
                cursor: pointer;
                text-decoration: none;
                font-size: 13px;
                display: block;
                text-align: center;
                margin-top: 16px;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            .link-secondary:hover { 
                color: #c084fc;
            }

            .prompt-card {
                background: var(--card-bg);
                backdrop-filter: blur(20px);
                border: 1px solid var(--border);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            }
            .prompt-title { 
                font-size: 22px; 
                font-weight: 800; 
                margin-bottom: 12px; 
                letter-spacing: -0.5px;
                background: linear-gradient(135deg, #ffffff 0%, var(--green) 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .prompt-text { 
                font-size: 14px; 
                color: var(--fg-dim); 
                line-height: 1.7; 
                margin-bottom: 28px; 
            }
            
            /* Footer links */
            .footer-links a {
                transition: all 0.2s ease;
            }
            .footer-links a:hover {
                opacity: 0.8;
            }
        `;

        if (isPrompt) {
            // Prompt mode now just shows all features are free
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
                            <strong style="color: var(--green); opacity: 1;">Enjoy unlimited auto-accept functionality!</strong>
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

        // Settings Mode
        return `<!DOCTYPE html>
        <html>
        <head><style>${css}</style></head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Auto Accept ALL</h1>
                    <div class="subtitle">Multi-agent automation for AntiGravity</div>
                </div>

                <!-- All Pro features enabled -->


                <div class="section">
                    <div class="section-label">
                        <span>📊 IMPACT DASHBOARD</span>
                        <span style="opacity: 0.4;">Resets Sunday</span>
                    </div>
                    <div class="impact-grid">
                        <div class="impact-card" style="border-bottom: 2px solid var(--green);">
                            <div class="stat-val" id="roiClickCount" style="color: var(--green);">0</div>
                            <div class="stat-label">Clicks Saved</div>
                        </div>
                        <div class="impact-card">
                            <div class="stat-val" id="roiTimeSaved">0m</div>
                            <div class="stat-label">Time Saved</div>
                        </div>
                        <div class="impact-card">
                            <div class="stat-val" id="roiSessionCount">0</div>
                            <div class="stat-label">Sessions</div>
                        </div>
                        <div class="impact-card">
                            <div class="stat-val" id="roiBlockedCount" style="opacity: 0.4;">0</div>
                            <div class="stat-label">Blocked</div>
                        </div>
                    </div>
                </div>

                <div class="section" id="performanceSection">
                    <div class="section-label">
                        <span>⚡ Performance Mode</span>
                        <span class="val-display" id="freqVal" style="color: var(--accent);">...</span>
                    </div>
                    <div>
                        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 12px; opacity: 0.5;">Instant</span>
                            <div style="flex: 1;"><input type="range" id="freqSlider" min="200" max="3000" step="100" value="1000"></div>
                            <span style="font-size: 12px; opacity: 0.5;">Battery Saving</span>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-label">🛡️ Safety Rules</div>
                    <div style="font-size: 13px; opacity: 0.6; margin-bottom: 16px; line-height: 1.5;">
                        Patterns that will NEVER be auto-accepted.
                    </div>
                    <textarea id="bannedCommandsInput" 
                        placeholder="rm -rf /&#10;format c:&#10;del /f /s /q"></textarea>
                    
                    <div style="display: flex; gap: 12px; margin-top: 20px;">
                        <button id="saveBannedBtn" class="btn-primary" style="flex: 2;">
                            Update Rules
                        </button>
                        <button id="resetBannedBtn" class="btn-outline" style="flex: 1;">
                            Reset
                        </button>
                    </div>
                    <div id="bannedStatus" style="font-size: 12px; margin-top: 12px; text-align: center; height: 18px;"></div>
                </div>

                <div style="text-align: center; padding: 24px 0; border-top: 1px solid var(--border); margin-top: 8px;">
                    <div style="display: flex; justify-content: center; gap: 24px; margin-bottom: 16px;">
                        <a href="https://github.com/ai-dev-2024/AUTO-ALL-AntiGravity" style="color: var(--accent); text-decoration: none; font-size: 13px;">📂 GitHub</a>
                        <a href="https://ko-fi.com/ai_dev_2024" style="color: var(--green); text-decoration: none; font-size: 13px;">☕ Support on Ko-fi</a>
                    </div>
                    <div style="opacity: 0.3; font-size: 10px; letter-spacing: 0.5px;">
                        Open Source • All Features Free
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                // --- Polling Logic for Real-time Refresh ---
                function refreshStats() {
                    vscode.postMessage({ command: 'getStats' });
                    vscode.postMessage({ command: 'getROIStats' });
                }
                
                // Refresh every 5 seconds while panel is open
                const refreshInterval = setInterval(refreshStats, 5000);
                
                // --- Event Listeners ---
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

                // --- Fancy Count-up Animation ---
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
                });

                // Initial load
                refreshStats();
                vscode.postMessage({ command: 'getBannedCommands' });
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

    // License checking removed - all Pro features are free
    async checkProStatus() {
        return true; // Always Pro
    }

    startPolling() {
        // No license polling needed
    }
}

module.exports = { SettingsPanel };
