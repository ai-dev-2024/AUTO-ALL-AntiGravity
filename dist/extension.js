var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// settings-panel.js
var require_settings_panel = __commonJS({
  "settings-panel.js"(exports2, module2) {
    var vscode2 = require("vscode");
    var SettingsPanel2 = class _SettingsPanel {
      static currentPanel = void 0;
      static viewType = "autoAllSettings";
      static createOrShow(extensionUri, context, mode = "settings") {
        const column = vscode2.window.activeTextEditor ? vscode2.window.activeTextEditor.viewColumn : void 0;
        if (_SettingsPanel.currentPanel) {
          _SettingsPanel.currentPanel.panel.reveal(column);
          _SettingsPanel.currentPanel.updateMode(mode);
          return;
        }
        const panel = vscode2.window.createWebviewPanel(
          _SettingsPanel.viewType,
          mode === "prompt" ? "auto-all-Antigravity" : "auto-all-Antigravity Settings",
          column || vscode2.ViewColumn.One,
          {
            enableScripts: true,
            localResourceRoots: [vscode2.Uri.joinPath(extensionUri, "media")],
            retainContextWhenHidden: true
          }
        );
        _SettingsPanel.currentPanel = new _SettingsPanel(panel, extensionUri, context, mode);
      }
      static showUpgradePrompt(context) {
        _SettingsPanel.createOrShow(context.extensionUri, context, "prompt");
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
              case "setFrequency":
                if (this.isPro()) {
                  await this.context.globalState.update("auto-all-frequency", message.value);
                  vscode2.commands.executeCommand("auto-all.updateFrequency", message.value);
                }
                break;
              case "getStats":
                this.sendStats();
                break;
              case "getROIStats":
                this.sendROIStats();
                break;
              case "updateBannedCommands":
                if (this.isPro()) {
                  await this.context.globalState.update("auto-all-banned-commands", message.commands);
                  vscode2.commands.executeCommand("auto-all.updateBannedCommands", message.commands);
                }
                break;
              case "getBannedCommands":
                this.sendBannedCommands();
                break;
              case "getAcceptPatterns":
                this.sendAcceptPatterns();
                break;
              case "updateAcceptPatterns":
                await this.context.globalState.update("auto-all-accept-patterns", message.patterns);
                vscode2.commands.executeCommand("auto-all.updateAcceptPatterns", message.patterns);
                break;
              case "upgrade":
                this.openUpgrade(message.promoCode);
                this.startPolling(this.getUserId());
                break;
              case "checkPro":
                this.handleCheckPro();
                break;
              case "dismissPrompt":
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
        await this.context.globalState.update("auto-all-lastDismissedAt", now);
        this.dispose();
      }
      async handleCheckPro() {
        vscode2.window.showInformationMessage("All Pro features are already unlocked!");
      }
      isPro() {
        return true;
      }
      getUserId() {
        let userId = this.context.globalState.get("auto-all-userId");
        if (!userId) {
          userId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === "x" ? r : r & 3 | 8;
            return v.toString(16);
          });
          this.context.globalState.update("auto-all-userId", userId);
        }
        return userId;
      }
      openUpgrade(promoCode) {
      }
      updateMode(mode) {
        this.mode = mode;
        this.panel.title = mode === "prompt" ? "auto-all-Antigravity Agent" : "auto-all-Antigravity Settings";
        this.update();
      }
      sendStats() {
        const stats = this.context.globalState.get("auto-all-stats", {
          clicks: 0,
          sessions: 0,
          lastSession: null
        });
        const isPro2 = this.isPro();
        const frequency = isPro2 ? this.context.globalState.get("auto-all-frequency", 1e3) : 300;
        this.panel.webview.postMessage({
          command: "updateStats",
          stats,
          frequency,
          isPro: isPro2
        });
      }
      async sendROIStats() {
        try {
          const roiStats = await vscode2.commands.executeCommand("auto-all.getROIStats");
          this.panel.webview.postMessage({
            command: "updateROIStats",
            roiStats
          });
        } catch (e) {
        }
      }
      sendBannedCommands() {
        const defaultBannedCommands = [
          "rm -rf /",
          "rm -rf ~",
          "rm -rf *",
          "format c:",
          "del /f /s /q",
          "rmdir /s /q",
          ":(){:|:&};:",
          "dd if=",
          "mkfs.",
          "> /dev/sda",
          "chmod -R 777 /"
        ];
        const bannedCommands2 = this.context.globalState.get("auto-all-banned-commands", defaultBannedCommands);
        this.panel.webview.postMessage({
          command: "updateBannedCommands",
          bannedCommands: bannedCommands2
        });
      }
      sendAcceptPatterns() {
        const defaultPatterns = [
          "accept",
          "accept all",
          "run",
          "run command",
          "retry",
          "apply",
          "execute",
          "confirm",
          "allow once",
          "allow",
          "proceed",
          "continue",
          "yes",
          "ok",
          "save",
          "approve",
          "enable",
          "install",
          "update",
          "overwrite"
        ];
        const patterns = this.context.globalState.get("auto-all-accept-patterns", defaultPatterns);
        this.panel.webview.postMessage({
          command: "updateAcceptPatterns",
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
        const isPro2 = this.isPro();
        const isPrompt = this.mode === "prompt";
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
                max-width: ${isPrompt ? "500px" : "720px"};
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
                content: '\u2713';
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
                        <div style="font-size: 32px; margin-bottom: 20px;">\u2705</div>
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
                    <div class="pro-badge">\u2728 All Features Unlocked</div>
                </div>

                <!-- All Pro features enabled -->

                <div class="section">
                    <div class="section-label">
                        <span>\u{1F4CA} IMPACT DASHBOARD</span>
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
                        <span>\u26A1 PERFORMANCE MODE</span>
                        <span class="val-display" id="freqVal" style="color: var(--accent); font-weight: 700;">...</span>
                    </div>
                    <div>
                        <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 12px; font-weight: 600; color: var(--fg-dim);">\u26A1 Instant</span>
                            <div style="flex: 1;"><input type="range" id="freqSlider" min="200" max="3000" step="100" value="1000"></div>
                            <span style="font-size: 12px; font-weight: 600; color: var(--fg-dim);">\u{1F50B} Battery</span>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-label">\u{1F6E1}\uFE0F SAFETY RULES</div>
                    <div style="font-size: 13px; color: var(--fg-dim); margin-bottom: 18px; line-height: 1.6;">
                        Patterns that will <strong>NEVER</strong> be auto-alled.
                    </div>
                    <textarea id="bannedCommandsInput" 
                        placeholder="rm -rf /&#10;format c:&#10;del /f /s /q"></textarea>
                    
                    <div style="display: flex; gap: 14px; margin-top: 22px;">
                        <button id="saveBannedBtn" class="btn-primary" style="flex: 2;">
                            \u{1F4BE} Update Rules
                        </button>
                        <button id="resetBannedBtn" class="btn-outline" style="flex: 1;">
                            \u21BA Reset
                        </button>
                    </div>
                    <div id="bannedStatus" style="font-size: 12px; margin-top: 14px; text-align: center; height: 18px; font-weight: 600;"></div>
                </div>

                <div class="section">
                    <div class="section-label">
                        <span>\u{1F3AF} AUTO-ACCEPT BUTTONS</span>
                        <span id="patternsStatus" style="color: var(--accent);"></span>
                    </div>
                    <div style="font-size: 13px; color: var(--fg-dim); margin-bottom: 18px; line-height: 1.6;">
                        Select which button types to <strong>automatically click</strong>. Changes are saved instantly.
                    </div>
                    <div id="patternsGrid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;"></div>
                    <div style="display: flex; gap: 14px; margin-top: 22px;">
                        <button id="selectAllPatternsBtn" class="btn-outline" style="flex: 1;">
                            \u2713 Select All
                        </button>
                        <button id="resetPatternsBtn" class="btn-outline" style="flex: 1;">
                            \u21BA Reset to Defaults
                        </button>
                    </div>
                </div>

                <div class="footer">
                    <div style="display: flex; justify-content: center; gap: 32px; margin-bottom: 14px;">
                        <a href="https://ko-fi.com/ai_dev_2024" class="footer-link">\u2615 Support Development</a>
                        <a href="https://github.com/ai-dev-2024/AUTO-ALL-AntiGravity" class="footer-link">GitHub</a>
                    </div>
                    <div class="footer-brand">
                        Open Source \u2022 All Features Free \u2022 Made with \u2764\uFE0F
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
                        bannedStatus.innerText = '\u2713 Safety Rules Updated';
                        bannedStatus.style.color = 'var(--green)';
                        setTimeout(() => { bannedStatus.innerText = ''; }, 3000);
                    });
                }

                if (resetBannedBtn) {
                    resetBannedBtn.addEventListener('click', () => {
                        bannedInput.value = defaultBannedCommands.join('\\n');
                        vscode.postMessage({ command: 'updateBannedCommands', commands: defaultBannedCommands });
                        bannedStatus.innerText = '\u2713 Defaults Restored';
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
                        if (slider && !${!isPro2}) {
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
                    patternsStatus.innerText = '\u2713 Saved';
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
                        patternsStatus.innerText = '\u2713 Defaults Restored';
                    });
                }
            </script>
        </body>
        </html>`;
      }
      dispose() {
        _SettingsPanel.currentPanel = void 0;
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
    };
    module2.exports = { SettingsPanel: SettingsPanel2 };
  }
});

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports2, module2) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module2.exports = {
      BINARY_TYPES,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: /* @__PURE__ */ Symbol("kIsForOnEventAttribute"),
      kListener: /* @__PURE__ */ Symbol("kListener"),
      kStatusCode: /* @__PURE__ */ Symbol("status-code"),
      kWebSocket: /* @__PURE__ */ Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports2, module2) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module2.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = require("bufferutil");
        module2.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module2.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports2, module2) {
    "use strict";
    var kDone = /* @__PURE__ */ Symbol("kDone");
    var kRun = /* @__PURE__ */ Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module2.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports2, module2) {
    "use strict";
    var zlib = require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = /* @__PURE__ */ Symbol("permessage-deflate");
    var kTotalLength = /* @__PURE__ */ Symbol("total-length");
    var kCallback = /* @__PURE__ */ Symbol("callback");
    var kBuffers = /* @__PURE__ */ Symbol("buffers");
    var kError = /* @__PURE__ */ Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       * @param {Boolean} [isServer=false] Create the instance in either server or
       *     client mode
       * @param {Number} [maxPayload=0] The maximum allowed message length
       */
      constructor(options, isServer, maxPayload) {
        this._maxPayload = maxPayload | 0;
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._isServer = !!isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module2.exports = PerMessageDeflate;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports2, module2) {
    "use strict";
    var { isUtf8 } = require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module2.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module2.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = require("utf-8-validate");
        module2.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports2, module2) {
    "use strict";
    var { Writable } = require("stream");
    var PerMessageDeflate = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module2.exports = Receiver;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports2, module2) {
    "use strict";
    var { Duplex } = require("stream");
    var { randomFillSync } = require("crypto");
    var PerMessageDeflate = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = /* @__PURE__ */ Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else {
            buf.set(data, 2);
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module2.exports = Sender;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports2, module2) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = /* @__PURE__ */ Symbol("kCode");
    var kData = /* @__PURE__ */ Symbol("kData");
    var kError = /* @__PURE__ */ Symbol("kError");
    var kMessage = /* @__PURE__ */ Symbol("kMessage");
    var kReason = /* @__PURE__ */ Symbol("kReason");
    var kTarget = /* @__PURE__ */ Symbol("kTarget");
    var kType = /* @__PURE__ */ Symbol("kType");
    var kWasClean = /* @__PURE__ */ Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module2.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension) => {
        let configurations = extensions[extension];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module2.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var https = require("https");
    var http = require("http");
    var net = require("net");
    var tls = require("tls");
    var { randomBytes, createHash } = require("crypto");
    var { Duplex, Readable } = require("stream");
    var { URL } = require("url");
    var PerMessageDeflate = require_permessage_deflate();
    var Receiver = require_receiver();
    var Sender = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var closeTimeout = 30 * 1e3;
    var kAborted = /* @__PURE__ */ Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate.extensionName]) {
          this._extensions[PerMessageDeflate.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket.prototype.addEventListener = addEventListener;
    WebSocket.prototype.removeEventListener = removeEventListener;
    module2.exports = WebSocket;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        protocolVersion: protocolVersions[1],
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL(address);
        } catch (e) {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate(
          opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
          false,
          opts.maxPayload
        );
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket.CLOSED) return;
      if (websocket.readyState === WebSocket.OPEN) {
        websocket._readyState = WebSocket.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket.CLOSING;
      let chunk;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && (chunk = websocket._socket.read()) !== null) {
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports2, module2) {
    "use strict";
    var WebSocket = require_websocket();
    var { Duplex } = require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module2.exports = createWebSocketStream;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module2.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var http = require("http");
    var { Duplex } = require("stream");
    var { createHash } = require("crypto");
    var extension = require_extension();
    var PerMessageDeflate = require_permessage_deflate();
    var subprotocol = require_subprotocol();
    var WebSocket = require_websocket();
    var { GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate(
            this.options.perMessageDeflate,
            true,
            this.options.maxPayload
          );
          try {
            const offers = extension.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
              extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate.extensionName]) {
          const params = extensions[PerMessageDeflate.extensionName].params;
          const value = extension.format({
            [PerMessageDeflate.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module2.exports = WebSocketServer;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// node_modules/ws/index.js
var require_ws = __commonJS({
  "node_modules/ws/index.js"(exports2, module2) {
    "use strict";
    var WebSocket = require_websocket();
    WebSocket.createWebSocketStream = require_stream();
    WebSocket.Server = require_websocket_server();
    WebSocket.Receiver = require_receiver();
    WebSocket.Sender = require_sender();
    WebSocket.WebSocket = WebSocket;
    WebSocket.WebSocketServer = WebSocket.Server;
    module2.exports = WebSocket;
  }
});

// main_scripts/cdp-handler.js
var require_cdp_handler = __commonJS({
  "main_scripts/cdp-handler.js"(exports2, module2) {
    var WebSocket = require_ws();
    var http = require("http");
    var fs = require("fs");
    var path2 = require("path");
    var LOG_PREFIX = "[CDP]";
    var CDPHandler = class {
      constructor(startPort = 9e3, endPort = 9030, logger = console.log) {
        this.startPort = startPort;
        this.endPort = endPort;
        this.logger = logger;
        this.connections = /* @__PURE__ */ new Map();
        this.messageId = 1;
        this.pendingMessages = /* @__PURE__ */ new Map();
        this.isEnabled = false;
        this.isPro = false;
        this.logFilePath = null;
      }
      setLogFile(filePath) {
        this.logFilePath = filePath;
        if (filePath) {
          fs.writeFileSync(filePath, `[${(/* @__PURE__ */ new Date()).toISOString()}] CDP Log Initialized
`);
        }
      }
      log(...args) {
        const msg = `${LOG_PREFIX} ${args.join(" ")}`;
        if (this.logger) this.logger(msg);
      }
      setProStatus(isPro2) {
        this.isPro = isPro2;
      }
      async isCDPAvailable() {
        const instances = await this.scanForInstances();
        return instances.length > 0;
      }
      async scanForInstances() {
        const instances = [];
        for (let port = this.startPort; port <= this.endPort; port++) {
          try {
            const pages = await this.getPages(port);
            if (pages.length > 0) instances.push({ port, pages });
          } catch (e) {
          }
        }
        return instances;
      }
      getPages(port) {
        return new Promise((resolve, reject) => {
          const req = http.get({ hostname: "127.0.0.1", port, path: "/json/list", timeout: 1e3 }, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
              try {
                resolve(JSON.parse(data).filter((p) => p.webSocketDebuggerUrl));
              } catch (e) {
                reject(e);
              }
            });
          });
          req.on("error", reject);
          req.on("timeout", () => {
            req.destroy();
            reject(new Error("timeout"));
          });
        });
      }
      async start(config) {
        this.isEnabled = true;
        const instances = await this.scanForInstances();
        for (const instance of instances) {
          for (const page of instance.pages) {
            if (!this.connections.has(page.id)) {
              await this.connectToPage(page);
            }
            if (this.connections.has(page.id)) {
              await this.injectAndStart(page.id, config);
            }
          }
        }
      }
      async stop() {
        this.isEnabled = false;
        const stopPromises = [];
        for (const [pageId] of this.connections) {
          stopPromises.push(
            this.sendCommand(pageId, "Runtime.evaluate", {
              expression: 'if(typeof window !== "undefined" && window.__autoAllStop) window.__autoAllStop()'
            }).catch(() => {
            })
          );
        }
        await Promise.allSettled(stopPromises);
        this.disconnectAll();
      }
      async connectToPage(page) {
        return new Promise((resolve) => {
          const ws = new WebSocket(page.webSocketDebuggerUrl);
          ws.on("open", () => {
            this.connections.set(page.id, { ws, injected: false });
            resolve(true);
          });
          ws.on("message", (data) => {
            try {
              const msg = JSON.parse(data.toString());
              if (msg.id && this.pendingMessages.has(msg.id)) {
                const { resolve: res, reject: rej } = this.pendingMessages.get(msg.id);
                this.pendingMessages.delete(msg.id);
                msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
              }
            } catch (e) {
            }
          });
          ws.on("error", (err) => {
            this.log(`WS Error on ${page.id}: ${err.message}`);
            this.connections.delete(page.id);
            resolve(false);
          });
          ws.on("close", () => {
            this.connections.delete(page.id);
          });
        });
      }
      async injectAndStart(pageId, config) {
        const conn = this.connections.get(pageId);
        if (!conn) return;
        try {
          if (!conn.injected) {
            const script = this.getComposedScript();
            const result = await this.sendCommand(pageId, "Runtime.evaluate", {
              expression: script,
              userGesture: true,
              awaitPromise: true
            });
            if (result.exceptionDetails) {
              this.log(`Injection Exception on ${pageId}: ${result.exceptionDetails.text} ${result.exceptionDetails.exception.description}`);
            } else {
              conn.injected = true;
              this.log(`Injected core onto ${pageId}`);
            }
          }
          if (conn.injected) {
            const res = await this.sendCommand(pageId, "Runtime.evaluate", {
              expression: `(function(){
                        const g = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : self);
                        if(g && typeof g.__autoAllStart === 'function'){
                            g.__autoAllStart(${JSON.stringify(config)});
                            return "started";
                        }
                        return "not_found";
                    })()`
            });
            this.log(`Start signal on ${pageId}: ${JSON.stringify(res.result?.value || res)}`);
          }
        } catch (e) {
          this.log(`Failed to start/update on ${pageId}: ${e.message}`);
        }
      }
      getComposedScript() {
        const scriptPath = path2.join(__dirname, "..", "main_scripts", "full_cdp_script.js");
        return fs.readFileSync(scriptPath, "utf8");
      }
      sendCommand(pageId, method, params = {}) {
        const conn = this.connections.get(pageId);
        if (!conn || conn.ws.readyState !== WebSocket.OPEN) return Promise.reject("dead");
        const id = this.messageId++;
        return new Promise((resolve, reject) => {
          this.pendingMessages.set(id, { resolve, reject });
          conn.ws.send(JSON.stringify({ id, method, params }));
          setTimeout(() => {
            if (this.pendingMessages.has(id)) {
              this.pendingMessages.delete(id);
              reject(new Error("timeout"));
            }
          }, 2e3);
        });
      }
      async hideBackgroundOverlay() {
        for (const [pageId] of this.connections) {
          try {
            await this.sendCommand(pageId, "Runtime.evaluate", {
              expression: 'if(typeof window !== "undefined" && typeof hideOverlay === "function") hideOverlay()'
            });
          } catch (e) {
          }
        }
      }
      async getStats() {
        const aggregatedStats = { clicks: 0, blocked: 0, fileEdits: 0, terminalCommands: 0, actionsWhileAway: 0 };
        for (const [pageId] of this.connections) {
          try {
            const result = await this.sendCommand(pageId, "Runtime.evaluate", {
              expression: '(function(){ if(typeof window !== "undefined" && window.__autoAllGetStats) return JSON.stringify(window.__autoAllGetStats()); return "{}"; })()',
              returnByValue: true
            });
            if (result.result?.value) {
              const stats = JSON.parse(result.result.value);
              aggregatedStats.clicks += stats.clicks || 0;
              aggregatedStats.blocked += stats.blocked || 0;
              aggregatedStats.fileEdits += stats.fileEdits || 0;
              aggregatedStats.terminalCommands += stats.terminalCommands || 0;
              aggregatedStats.actionsWhileAway += stats.actionsWhileAway || 0;
            }
          } catch (e) {
          }
        }
        return aggregatedStats;
      }
      async resetStats() {
        const aggregatedStats = { clicks: 0, blocked: 0, fileEdits: 0, terminalCommands: 0, actionsWhileAway: 0 };
        for (const [pageId] of this.connections) {
          try {
            const result = await this.sendCommand(pageId, "Runtime.evaluate", {
              expression: '(function(){ if(typeof window !== "undefined" && window.__autoAllResetStats) return JSON.stringify(window.__autoAllResetStats()); return "{}"; })()',
              returnByValue: true
            });
            if (result.result?.value) {
              const stats = JSON.parse(result.result.value);
              aggregatedStats.clicks += stats.clicks || 0;
              aggregatedStats.blocked += stats.blocked || 0;
              aggregatedStats.fileEdits += stats.fileEdits || 0;
              aggregatedStats.terminalCommands += stats.terminalCommands || 0;
              aggregatedStats.actionsWhileAway += stats.actionsWhileAway || 0;
            }
          } catch (e) {
          }
        }
        return aggregatedStats;
      }
      async getSessionSummary() {
        const summary = { clicks: 0, fileEdits: 0, terminalCommands: 0, blocked: 0 };
        for (const [pageId] of this.connections) {
          try {
            const result = await this.sendCommand(pageId, "Runtime.evaluate", {
              expression: '(function(){ if(typeof window !== "undefined" && window.__autoAllGetSessionSummary) return JSON.stringify(window.__autoAllGetSessionSummary()); return "{}"; })()',
              returnByValue: true
            });
            if (result.result?.value) {
              const stats = JSON.parse(result.result.value);
              summary.clicks += stats.clicks || 0;
              summary.fileEdits += stats.fileEdits || 0;
              summary.terminalCommands += stats.terminalCommands || 0;
              summary.blocked += stats.blocked || 0;
            }
          } catch (e) {
          }
        }
        const baseSecs = summary.clicks * 5;
        const minMins = Math.max(1, Math.floor(baseSecs * 0.8 / 60));
        const maxMins = Math.ceil(baseSecs * 1.2 / 60);
        summary.estimatedTimeSaved = summary.clicks > 0 ? `${minMins}\u2013${maxMins}` : null;
        return summary;
      }
      async getAwayActions() {
        let total = 0;
        for (const [pageId] of this.connections) {
          try {
            const result = await this.sendCommand(pageId, "Runtime.evaluate", {
              expression: '(function(){ if(typeof window !== "undefined" && window.__autoAllGetAwayActions) return window.__autoAllGetAwayActions(); return 0; })()',
              returnByValue: true
            });
            if (result.result?.value) {
              total += parseInt(result.result.value) || 0;
            }
          } catch (e) {
          }
        }
        return total;
      }
      async setFocusState(isFocused) {
        for (const [pageId] of this.connections) {
          try {
            await this.sendCommand(pageId, "Runtime.evaluate", {
              expression: `(function(){ 
                        if(typeof window !== "undefined" && window.__autoAllSetFocusState) {
                            window.__autoAllSetFocusState(${isFocused});
                        }
                    })()`
            });
          } catch (e) {
          }
        }
        this.log(`Focus state pushed to all pages: ${isFocused}`);
      }
      getConnectionCount() {
        return this.connections.size;
      }
      disconnectAll() {
        for (const [, conn] of this.connections) try {
          conn.ws.close();
        } catch (e) {
        }
        this.connections.clear();
      }
    };
    module2.exports = { CDPHandler };
  }
});

// main_scripts/relauncher.js
var require_relauncher = __commonJS({
  "main_scripts/relauncher.js"(exports2, module2) {
    var vscode2 = require("vscode");
    var { execSync, spawn } = require("child_process");
    var os = require("os");
    var http = require("http");
    var fs = require("fs");
    var path2 = require("path");
    var BASE_CDP_PORT = 9e3;
    var CDP_FLAG = `--remote-debugging-port=${BASE_CDP_PORT}`;
    var Relauncher = class {
      constructor(logger = null) {
        this.platform = os.platform();
        this.logger = logger || console.log;
        this.logFile = path2.join(os.tmpdir(), "auto_accept_relaunch.log");
      }
      log(msg) {
        try {
          const timestamp = (/* @__PURE__ */ new Date()).toISOString();
          const formattedMsg = `[Relauncher ${timestamp}] ${msg}`;
          if (this.logger && typeof this.logger === "function") {
            this.logger(formattedMsg);
          }
          console.log(formattedMsg);
        } catch (e) {
          console.error("Relauncher log error:", e);
        }
      }
      logToFile(msg) {
        this.log(msg);
      }
      async isCDPRunning(port = BASE_CDP_PORT) {
        return new Promise((resolve) => {
          const req = http.get(`http://127.0.0.1:${port}/json`, (res) => {
            resolve(res.statusCode === 200);
          });
          req.on("error", () => resolve(false));
          req.setTimeout(2e3, () => {
            req.destroy();
            resolve(false);
          });
        });
      }
      getIDEName() {
        const appName = vscode2.env.appName || "";
        if (appName.toLowerCase().includes("cursor")) return "Cursor";
        if (appName.toLowerCase().includes("antigravity")) return "Antigravity";
        return "Code";
      }
      async findIDEShortcuts() {
        const ideName = this.getIDEName();
        this.log(`Finding shortcuts for: ${ideName}`);
        if (this.platform === "win32") {
          return await this._findWindowsShortcuts(ideName);
        } else if (this.platform === "darwin") {
          return await this._findMacOSShortcuts(ideName);
        } else {
          return await this._findLinuxShortcuts(ideName);
        }
      }
      async _findWindowsShortcuts(ideName) {
        const shortcuts = [];
        const possiblePaths = [
          path2.join(process.env.APPDATA || "", "Microsoft", "Windows", "Start Menu", "Programs", ideName, `${ideName}.lnk`),
          path2.join(process.env.USERPROFILE || "", "Desktop", `${ideName}.lnk`),
          path2.join(process.env.APPDATA || "", "Microsoft", "Internet Explorer", "Quick Launch", "User Pinned", "TaskBar", `${ideName}.lnk`)
        ];
        for (const shortcutPath of possiblePaths) {
          if (fs.existsSync(shortcutPath)) {
            const info = await this._readWindowsShortcut(shortcutPath);
            shortcuts.push({
              path: shortcutPath,
              hasFlag: info.hasFlag,
              type: shortcutPath.includes("Start Menu") ? "startmenu" : shortcutPath.includes("Desktop") ? "desktop" : "taskbar",
              args: info.args,
              target: info.target
            });
          }
        }
        this.log(`Found ${shortcuts.length} Windows shortcuts`);
        return shortcuts;
      }
      async _readWindowsShortcut(shortcutPath) {
        const scriptPath = path2.join(os.tmpdir(), "auto_accept_read_shortcut.ps1");
        try {
          const psScript = `
$ErrorActionPreference = "Stop"
try {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
    Write-Output "ARGS:$($shortcut.Arguments)"
    Write-Output "TARGET:$($shortcut.TargetPath)"
} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
}
`;
          fs.writeFileSync(scriptPath, psScript, "utf8");
          const result = execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, {
            encoding: "utf8",
            timeout: 1e4
          });
          const lines = result.split("\n").map((l) => l.trim()).filter((l) => l);
          const errorLine = lines.find((l) => l.startsWith("ERROR:"));
          if (errorLine) {
            this.log(`Error reading shortcut: ${errorLine.substring(6)}`);
            return { args: "", target: "", hasFlag: false };
          }
          const argsLine = lines.find((l) => l.startsWith("ARGS:")) || "ARGS:";
          const targetLine = lines.find((l) => l.startsWith("TARGET:")) || "TARGET:";
          const args = argsLine.substring(5);
          const target = targetLine.substring(7);
          const hasFlag = args.includes("--remote-debugging-port");
          this.log(`Read shortcut: args="${args}", hasFlag=${hasFlag}`);
          return { args, target, hasFlag };
        } catch (e) {
          this.log(`Error reading shortcut ${shortcutPath}: ${e.message}`);
          return { args: "", target: "", hasFlag: false };
        } finally {
          try {
            fs.unlinkSync(scriptPath);
          } catch (e) {
          }
        }
      }
      async _findMacOSShortcuts(ideName) {
        const shortcuts = [];
        const wrapperPath = path2.join(os.homedir(), ".local", "bin", `${ideName.toLowerCase()}-cdp`);
        if (fs.existsSync(wrapperPath)) {
          const content = fs.readFileSync(wrapperPath, "utf8");
          shortcuts.push({
            path: wrapperPath,
            hasFlag: content.includes("--remote-debugging-port"),
            type: "wrapper"
          });
        }
        const appPath = `/Applications/${ideName}.app`;
        if (fs.existsSync(appPath)) {
          shortcuts.push({
            path: appPath,
            hasFlag: false,
            type: "app"
          });
        }
        this.log(`Found ${shortcuts.length} macOS shortcuts/apps`);
        return shortcuts;
      }
      async _findLinuxShortcuts(ideName) {
        const shortcuts = [];
        const desktopLocations = [
          path2.join(os.homedir(), ".local", "share", "applications", `${ideName.toLowerCase()}.desktop`),
          `/usr/share/applications/${ideName.toLowerCase()}.desktop`
        ];
        for (const desktopPath of desktopLocations) {
          if (fs.existsSync(desktopPath)) {
            const content = fs.readFileSync(desktopPath, "utf8");
            const execMatch = content.match(/^Exec=(.*)$/m);
            const execLine = execMatch ? execMatch[1] : "";
            shortcuts.push({
              path: desktopPath,
              hasFlag: execLine.includes("--remote-debugging-port"),
              type: desktopPath.includes(".local") ? "user" : "system",
              execLine
            });
          }
        }
        this.log(`Found ${shortcuts.length} Linux .desktop files`);
        return shortcuts;
      }
      async ensureShortcutHasFlag(shortcut) {
        if (shortcut.hasFlag) {
          return { success: true, modified: false, message: "Already has CDP flag" };
        }
        if (this.platform === "win32") {
          return await this._modifyWindowsShortcut(shortcut.path);
        } else if (this.platform === "darwin") {
          return await this._createMacOSWrapper();
        } else {
          return await this._modifyLinuxDesktop(shortcut.path);
        }
      }
      async _modifyWindowsShortcut(shortcutPath) {
        const scriptPath = path2.join(os.tmpdir(), "auto_accept_modify_shortcut.ps1");
        try {
          const psScript = `
$ErrorActionPreference = "Stop"
try {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
    
    Write-Output "BEFORE_ARGS:$($shortcut.Arguments)"
    Write-Output "TARGET:$($shortcut.TargetPath)"
    
    $currentArgs = $shortcut.Arguments
    $newPort = '${BASE_CDP_PORT}'
    $portPattern = '--remote-debugging-port=\\d+'
    
    if ($currentArgs -match $portPattern) {
        # Replace existing port with new port
        $shortcut.Arguments = $currentArgs -replace $portPattern, "--remote-debugging-port=$newPort"
        if ($shortcut.Arguments -ne $currentArgs) {
            $shortcut.Save()
            Write-Output "AFTER_ARGS:$($shortcut.Arguments)"
            Write-Output "RESULT:UPDATED"
        } else {
            Write-Output "RESULT:ALREADY_CORRECT"
        }
    } else {
        # No port flag, add it
        $shortcut.Arguments = "--remote-debugging-port=$newPort " + $currentArgs
        $shortcut.Save()
        Write-Output "AFTER_ARGS:$($shortcut.Arguments)"
        Write-Output "RESULT:MODIFIED"
    }
} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
}
`;
          fs.writeFileSync(scriptPath, psScript, "utf8");
          this.log(`DEBUG: Wrote modify script to ${scriptPath}`);
          const rawResult = execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, {
            encoding: "utf8",
            timeout: 1e4
          });
          this.log(`DEBUG: Raw PowerShell output: ${JSON.stringify(rawResult)}`);
          const lines = rawResult.split("\n").map((l) => l.trim()).filter((l) => l);
          this.log(`DEBUG: Parsed lines: ${JSON.stringify(lines)}`);
          const errorLine = lines.find((l) => l.startsWith("ERROR:"));
          if (errorLine) {
            const errorMsg = errorLine.substring(6);
            this.log(`PowerShell error: ${errorMsg}`);
            return { success: false, modified: false, message: errorMsg };
          }
          const resultLine = lines.find((l) => l.startsWith("RESULT:"));
          const result = resultLine ? resultLine.substring(7) : "UNKNOWN";
          this.log(`DEBUG: Result extracted: "${result}"`);
          if (result === "MODIFIED") {
            this.log(`Modified shortcut: ${shortcutPath}`);
            return { success: true, modified: true, message: `Modified: ${path2.basename(shortcutPath)}` };
          } else if (result === "UPDATED") {
            this.log(`Updated shortcut port: ${shortcutPath}`);
            return { success: true, modified: true, message: `Updated port: ${path2.basename(shortcutPath)}` };
          } else if (result === "ALREADY_CORRECT") {
            this.log(`Shortcut already has correct CDP port`);
            return { success: true, modified: false, message: "Already configured with correct port" };
          } else {
            this.log(`Unexpected result: ${result}`);
            return { success: false, modified: false, message: `Unexpected result: ${result}` };
          }
        } catch (e) {
          this.log(`Error modifying shortcut: ${e.message}`);
          if (e.stderr) this.log(`STDERR: ${e.stderr}`);
          return { success: false, modified: false, message: e.message };
        } finally {
          try {
            fs.unlinkSync(scriptPath);
          } catch (e) {
          }
        }
      }
      async _createMacOSWrapper() {
        const ideName = this.getIDEName();
        const wrapperDir = path2.join(os.homedir(), ".local", "bin");
        const wrapperPath = path2.join(wrapperDir, `${ideName.toLowerCase()}-cdp`);
        try {
          fs.mkdirSync(wrapperDir, { recursive: true });
          const appBundle = `/Applications/${ideName}.app`;
          const possibleBinaries = [
            path2.join(appBundle, "Contents", "MacOS", ideName),
            path2.join(appBundle, "Contents", "Resources", "app", "bin", ideName.toLowerCase()),
            path2.join(appBundle, "Contents", "MacOS", "Electron")
          ];
          let binaryPath = null;
          for (const binPath of possibleBinaries) {
            if (fs.existsSync(binPath)) {
              binaryPath = binPath;
              this.log(`Found macOS binary at: ${binPath}`);
              break;
            }
          }
          if (!binaryPath) {
            this.log(`No direct binary found, using 'open -a' method`);
            const scriptContent = `#!/bin/bash
# auto-all-Antigravity - ${ideName} with CDP enabled
# Generated: ${(/* @__PURE__ */ new Date()).toISOString()}
# Uses 'open -a' for reliable app launching with arguments
open -a "${appBundle}" --args ${CDP_FLAG} "$@"
`;
            fs.writeFileSync(wrapperPath, scriptContent, { mode: 493 });
            this.log(`Created macOS wrapper (open -a method): ${wrapperPath}`);
          } else {
            const scriptContent = `#!/bin/bash
# auto-all-Antigravity - ${ideName} with CDP enabled
# Generated: ${(/* @__PURE__ */ new Date()).toISOString()}
"${binaryPath}" ${CDP_FLAG} "$@"
`;
            fs.writeFileSync(wrapperPath, scriptContent, { mode: 493 });
            this.log(`Created macOS wrapper (direct binary): ${wrapperPath}`);
          }
          return {
            success: true,
            modified: true,
            message: `Created wrapper script. Launch via: ${wrapperPath}`,
            wrapperPath
          };
        } catch (e) {
          this.log(`Error creating macOS wrapper: ${e.message}`);
          return { success: false, modified: false, message: e.message };
        }
      }
      async _modifyLinuxDesktop(desktopPath) {
        try {
          let content = fs.readFileSync(desktopPath, "utf8");
          const originalContent = content;
          if (content.includes("--remote-debugging-port")) {
            content = content.replace(
              /--remote-debugging-port=\d+/g,
              CDP_FLAG
            );
            if (content === originalContent) {
              return { success: true, modified: false, message: "Already configured with correct port" };
            }
          } else {
            content = content.replace(
              /^(Exec=)(.*)$/m,
              `$1$2 ${CDP_FLAG}`
            );
          }
          const userDesktopDir = path2.join(os.homedir(), ".local", "share", "applications");
          const targetPath = desktopPath.includes(".local") ? desktopPath : path2.join(userDesktopDir, path2.basename(desktopPath));
          fs.mkdirSync(userDesktopDir, { recursive: true });
          fs.writeFileSync(targetPath, content);
          this.log(`Modified Linux .desktop: ${targetPath}`);
          return { success: true, modified: true, message: `Modified: ${path2.basename(targetPath)}` };
        } catch (e) {
          this.log(`Error modifying .desktop: ${e.message}`);
          return { success: false, modified: false, message: e.message };
        }
      }
      getWorkspaceFolders() {
        const folders = vscode2.workspace.workspaceFolders;
        if (!folders || folders.length === 0) return [];
        return folders.map((f) => f.uri.fsPath);
      }
      async relaunchViaShortcut(shortcut) {
        const workspaceFolders = this.getWorkspaceFolders();
        this.log(`Relaunching via: ${shortcut.path}`);
        this.log(`Workspaces: ${workspaceFolders.join(", ") || "(none)"}`);
        if (this.platform === "win32") {
          return await this._relaunchWindows(shortcut, workspaceFolders);
        } else if (this.platform === "darwin") {
          return await this._relaunchMacOS(shortcut, workspaceFolders);
        } else {
          return await this._relaunchLinux(shortcut, workspaceFolders);
        }
      }
      async _relaunchWindows(shortcut, workspaceFolders) {
        const folderArgs = workspaceFolders.map((f) => `"${f}"`).join(" ");
        const ideName = this.getIDEName();
        let targetExe = shortcut.target || "";
        if (!targetExe) {
          try {
            const info = await this._readWindowsShortcut(shortcut.path);
            targetExe = info.target;
          } catch (e) {
            this.log(`Could not read target from shortcut: ${e.message}`);
          }
        }
        const batchFileName = `relaunch_${ideName.replace(/\s+/g, "_")}_${Date.now()}.bat`;
        const batchPath = path2.join(os.tmpdir(), batchFileName);
        let commandLine = "";
        if (!targetExe || targetExe.endsWith(".lnk")) {
          this.log("Fallback: Could not resolve EXE, using shortcut path");
          commandLine = `start "" "${shortcut.path}" ${folderArgs}`;
        } else {
          const safeTarget = `"${targetExe}"`;
          commandLine = `start "" ${safeTarget} ${CDP_FLAG} ${folderArgs}`;
        }
        const batchContent = `@echo off
REM auto-all-Antigravity - IDE Relaunch Script
timeout /t 5 /nobreak >nul
${commandLine}
del "%~f0" & exit
`;
        try {
          fs.writeFileSync(batchPath, batchContent, "utf8");
          this.log(`Created relaunch batch: ${batchPath}`);
          this.log(`Command: ${commandLine}`);
          const child = spawn("explorer.exe", [batchPath], {
            detached: true,
            stdio: "ignore",
            windowsHide: true
          });
          child.unref();
          this.log("Explorer asked to run batch. Waiting for quit...");
          setTimeout(() => {
            this.log("Closing current window...");
            vscode2.commands.executeCommand("workbench.action.quit");
          }, 1e3);
          return { success: true };
        } catch (e) {
          this.log(`Relaunch failed: ${e.message}`);
          return { success: false, error: e.message };
        }
      }
      async _relaunchMacOS(shortcut, workspaceFolders) {
        const folderArgs = workspaceFolders.map((f) => `"${f}"`).join(" ");
        const scriptPath = path2.join(os.tmpdir(), "relaunch_ide.sh");
        const launchCommand = shortcut.type === "wrapper" ? `"${shortcut.path}" ${folderArgs}` : `open -a "${shortcut.path}" --args ${CDP_FLAG} ${folderArgs}`;
        const scriptContent = `#!/bin/bash
sleep 2
${launchCommand}
`;
        try {
          fs.writeFileSync(scriptPath, scriptContent, { mode: 493 });
          this.log(`Created macOS relaunch script: ${scriptPath}`);
          this.log(`Shortcut type: ${shortcut.type}`);
          this.log(`Launch command: ${launchCommand}`);
          const child = spawn("/bin/bash", [scriptPath], {
            detached: true,
            stdio: "ignore"
          });
          child.unref();
          setTimeout(() => {
            vscode2.commands.executeCommand("workbench.action.quit");
          }, 1500);
          return { success: true };
        } catch (e) {
          this.log(`macOS relaunch error: ${e.message}`);
          return { success: false, error: e.message };
        }
      }
      async _relaunchLinux(shortcut, workspaceFolders) {
        const folderArgs = workspaceFolders.map((f) => `"${f}"`).join(" ");
        const ideName = this.getIDEName().toLowerCase();
        let execCommand = "";
        if (shortcut.execLine) {
          execCommand = shortcut.execLine.replace(/%[fFuUdDnNickvm]/g, "").trim();
        }
        const scriptPath = path2.join(os.tmpdir(), "relaunch_ide.sh");
        const desktopFileName = path2.basename(shortcut.path, ".desktop");
        const scriptContent = `#!/bin/bash
sleep 2

# Method 1: gio launch (most reliable for .desktop files)
if command -v gio &> /dev/null; then
    gio launch "${shortcut.path}" ${folderArgs} 2>/dev/null && exit 0
fi

# Method 2: Direct execution from Exec line
${execCommand ? `${execCommand} ${folderArgs} 2>/dev/null && exit 0` : "# No Exec line available"}

# Method 3: gtk-launch fallback
if command -v gtk-launch &> /dev/null; then
    gtk-launch "${desktopFileName}" ${folderArgs} 2>/dev/null && exit 0
fi

# Method 4: Try to find and run the IDE binary directly
for bin in "/usr/bin/${ideName}" "/usr/share/${ideName}/bin/${ideName}" "/opt/${ideName}/bin/${ideName}"; do
    if [ -x "$bin" ]; then
        "$bin" ${CDP_FLAG} ${folderArgs} &
        exit 0
    fi
done

echo "Failed to launch IDE" >&2
exit 1
`;
        try {
          fs.writeFileSync(scriptPath, scriptContent, { mode: 493 });
          this.log(`Created Linux relaunch script: ${scriptPath}`);
          this.log(`Desktop file: ${shortcut.path}`);
          this.log(`Exec command: ${execCommand || "(none parsed)"}`);
          const child = spawn("/bin/bash", [scriptPath], {
            detached: true,
            stdio: "ignore"
          });
          child.unref();
          setTimeout(() => {
            vscode2.commands.executeCommand("workbench.action.quit");
          }, 1500);
          return { success: true };
        } catch (e) {
          this.log(`Linux relaunch error: ${e.message}`);
          return { success: false, error: e.message };
        }
      }
      async relaunchWithCDP() {
        this.log("Starting relaunchWithCDP flow...");
        const cdpAvailable = await this.isCDPRunning();
        if (cdpAvailable) {
          this.log("CDP already running, no relaunch needed");
          return { success: true, action: "none", message: "CDP already available" };
        }
        const shortcuts = await this.findIDEShortcuts();
        if (shortcuts.length === 0) {
          this.log("No shortcuts found");
          return {
            success: false,
            action: "error",
            message: "No IDE shortcuts found. Please create a shortcut first."
          };
        }
        const primaryShortcut = shortcuts.find(
          (s) => s.type === "startmenu" || s.type === "wrapper" || s.type === "user"
        ) || shortcuts[0];
        const modifyResult = await this.ensureShortcutHasFlag(primaryShortcut);
        if (!modifyResult.success) {
          return {
            success: false,
            action: "error",
            message: `Failed to modify shortcut: ${modifyResult.message}`
          };
        }
        if (modifyResult.modified) {
          primaryShortcut.hasFlag = true;
        }
        this.log("Relaunching IDE...");
        const relaunchResult = await this.relaunchViaShortcut(primaryShortcut);
        if (relaunchResult.success) {
          return {
            success: true,
            action: "relaunched",
            message: modifyResult.modified ? "Shortcut updated. Relaunching with CDP enabled..." : "Relaunching with CDP enabled..."
          };
        } else {
          return {
            success: false,
            action: "error",
            message: `Relaunch failed: ${relaunchResult.error}`
          };
        }
      }
      async launchAndReplace() {
        return await this.relaunchWithCDP();
      }
      async showRelaunchPrompt() {
        this.log("Showing relaunch prompt");
        const choice = await vscode2.window.showInformationMessage(
          "auto-all-Antigravity requires a quick one-time setup to enable background mode. This will restart your IDE with necessary permissions.",
          { modal: false },
          "Setup & Restart",
          "Not Now"
        );
        this.log(`User chose: ${choice}`);
        if (choice === "Setup & Restart") {
          const result = await this.relaunchWithCDP();
          if (!result.success) {
            vscode2.window.showErrorMessage(`Setup failed: ${result.message}`);
          }
          return result.success ? "relaunched" : "failed";
        }
        return "cancelled";
      }
      async showLaunchPrompt() {
        return await this.showRelaunchPrompt();
      }
      getLogFilePath() {
        return this.logFile;
      }
    };
    module2.exports = { Relauncher, BASE_CDP_PORT };
  }
});

