/**
 * Cursor CDP Handler
 * Manages CDP connections and TRIGGERED (not auto-running) script injection.
 * Pro feature: Background operation (continues when unfocused)
 */

const WebSocket = require('ws');
const http = require('http');

const CDP_PORT_START = 9222;
const CDP_PORT_END = 9232;

// PASSIVE script - does NOT auto-start, only responds to forceClick()
const CLICKER_SCRIPT = `
(function() {
    'use strict';
    
    if (window.__autoAcceptCDP) {
        return { status: 'already_loaded' };
    }
    
    let clickCount = 0;
    
    const ACCEPT_PATTERNS = ['accept all', 'accept', 'keep all', 'run command', 'run', 'apply all', 'apply', 'confirm'];
    const EXCLUDE_PATTERNS = ['skip', 'cancel', 'reject', 'discard', 'deny', 'close'];
    
    function findButtonByText(searchText) {
        const all = document.querySelectorAll('button, [role="button"], .monaco-button');
        const matches = [];
        for (let i = 0; i < all.length; i++) {
            const el = all[i];
            const text = el.textContent.trim().toLowerCase();
            if (text.length > 50) continue;
            if (EXCLUDE_PATTERNS.some(p => text === p || text.includes(p))) continue;
            if (text === searchText.toLowerCase() || text.startsWith(searchText.toLowerCase())) {
                matches.push(el);
            }
        }
        return matches;
    }
    
    function clickElement(el) {
        try {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
                el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
                el.click();
                el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
                el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
                return true;
            }
        } catch (e) {}
        return false;
    }
    
    function isVisible(el) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) >= 0.1;
    }
    
    // Single click attempt - called by extension
    function doClick() {
        let clicked = false;
        for (const pattern of ACCEPT_PATTERNS) {
            const matches = findButtonByText(pattern);
            for (const el of matches) {
                if (isVisible(el)) {
                    if (clickElement(el)) {
                        clickCount++;
                        clicked = true;
                    }
                }
            }
        }
        return clicked;
    }
    
    // PASSIVE: Only exposes forceClick, no auto-polling
    window.__autoAcceptCDP = {
        forceClick: function() { 
            const clicked = doClick();
            return { clicked, total: clickCount }; 
        },
        getStats: function() {
            return { clicks: clickCount };
        }
    };
    
    return { status: 'loaded' };
})();
`;

class CursorCDPHandler {
    constructor() {
        this.name = 'CursorCDP';
        this.connections = new Map();
        this.messageId = 1;
        this.pendingMessages = new Map();
        this.reconnectTimer = null;
        this.isEnabled = false;
    }

    async scanForInstances() {
        const instances = [];

        for (let port = CDP_PORT_START; port <= CDP_PORT_END; port++) {
            try {
                const pages = await this.getPages(port);
                if (pages && pages.length > 0) {
                    instances.push({ port, pages });
                }
            } catch (e) { }
        }

        return instances;
    }

    async getPages(port) {
        return new Promise((resolve, reject) => {
            const req = http.get({
                hostname: '127.0.0.1',
                port,
                path: '/json/list',
                timeout: 1000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const pages = JSON.parse(data);
                        resolve(pages.filter(p => p.webSocketDebuggerUrl));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        });
    }

    async isCDPAvailable() {
        const instances = await this.scanForInstances();
        return instances.length > 0;
    }

    async start() {
        this.isEnabled = true;
        const connected = await this.discoverAndConnect();

        if (!this.reconnectTimer) {
            this.reconnectTimer = setInterval(() => {
                if (this.isEnabled) {
                    this.discoverAndConnect().catch(() => { });
                }
            }, 10000);
        }

        return connected;
    }

    async stop() {
        this.isEnabled = false;
        if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.disconnectAll();
    }

    async discoverAndConnect() {
        const instances = await this.scanForInstances();
        let connected = 0;

        for (const instance of instances) {
            for (const page of instance.pages) {
                if (!this.connections.has(page.id)) {
                    const success = await this.connectToPage(page);
                    if (success) connected++;
                }
            }
        }

        return connected > 0 || this.connections.size > 0;
    }

    async connectToPage(page) {
        return new Promise((resolve) => {
            try {
                const ws = new WebSocket(page.webSocketDebuggerUrl);
                let resolved = false;

                ws.on('open', async () => {
                    console.log(`CursorCDP: Connected to ${page.id}`);
                    this.connections.set(page.id, { ws, injected: false });

                    try {
                        await this.injectScript(page.id);
                    } catch (e) { }

                    if (!resolved) { resolved = true; resolve(true); }
                });

                ws.on('message', (data) => {
                    try {
                        const msg = JSON.parse(data.toString());
                        if (msg.id && this.pendingMessages.has(msg.id)) {
                            const { resolve, reject } = this.pendingMessages.get(msg.id);
                            this.pendingMessages.delete(msg.id);
                            msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
                        }
                    } catch (e) { }
                });

                ws.on('error', () => {
                    this.connections.delete(page.id);
                    if (!resolved) { resolved = true; resolve(false); }
                });

                ws.on('close', () => {
                    this.connections.delete(page.id);
                    if (!resolved) { resolved = true; resolve(false); }
                });

                setTimeout(() => {
                    if (!resolved) { resolved = true; resolve(false); }
                }, 5000);

            } catch (e) {
                resolve(false);
            }
        });
    }

    async sendCommand(pageId, method, params = {}) {
        const conn = this.connections.get(pageId);
        if (!conn || conn.ws.readyState !== WebSocket.OPEN) {
            throw new Error('Not connected');
        }

        const id = this.messageId++;

        return new Promise((resolve, reject) => {
            this.pendingMessages.set(id, { resolve, reject });
            conn.ws.send(JSON.stringify({ id, method, params }));
            setTimeout(() => {
                if (this.pendingMessages.has(id)) {
                    this.pendingMessages.delete(id);
                    reject(new Error('Timeout'));
                }
            }, 5000);
        });
    }

    async injectScript(pageId) {
        await this.sendCommand(pageId, 'Runtime.evaluate', {
            expression: CLICKER_SCRIPT,
            returnByValue: true
        });
        const conn = this.connections.get(pageId);
        if (conn) conn.injected = true;
    }

    /**
     * Trigger click on all connected pages
     * Called by extension - extension decides when to call based on Pro/focus status
     */
    async executeAccept() {
        let totalClicked = 0;

        for (const [pageId, conn] of this.connections) {
            if (conn.ws.readyState !== WebSocket.OPEN) continue;

            try {
                // Ensure script is injected
                if (!conn.injected) {
                    await this.injectScript(pageId);
                }

                // Trigger forceClick
                const result = await this.sendCommand(pageId, 'Runtime.evaluate', {
                    expression: 'window.__autoAcceptCDP ? window.__autoAcceptCDP.forceClick() : { clicked: false }',
                    returnByValue: true
                });

                if (result?.result?.value?.clicked) {
                    totalClicked++;
                }
            } catch (e) { }
        }

        return { executed: totalClicked };
    }

    getConnectionCount() {
        return this.connections.size;
    }

    disconnectAll() {
        for (const [, conn] of this.connections) {
            try { conn.ws.close(); } catch (e) { }
        }
        this.connections.clear();
    }
}

module.exports = { CursorCDPHandler };
