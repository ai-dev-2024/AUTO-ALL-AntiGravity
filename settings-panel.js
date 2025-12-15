/**
 * Settings Panel
 * Webview panel for frequency adjustment and usage analytics
 * Pro features: Frequency slider, Analytics view
 */

const vscode = require('vscode');

const CHECKOUT_URL = 'https://buy.stripe.com/cNi7sL02BcybgHBats9MY0q';
const LICENSE_API = 'https://auto-accept-backend.onrender.com/api';

class SettingsPanel {
    static currentPanel = undefined;
    static viewType = 'autoAcceptSettings';

    constructor(panel, extensionUri, context) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.context = context;
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
                    case 'resetStats':
                        if (this.isPro()) {
                            await this.context.globalState.update('auto-accept-stats', {
                                clicks: 0,
                                sessions: 0,
                                lastSession: null
                            });
                            this.sendStats();
                        }
                        break;
                    case 'upgrade':
                        this.openUpgrade();
                        break;
                }
            },
            null,
            this.disposables
        );
    }

    isPro() {
        return this.context.globalState.get('auto-accept-isPro', false);
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

    openUpgrade() {
        const userId = this.getUserId();
        const url = `${CHECKOUT_URL}?client_reference_id=${userId}`;
        vscode.env.openExternal(vscode.Uri.parse(url));
    }

    static createOrShow(extensionUri, context) {
        const column = vscode.ViewColumn.Beside;

        if (SettingsPanel.currentPanel) {
            SettingsPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            SettingsPanel.viewType,
            'Auto Accept',
            column,
            { enableScripts: true }
        );

        SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri, context);
    }

    sendStats() {
        const stats = this.context.globalState.get('auto-accept-stats', {
            clicks: 0,
            sessions: 0,
            lastSession: null
        });
        const frequency = this.context.globalState.get('auto-accept-frequency', 1000);
        const isPro = this.isPro();

        this.panel.webview.postMessage({
            command: 'updateStats',
            stats,
            frequency,
            isPro
        });
    }

    update() {
        this.panel.webview.html = this.getHtmlContent();
        setTimeout(() => this.sendStats(), 100);
    }

    getHtmlContent() {
        const isPro = this.isPro();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auto Accept</title>
    <style>
        :root {
            --bg-color: #050505;
            --card-bg: #0f0f0f;
            --border-color: #222;
            --accent-color: #9333ea;
            --accent-glow: rgba(147, 51, 234, 0.4);
            --text-primary: #ffffff;
            --text-secondary: #888;
            --success: #22c55e;
            --font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--font-family);
            background: var(--bg-color);
            color: var(--text-primary);
            padding: 32px 24px;
            min-height: 100vh;
            display: flex;
            justify-content: center;
        }
        
        .container {
            width: 100%;
            max-width: 420px;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }
        
        /* HEADER */
        .header {
            margin-bottom: 8px;
        }

        h1 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 10px;
            letter-spacing: -0.5px;
        }
        
        .pro-badge {
            background: linear-gradient(135deg, #a855f7, #7c3aed);
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 700;
            letter-spacing: 0.5px;
            box-shadow: 0 0 10px var(--accent-glow);
        }
        
        .subtitle {
            color: var(--text-secondary);
            font-size: 13px;
        }
        
        /* UPGRADE CARD */
        .upgrade-card {
            background: linear-gradient(145deg, #111, #0a0a0a);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .upgrade-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
            opacity: 0.5;
        }

        .upgrade-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 50px -12px rgba(147, 51, 234, 0.15);
            border-color: #333;
        }
        
        .upgrade-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 6px;
            background: linear-gradient(to right, #fff, #ccc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .upgrade-desc {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 20px;
        }
        
        .feature-list {
            text-align: left;
            margin: 0 auto 24px;
            font-size: 13px;
            color: #ccc;
            display: inline-block;
        }
        
        .feature-list li {
            margin: 10px 0;
            list-style: none;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .check-icon {
            color: var(--accent-color);
            font-weight: bold;
            font-size: 14px;
        }

        .highlight {
            color: #fff;
            font-weight: 500;
        }
        
        /* BUTTONS */
        .btn-primary {
            background: var(--accent-color);
            border: none;
            color: white;
            padding: 14px 0;
            width: 100%;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 15px var(--accent-glow);
        }
        
        .btn-primary:hover {
            background: #a855f7;
            transform: translateY(-1px);
            box-shadow: 0 6px 20px var(--accent-glow);
        }

        .btn-secondary {
            background: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 16px;
        }

        .btn-secondary:hover {
            border-color: var(--text-primary);
            color: var(--text-primary);
        }
        
        .subtext {
            font-size: 11px;
            color: #555;
            margin-top: 10px;
        }
        
        /* SECTIONS */
        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .section-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
            color: #555;
        }
        
        .pro-tag {
            background: #222;
            color: var(--accent-color);
            font-size: 9px;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 700;
            letter-spacing: 0.5px;
            border: 1px solid #333;
        }
        
        .card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 20px;
        }
        
        /* SLIDER */
        .locked {
            opacity: 0.4;
            pointer-events: none;
            position: relative;
            filter: grayscale(0.8);
        }
        
        .lock-overlay {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            width: 40px; height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            border: 1px solid #333;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            z-index: 10;
        }

        .metric-value {
            font-size: 36px;
            font-weight: 300;
            color: var(--accent-color);
            margin-bottom: 16px;
            letter-spacing: -1px;
        }
        
        .metric-value span {
            font-size: 14px;
            color: var(--text-secondary);
            margin-left: 6px;
            font-weight: 400;
        }
        
        input[type="range"] {
            width: 100%;
            height: 4px;
            background: #333;
            border-radius: 2px;
            outline: none;
            -webkit-appearance: none;
            cursor: pointer;
        }
        
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            background: var(--text-primary);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(255,255,255,0.3);
            border: 2px solid var(--bg-color);
        }
        
        .range-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            font-size: 11px;
            color: #444;
            font-weight: 500;
        }
        
        /* ANALYTICS */
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        
        .stat-box {
            background: #141414;
            border-radius: 10px;
            padding: 16px;
            border: 1px solid #222;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .stat-label {
            font-size: 11px;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
        }
        
        .stat-number {
            font-size: 24px;
            font-weight: 600;
            color: #fff;
        }
        
        .stat-box.primary .stat-number {
            color: var(--accent-color);
        }
        
        .footer {
            margin-top: 32px;
            text-align: center;
            font-size: 11px;
            color: #333;
            font-weight: 500;
        }

        .user-id {
            color: #222;
            font-size: 10px;
            margin-top: 8px;
            cursor: pointer;
            transition: color 0.2s;
        }
        .user-id:hover { color: #555; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>Auto Accept ${isPro ? '<span class="pro-badge">PRO</span>' : ''}</h1>
            <div class="subtitle">Automate your AI workflow</div>
        </div>
        
        <!-- Upgrade Card -->
        ${!isPro ? `
        <div class="upgrade-card">
            <div class="upgrade-title">Level Up Your Workflow</div>
            <div class="upgrade-desc">Let AI work while you're away</div>
            
            <ul class="feature-list">
                <li><span class="check-icon">✓</span> <span class="highlight">Background operation</span> - works unfocused</li>
                <li><span class="check-icon">✓</span> Run multiple instances simultaneously</li>
                <li><span class="check-icon">✓</span> Adjust polling speed</li>
                <li><span class="check-icon">✓</span> Track time saved analytics</li>
            </ul>
            
            <button class="btn-primary" id="upgradeBtn">Unlock Lifetime Access - $4.99</button>
            <div class="subtext">One-time payment • Forever access</div>
        </div>
        ` : ''}
        
        <!-- Frequency Section -->
        <div>
            <div class="section-header">
                <span class="section-title">Polling Speed</span>
                ${!isPro ? '<span class="pro-tag">PRO</span>' : ''}
            </div>
            
            <div class="card ${!isPro ? 'locked' : ''}">
                ${!isPro ? '<div class="lock-overlay">🔒</div>' : ''}
                
                <div class="metric-value" id="frequencyValue">1.0<span>sec</span></div>
                <input type="range" id="frequencySlider" min="200" max="3000" step="100" value="1000" ${!isPro ? 'disabled' : ''}>
                <div class="range-labels">
                    <span>Fast (0.2s)</span>
                    <span>Slow (3.0s)</span>
                </div>
            </div>
        </div>
        
        <!-- Analytics Section -->
        <div>
            <div class="section-header">
                <span class="section-title">Impact</span>
                ${!isPro ? '<span class="pro-tag">PRO</span>' : ''}
            </div>
            
            <div class="${!isPro ? 'locked' : ''}">
                ${!isPro ? '<div class="lock-overlay" style="z-index:11">🔒</div>' : ''}
                
                <div class="stats-grid">
                    <div class="stat-box primary">
                        <div class="stat-number" id="clickCount">${isPro ? '0' : '—'}</div>
                        <div class="stat-label">Clicks</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-number" id="sessionCount">${isPro ? '0' : '—'}</div>
                        <div class="stat-label">Sessions</div>
                    </div>
                </div>
                
                ${isPro ? '<button class="btn-secondary" id="resetBtn">Reset Data</button>' : ''}
            </div>
        </div>
        
        <div class="footer">
            <div>Auto Accept Agent v2.9.5</div>
            <div class="user-id" id="userId" title="Click to copy">ID: ${this.getUserId()}</div>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const isPro = ${isPro};
        
        const slider = document.getElementById('frequencySlider');
        const valueDisplay = document.getElementById('frequencyValue');
        const clickCount = document.getElementById('clickCount');
        const sessionCount = document.getElementById('sessionCount');
        const btnText = document.getElementById('upgradeBtn');
        const userIdEl = document.getElementById('userId');

        if (userIdEl) {
            userIdEl.addEventListener('click', () => {
                const text = userIdEl.textContent.replace('ID: ', '');
                navigator.clipboard.writeText(text);
                userIdEl.textContent = 'Copied!';
                setTimeout(() => userIdEl.textContent = 'ID: ' + text, 1500);
            });
        }
        
        if (isPro && slider) {
            slider.addEventListener('input', (e) => {
                const ms = parseInt(e.target.value);
                valueDisplay.innerHTML = (ms / 1000).toFixed(1) + '<span>sec</span>';
                vscode.postMessage({ command: 'setFrequency', value: ms });
            });
        }
        
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'resetStats' });
            });
        }
        
        const upgradeBtn = document.getElementById('upgradeBtn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'upgrade' });
            });
        }
        
        window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.command === 'updateStats' && message.isPro) {
                clickCount.textContent = message.stats.clicks || 0;
                sessionCount.textContent = message.stats.sessions || 0;
                if (slider) {
                    slider.value = message.frequency;
                    valueDisplay.innerHTML = (message.frequency / 1000).toFixed(1) + '<span>sec</span>';
                }
            }
        });
        
        vscode.postMessage({ command: 'getStats' });
    </script>
</body>
</html>`;
    }

    dispose() {
        SettingsPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const d = this.disposables.pop();
            if (d) d.dispose();
        }
    }
}

module.exports = { SettingsPanel };