// extension.js
var vscode = require("vscode");
var path = require("path");
var SettingsPanel = null;
function getSettingsPanel() {
  if (!SettingsPanel) {
    try {
      SettingsPanel = require_settings_panel().SettingsPanel;
    } catch (e) {
      console.error("Failed to load SettingsPanel:", e);
    }
  }
  return SettingsPanel;
}
var GLOBAL_STATE_KEY = "auto-all-enabled-global";
var PRO_STATE_KEY = "auto-all-isPro";
var FREQ_STATE_KEY = "auto-all-frequency";
var BANNED_COMMANDS_KEY = "auto-all-banned-commands";
var ROI_STATS_KEY = "auto-all-roi-stats";
var SECONDS_PER_CLICK = 5;
var INSTANCE_ID = Math.random().toString(36).substring(7);
var isEnabled = false;
var isPro = false;
var isLockedOut = false;
var pollFrequency = 100;
var bannedCommands = [];
var acceptPatterns = [];
var backgroundModeEnabled = false;
var BACKGROUND_DONT_SHOW_KEY = "auto-all-background-dont-show";
var BACKGROUND_MODE_KEY = "auto-all-background-mode";
var VERSION_7_0_KEY = "auto-all-version-7.0-notification-shown";
var pollTimer;
var statsCollectionTimer;
var statusBarItem;
var outputChannel;
var currentIDE = "unknown";
var globalContext;
var cdpHandler;
var relauncher;
var hadCDPConnection = false;
var lastRelaunchPromptTime = 0;
var RELAUNCH_PROMPT_COOLDOWN = 6e4;
function log(message) {
  try {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[1].split(".")[0];
    const logLine = `[${timestamp}] ${message}`;
    console.log(logLine);
  } catch (e) {
    console.error("Logging failed:", e);
  }
}
function detectIDE() {
  const appName = vscode.env.appName || "";
  if (appName.toLowerCase().includes("cursor")) return "Cursor";
  if (appName.toLowerCase().includes("antigravity")) return "Antigravity";
  return "Code";
}
async function activate(context) {
  globalContext = context;
  console.log("auto-all-Antigravity: Activator called.");
  try {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = "auto-all.cycleState";
    statusBarItem.text = "$(sync~spin)";
    statusBarItem.tooltip = "auto-all-Antigravity: Loading...";
    context.subscriptions.push(statusBarItem);
    statusBarItem.show();
    console.log("auto-all-Antigravity: Status bar items created and shown.");
  } catch (sbError) {
    console.error("CRITICAL: Failed to create status bar items:", sbError);
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
      "rm -rf /",
      "rm -rf ~",
      "rm -rf *",
      "format c:",
      "del /f /s /q",
      "rmdir /s /q",
      ":(){:|:&};:",
      "dd if=",
      "mkfs.",
      "> /dev/sda",
      "chmod -R 777 /"
    ];
    bannedCommands = context.globalState.get(BANNED_COMMANDS_KEY, defaultBannedCommands);
    currentIDE = detectIDE();
    outputChannel = vscode.window.createOutputChannel("auto-all-Antigravity");
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
      const { CDPHandler } = require_cdp_handler();
      const { Relauncher, BASE_CDP_PORT } = require_relauncher();
      cdpHandler = new CDPHandler(BASE_CDP_PORT, BASE_CDP_PORT + 10, log);
      if (cdpHandler.setProStatus) {
        cdpHandler.setProStatus(isPro);
      }
      try {
        const logPath = path.join(context.extensionPath, "auto-all-cdp.log");
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
    log("Status bar updated with current state.");
    context.subscriptions.push(
      vscode.commands.registerCommand("auto-all.toggle", () => handleToggle(context)),
      vscode.commands.registerCommand("auto-all.cycleState", () => handleCycleState(context)),
      vscode.commands.registerCommand("auto-all.relaunch", () => handleRelaunch()),
      vscode.commands.registerCommand("auto-all.updateFrequency", (freq) => handleFrequencyUpdate(context, freq)),
      vscode.commands.registerCommand("auto-all.toggleBackground", () => handleBackgroundToggle(context)),
      vscode.commands.registerCommand("auto-all.updateBannedCommands", (commands) => handleBannedCommandsUpdate(context, commands)),
      vscode.commands.registerCommand("auto-all.getBannedCommands", () => bannedCommands),
      vscode.commands.registerCommand("auto-all.updateAcceptPatterns", (patterns) => handleAcceptPatternsUpdate(context, patterns)),
      vscode.commands.registerCommand("auto-all.getAcceptPatterns", () => acceptPatterns),
      vscode.commands.registerCommand("auto-all.getROIStats", async () => {
        const stats = await loadROIStats(context);
        const timeSavedSeconds = stats.clicksThisWeek * SECONDS_PER_CLICK;
        const timeSavedMinutes = Math.round(timeSavedSeconds / 60);
        return {
          ...stats,
          timeSavedMinutes,
          timeSavedFormatted: timeSavedMinutes >= 60 ? `${(timeSavedMinutes / 60).toFixed(1)} hours` : `${timeSavedMinutes} minutes`
        };
      }),
      vscode.commands.registerCommand("auto-all.openSettings", () => {
        const panel = getSettingsPanel();
        if (panel) {
          panel.createOrShow(context.extensionUri, context);
        } else {
          vscode.window.showErrorMessage("Failed to load Settings Panel.");
        }
      })
    );
    try {
      await checkEnvironmentAndStart();
    } catch (err) {
      log(`Error in environment check: ${err.message}`);
    }
    showVersionNotification(context);
    log("auto-all-Antigravity: Activation complete");
  } catch (error) {
    console.error("ACTIVATION CRITICAL FAILURE:", error);
    log(`ACTIVATION CRITICAL FAILURE: ${error.message}`);
    vscode.window.showErrorMessage(`auto-all-Antigravity failed to activate: ${error.message}`);
  }
}
async function ensureCDPOrPrompt(showPrompt = false) {
  if (!cdpHandler) return;
  log("Checking for active CDP session...");
  const cdpAvailable = await cdpHandler.isCDPAvailable();
  log(`Environment check: CDP Available = ${cdpAvailable}`);
  if (cdpAvailable) {
    log("CDP is active and available.");
  } else {
    log("CDP not found on expected ports (9000-9030).");
    if (showPrompt && relauncher) {
      log("Prompting user for relaunch...");
      await relauncher.showRelaunchPrompt();
    } else {
      log("Skipping relaunch prompt (startup). User can click status bar to trigger.");
    }
  }
}
async function checkEnvironmentAndStart() {
  log("Initializing auto-all-Antigravity environment...");
  const cdpAvailable = cdpHandler ? await cdpHandler.isCDPAvailable() : false;
  log(`CDP availability check: ${cdpAvailable}`);
  if (!cdpAvailable && relauncher) {
    const lastAutoAttempt = globalContext.globalState.get("autoAll.lastAutoRelaunch", 0);
    const autoCooldown = 12e4;
    const now = Date.now();
    if (now - lastAutoAttempt < autoCooldown) {
      log("Auto-relaunch blocked by 2-minute cooldown to prevent infinite loops.");
      vscode.window.showWarningMessage("\u26A1 auto-all-Antigravity: Auto-restart prevented to avoid infinite loop. Please check terminal logs.");
    } else {
      await globalContext.globalState.update("autoAll.lastAutoRelaunch", now);
      log("CDP not available. Auto-relaunching with CDP enabled...");
      vscode.window.showInformationMessage("\u26A1 auto-all-Antigravity: Setting up CDP, restarting...");
      const result = await relauncher.relaunchWithCDP();
      if (result.success && result.action === "relaunched") {
        log("Relaunch initiated. Exiting current instance...");
        return;
      } else if (!result.success) {
        log(`Auto-relaunch failed: ${result.message}`);
      }
    }
  }
  if (isEnabled) {
    await startPolling();
    startStatsCollection(globalContext);
  }
  updateStatusBar();
}
async function handleToggle(context) {
  log("=== handleToggle CALLED ===");
  log(`  Previous isEnabled: ${isEnabled}`);
  try {
    isEnabled = !isEnabled;
    log(`  New isEnabled: ${isEnabled}`);
    await context.globalState.update(GLOBAL_STATE_KEY, isEnabled);
    log(`  GlobalState updated`);
    log("  Calling updateStatusBar...");
    updateStatusBar();
    if (isEnabled) {
      log("auto-all-Antigravity: Enabled");
      ensureCDPOrPrompt(true).then(() => startPolling());
      startStatsCollection(context);
      incrementSessionCount(context);
    } else {
      log("auto-all-Antigravity: Disabled");
      if (cdpHandler) {
        cdpHandler.getSessionSummary().then((summary) => showSessionSummaryNotification(context, summary)).catch(() => {
        });
      }
      collectAndSaveStats(context).catch(() => {
      });
      stopPolling().catch(() => {
      });
      hadCDPConnection = false;
    }
    log("=== handleToggle COMPLETE ===");
  } catch (e) {
    log(`Error toggling: ${e.message}`);
    log(`Error stack: ${e.stack}`);
  }
}
async function handleRelaunch() {
  if (!relauncher) {
    vscode.window.showErrorMessage("Relauncher not initialized.");
    return;
  }
  log("Initiating Relaunch...");
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
    log("Banned commands customization requires Pro");
    return;
  }
  bannedCommands = Array.isArray(commands) ? commands : [];
  await context.globalState.update(BANNED_COMMANDS_KEY, bannedCommands);
  log(`Banned commands updated: ${bannedCommands.length} patterns`);
  if (bannedCommands.length > 0) {
    log(`Banned patterns: ${bannedCommands.slice(0, 5).join(", ")}${bannedCommands.length > 5 ? "..." : ""}`);
  }
  if (isEnabled) {
    await syncSessions();
  }
}
async function handleAcceptPatternsUpdate(context, patterns) {
  acceptPatterns = Array.isArray(patterns) ? patterns : [];
  await context.globalState.update("auto-all-accept-patterns", acceptPatterns);
  log(`Accept patterns updated: ${acceptPatterns.length} patterns`);
  if (isEnabled) {
    await syncSessions();
  }
}
async function handleBackgroundToggle(context) {
  log("Background toggle clicked");
  if (!isPro) {
    vscode.window.showInformationMessage(
      "Background Mode is a Pro feature.",
      "Learn More"
    ).then((choice) => {
      if (choice === "Learn More") {
        const panel = getSettingsPanel();
        if (panel) panel.createOrShow(context.extensionUri, context);
      }
    });
    return;
  }
  const dontShowAgain = context.globalState.get(BACKGROUND_DONT_SHOW_KEY, false);
  if (!dontShowAgain && !backgroundModeEnabled) {
    const choice = await vscode.window.showInformationMessage(
      "Turn on Multi-Tab Mode?\n\nThis lets auto-all-Antigravity work on all your open conversation tabs at once. It will switch between tabs to click Accept for you.\n\nYou might see tabs change quickly while it works.",
      { modal: true },
      "Enable",
      "Don't Show Again & Enable",
      "Cancel"
    );
    if (choice === "Cancel" || !choice) {
      log("Background mode cancelled by user");
      return;
    }
    if (choice === "Don't Show Again & Enable") {
      await context.globalState.update(BACKGROUND_DONT_SHOW_KEY, true);
      log("Background mode: Dont show again set");
    }
    backgroundModeEnabled = true;
    await context.globalState.update(BACKGROUND_MODE_KEY, true);
    log("Background mode enabled");
  } else {
    backgroundModeEnabled = !backgroundModeEnabled;
    await context.globalState.update(BACKGROUND_MODE_KEY, backgroundModeEnabled);
    log(`Background mode toggled: ${backgroundModeEnabled}`);
    if (!backgroundModeEnabled && cdpHandler) {
      cdpHandler.hideBackgroundOverlay().catch(() => {
      });
    }
  }
  updateStatusBar();
  if (isEnabled) {
    syncSessions().catch(() => {
    });
  }
}
async function handleCycleState(context) {
  log("=== handleCycleState CALLED ===");
  log(`  Current state: isEnabled=${isEnabled}, backgroundModeEnabled=${backgroundModeEnabled}`);
  if (!isEnabled) {
    isEnabled = true;
    backgroundModeEnabled = false;
    await context.globalState.update(GLOBAL_STATE_KEY, true);
    await context.globalState.update(BACKGROUND_MODE_KEY, false);
    log("  Cycled to: ON + Single Tab");
    ensureCDPOrPrompt(true).then(() => startPolling());
    startStatsCollection(context);
    incrementSessionCount(context);
  } else if (!backgroundModeEnabled) {
    backgroundModeEnabled = true;
    await context.globalState.update(BACKGROUND_MODE_KEY, true);
    log("  Cycled to: ON + Multi-Tab");
    if (isEnabled) {
      syncSessions().catch(() => {
      });
    }
  } else {
    isEnabled = false;
    backgroundModeEnabled = false;
    await context.globalState.update(GLOBAL_STATE_KEY, false);
    await context.globalState.update(BACKGROUND_MODE_KEY, false);
    log("  Cycled to: OFF");
    if (cdpHandler) {
      cdpHandler.getSessionSummary().then((summary) => showSessionSummaryNotification(context, summary)).catch(() => {
      });
      cdpHandler.hideBackgroundOverlay().catch(() => {
      });
    }
    collectAndSaveStats(context).catch(() => {
    });
    stopPolling().catch(() => {
    });
    hadCDPConnection = false;
  }
  updateStatusBar();
  log("=== handleCycleState COMPLETE ===");
}
async function syncSessions() {
  if (cdpHandler && !isLockedOut) {
    log(`CDP: Syncing sessions (Mode: ${backgroundModeEnabled ? "Background" : "Simple"})...`);
    try {
      await cdpHandler.start({
        isPro,
        isBackgroundMode: backgroundModeEnabled,
        pollInterval: pollFrequency,
        ide: currentIDE,
        bannedCommands,
        acceptPatterns
      });
      const connectionCount = cdpHandler.getConnectionCount();
      if (connectionCount > 0) {
        hadCDPConnection = true;
      } else if (hadCDPConnection && isEnabled) {
        const now = Date.now();
        if (now - lastRelaunchPromptTime > RELAUNCH_PROMPT_COOLDOWN) {
          lastRelaunchPromptTime = now;
          log("CDP connection lost! Antigravity may have restarted. Prompting for relaunch...");
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
  log("auto-all-Antigravity: Monitoring session...");
  await syncSessions();
  pollTimer = setInterval(async () => {
    if (!isEnabled) return;
    const lockKey = `${currentIDE.toLowerCase()}-instance-lock`;
    const activeInstance = globalContext.globalState.get(lockKey);
    const myId = globalContext.extension.id;
    if (activeInstance && activeInstance !== myId) {
      const lastPing = globalContext.globalState.get(`${lockKey}-ping`);
      if (lastPing && Date.now() - lastPing < 15e3) {
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
      log("CDP Control: Lock acquired. Resuming control.");
      isLockedOut = false;
      updateStatusBar();
    }
    await syncSessions();
  }, 5e3);
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
  log("auto-all-Antigravity: Polling stopped");
}
function getWeekStart() {
  const now = /* @__PURE__ */ new Date();
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
  const message = `\u{1F4CA} Last week, auto-all-Antigravity saved you ${timeStr} by auto-clicking ${lastWeekStats.clicksThisWeek} buttons!`;
  let detail = "";
  if (lastWeekStats.sessionsThisWeek > 0) {
    detail += `Recovered ${lastWeekStats.sessionsThisWeek} stuck sessions. `;
  }
  if (lastWeekStats.blockedThisWeek > 0) {
    detail += `Blocked ${lastWeekStats.blockedThisWeek} dangerous commands.`;
  }
  const choice = await vscode.window.showInformationMessage(
    message,
    { detail: detail.trim() || void 0 },
    "View Details"
  );
  if (choice === "View Details") {
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
    `\u2705 This session:`,
    `\u2022 ${summary.clicks} actions auto-alled`,
    `\u2022 ${summary.terminalCommands} terminal commands`,
    `\u2022 ${summary.fileEdits} file edits`,
    `\u2022 ${summary.blocked} interruptions blocked`
  ];
  if (summary.estimatedTimeSaved) {
    lines.push(`
\u23F1 Estimated time saved: ~${summary.estimatedTimeSaved} minutes`);
  }
  const message = lines.join("\n");
  vscode.window.showInformationMessage(
    `\u{1F916} auto-all-Antigravity: ${summary.clicks} actions handled this session`,
    { detail: message },
    "View Stats"
  ).then((choice) => {
    if (choice === "View Stats") {
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
  const message = `\u{1F680} auto-all-Antigravity handled ${actionsCount} action${actionsCount > 1 ? "s" : ""} while you were away.`;
  const detail = `Agents stayed autonomous while you focused elsewhere.`;
  vscode.window.showInformationMessage(
    message,
    { detail },
    "View Dashboard"
  ).then((choice) => {
    if (choice === "View Dashboard") {
      const panel = getSettingsPanel();
      if (panel) panel.createOrShow(context.extensionUri, context);
    }
  });
}
var lastAwayCheck = Date.now();
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
  }, 3e4);
  log("ROI Stats: Collection started (every 30s)");
}
function updateStatusBar() {
  if (!statusBarItem) return;
  const createTooltip = (state, action) => {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.appendMarkdown(`**auto-all-Antigravity:** ${state}

`);
    md.appendMarkdown(`\u2192 ${action}

`);
    md.appendMarkdown(`[\u2699\uFE0F Open Settings](command:auto-all.openSettings)`);
    return md;
  };
  if (!isEnabled) {
    statusBarItem.text = "$(zap) OFF";
    statusBarItem.tooltip = createTooltip("OFF", "Click to enable (Single Tab)");
  } else if (!backgroundModeEnabled) {
    statusBarItem.text = "\u26A1 ON";
    statusBarItem.tooltip = createTooltip("ON (Single Tab)", "Click for Multi-Tab mode");
  } else {
    statusBarItem.text = "\u26A1 Multi";
    statusBarItem.tooltip = createTooltip("ON (Multi-Tab)", "Click to disable");
  }
}
async function showVersionNotification(context) {
  const hasShown = context.globalState.get(VERSION_7_0_KEY, false);
  if (hasShown) return;
  const title = "\u{1F680} Welcome to AUTO ALL AntiGravity!";
  const body = `All Pro Features Unlocked. Free Forever.

\u2705 Multi-Tab Mode \u2014 Run multiple conversations in parallel, auto-alls in all tabs.

\u26A1 Instant Polling \u2014 Fastest possible response time for auto-alling.

\u{1F6E1}\uFE0F Dangerous Command Blocking \u2014 Built-in protection with customizable blocklist.

\u{1F4CA} Session Insights \u2014 Track auto-alls, time saved, and blocked commands.

\u2615 Support development: ko-fi.com/ai_dev_2024`;
  const btnDashboard = "View Dashboard";
  const btnGotIt = "Let's Go!";
  await context.globalState.update(VERSION_7_0_KEY, true);
  const selection = await vscode.window.showInformationMessage(
    `${title}

${body}`,
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
