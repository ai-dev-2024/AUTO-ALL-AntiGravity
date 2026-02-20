const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG_PREFIX = '[CDP]';

class CDPHandler {
    constructor(startPort = 9000, endPort = 9030, logger = console.log) {
        this.startPort = startPort;
        this.endPort = endPort;
        this.logger = logger;
        this.connections = new Map();
        this.messageId = 1;
        this.pendingMessages = new Map();
        this.isEnabled = false;
        this.isPro = false;
        this.logFilePath = null;
    }

    setLogFile(filePath) {
        this.logFilePath = filePath;
        if (filePath) {
            fs.writeFileSync(filePath, `[${new Date().toISOString()}] CDP Log Initialized\n`);
        }
    }

    log(...args) {
        const msg = `${LOG_PREFIX} ${args.join(' ')}`;
        if (this.logger) this.logger(msg);
    }

    setProStatus(isPro) {
        this.isPro = isPro;
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
            } catch (e) { }
        }
        return instances;
    }

    getPages(port) {
        return new Promise((resolve, reject) => {
            const req = http.get({ hostname: '127.0.0.1', port, path: '/json/list', timeout: 1000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(data).filter(p => p.webSocketDebuggerUrl)); }
                    catch (e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
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
                this.sendCommand(pageId, 'Runtime.evaluate', {
                    expression: 'if(typeof window !== "undefined" && window.__autoAllStop) window.__autoAllStop()'
                }).catch(() => { })
            );
        }

        await Promise.allSettled(stopPromises);
        this.disconnectAll();
    }

    async connectToPage(page) {
        return new Promise((resolve) => {
            const ws = new WebSocket(page.webSocketDebuggerUrl);
            ws.on('open', () => {
                this.connections.set(page.id, { ws, injected: false });
                resolve(true);
            });
            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.id && this.pendingMessages.has(msg.id)) {
                        const { resolve: res, reject: rej } = this.pendingMessages.get(msg.id);
                        this.pendingMessages.delete(msg.id);
                        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
                    }
                } catch (e) { }
            });
            ws.on('error', (err) => {
                this.log(`WS Error on ${page.id}: ${err.message}`);
                this.connections.delete(page.id);
                resolve(false);
            });
            ws.on('close', () => {
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
                const result = await this.sendCommand(pageId, 'Runtime.evaluate', {
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
                const res = await this.sendCommand(pageId, 'Runtime.evaluate', {
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
        const scriptPath = path.join(__dirname, '..', 'main_scripts', 'full_cdp_script.js');
        return fs.readFileSync(scriptPath, 'utf8');
    }

    sendCommand(pageId, method, params = {}) {
        const conn = this.connections.get(pageId);
        if (!conn || conn.ws.readyState !== WebSocket.OPEN) return Promise.reject('dead');
        const id = this.messageId++;
        return new Promise((resolve, reject) => {
            this.pendingMessages.set(id, { resolve, reject });
            conn.ws.send(JSON.stringify({ id, method, params }));
            setTimeout(() => {
                if (this.pendingMessages.has(id)) {
                    this.pendingMessages.delete(id);
                    reject(new Error('timeout'));
                }
            }, 2000);
        });
    }

    async hideBackgroundOverlay() {
        for (const [pageId] of this.connections) {
            try {
                await this.sendCommand(pageId, 'Runtime.evaluate', {
                    expression: 'if(typeof window !== "undefined" && typeof hideOverlay === "function") hideOverlay()'
                });
            } catch (e) { }
        }
    }

    async getStats() {
        const aggregatedStats = { clicks: 0, blocked: 0, fileEdits: 0, terminalCommands: 0, actionsWhileAway: 0 };

        for (const [pageId] of this.connections) {
            try {
                const result = await this.sendCommand(pageId, 'Runtime.evaluate', {
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
                const result = await this.sendCommand(pageId, 'Runtime.evaluate', {
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
                const result = await this.sendCommand(pageId, 'Runtime.evaluate', {
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
            } catch (e) { }
        }

        const baseSecs = summary.clicks * 5;
        const minMins = Math.max(1, Math.floor((baseSecs * 0.8) / 60));
        const maxMins = Math.ceil((baseSecs * 1.2) / 60);
        summary.estimatedTimeSaved = summary.clicks > 0 ? `${minMins}–${maxMins}` : null;

        return summary;
    }

    async getAwayActions() {
        let total = 0;

        for (const [pageId] of this.connections) {
            try {
                const result = await this.sendCommand(pageId, 'Runtime.evaluate', {
                    expression: '(function(){ if(typeof window !== "undefined" && window.__autoAllGetAwayActions) return window.__autoAllGetAwayActions(); return 0; })()',
                    returnByValue: true
                });

                if (result.result?.value) {
                    total += parseInt(result.result.value) || 0;
                }
            } catch (e) { }
        }

        return total;
    }

    async setFocusState(isFocused) {
        for (const [pageId] of this.connections) {
            try {
                await this.sendCommand(pageId, 'Runtime.evaluate', {
                    expression: `(function(){ 
                        if(typeof window !== "undefined" && window.__autoAllSetFocusState) {
                            window.__autoAllSetFocusState(${isFocused});
                        }
                    })()`
                });
            } catch (e) { }
        }
        this.log(`Focus state pushed to all pages: ${isFocused}`);
    }

    getConnectionCount() { return this.connections.size; }
    disconnectAll() {
        for (const [, conn] of this.connections) try { conn.ws.close(); } catch (e) { }
        this.connections.clear();
    }
}

module.exports = { CDPHandler };
