
(function () {
    "use strict";

    if (typeof window === 'undefined') return;

    const Analytics = (function () {

        const TERMINAL_KEYWORDS = ['run', 'execute', 'command', 'terminal'];
        const SECONDS_PER_CLICK = 5;
        const TIME_VARIANCE = 0.2;

        const ActionType = {
            FILE_EDIT: 'file_edit',
            TERMINAL_COMMAND: 'terminal_command'
        };

        function createDefaultStats() {
            return {
                clicksThisSession: 0,
                blockedThisSession: 0,
                sessionStartTime: null,
                fileEditsThisSession: 0,
                terminalCommandsThisSession: 0,
                actionsWhileAway: 0,
                isWindowFocused: true,
                lastConversationUrl: null,
                lastConversationStats: null
            };
        }

        function getStats() {
            return window.__autoAllState?.stats || createDefaultStats();
        }

        function getStatsMutable() {
            return window.__autoAllState.stats;
        }

        function categorizeClick(buttonText) {
            const text = (buttonText || '').toLowerCase();
            for (const keyword of TERMINAL_KEYWORDS) {
                if (text.includes(keyword)) return ActionType.TERMINAL_COMMAND;
            }
            return ActionType.FILE_EDIT;
        }

        function trackClick(buttonText, log) {
            const stats = getStatsMutable();
            stats.clicksThisSession++;
            log(`[Stats] Click tracked. Total: ${stats.clicksThisSession}`);

            const category = categorizeClick(buttonText);
            if (category === ActionType.TERMINAL_COMMAND) {
                stats.terminalCommandsThisSession++;
                log(`[Stats] Terminal command. Total: ${stats.terminalCommandsThisSession}`);
            } else {
                stats.fileEditsThisSession++;
                log(`[Stats] File edit. Total: ${stats.fileEditsThisSession}`);
            }

            let isAway = false;
            if (!stats.isWindowFocused) {
                stats.actionsWhileAway++;
                isAway = true;
                log(`[Stats] Away action. Total away: ${stats.actionsWhileAway}`);
            }

            return { category, isAway, totalClicks: stats.clicksThisSession };
        }

        function trackBlocked(log) {
            const stats = getStatsMutable();
            stats.blockedThisSession++;
            log(`[Stats] Blocked. Total: ${stats.blockedThisSession}`);
        }

        function collectROI(log) {
            const stats = getStatsMutable();
            const collected = {
                clicks: stats.clicksThisSession || 0,
                blocked: stats.blockedThisSession || 0,
                sessionStart: stats.sessionStartTime
            };
            log(`[ROI] Collected: ${collected.clicks} clicks, ${collected.blocked} blocked`);
            stats.clicksThisSession = 0;
            stats.blockedThisSession = 0;
            stats.sessionStartTime = Date.now();
            return collected;
        }

        function getSessionSummary() {
            const stats = getStats();
            const clicks = stats.clicksThisSession || 0;
            const baseSecs = clicks * SECONDS_PER_CLICK;
            const minMins = Math.max(1, Math.floor((baseSecs * (1 - TIME_VARIANCE)) / 60));
            const maxMins = Math.ceil((baseSecs * (1 + TIME_VARIANCE)) / 60);

            return {
                clicks,
                fileEdits: stats.fileEditsThisSession || 0,
                terminalCommands: stats.terminalCommandsThisSession || 0,
                blocked: stats.blockedThisSession || 0,
                estimatedTimeSaved: clicks > 0 ? `${minMins}–${maxMins} minutes` : null
            };
        }

        function consumeAwayActions(log) {
            const stats = getStatsMutable();
            const count = stats.actionsWhileAway || 0;
            log(`[Away] Consuming away actions: ${count}`);
            stats.actionsWhileAway = 0;
            return count;
        }

        function isUserAway() {
            return !getStats().isWindowFocused;
        }

        function initializeFocusState(log) {
            const state = window.__autoAllState;
            if (state && state.stats) {

                state.stats.isWindowFocused = true;
                log('[Focus] Initialized (awaiting extension sync)');
            }
        }

        function initialize(log) {
            if (!window.__autoAllState) {
                window.__autoAllState = {
                    isRunning: false,
                    tabNames: [],
                    completionStatus: {},
                    sessionID: 0,
                    currentMode: null,
                    startTimes: {},
                    bannedCommands: [],
                    isPro: false,
                    stats: createDefaultStats()
                };
                log('[Analytics] State initialized');
            } else if (!window.__autoAllState.stats) {
                window.__autoAllState.stats = createDefaultStats();
                log('[Analytics] Stats added to existing state');
            } else {
                const s = window.__autoAllState.stats;
                if (s.actionsWhileAway === undefined) s.actionsWhileAway = 0;
                if (s.isWindowFocused === undefined) s.isWindowFocused = true;
                if (s.fileEditsThisSession === undefined) s.fileEditsThisSession = 0;
                if (s.terminalCommandsThisSession === undefined) s.terminalCommandsThisSession = 0;
            }

            initializeFocusState(log);

            if (!window.__autoAllState.stats.sessionStartTime) {
                window.__autoAllState.stats.sessionStartTime = Date.now();
            }

            log('[Analytics] Initialized');
        }

        function setFocusState(isFocused, log) {
            const state = window.__autoAllState;
            if (!state || !state.stats) return;

            const wasAway = !state.stats.isWindowFocused;
            state.stats.isWindowFocused = isFocused;

            if (log) {
                log(`[Focus] Extension sync: focused=${isFocused}, wasAway=${wasAway}`);
            }
        }

        return {
            initialize,
            trackClick,
            trackBlocked,
            categorizeClick,
            ActionType,
            collectROI,
            getSessionSummary,
            consumeAwayActions,
            isUserAway,
            getStats,
            setFocusState
        };
    })();

    const log = (msg, isSuccess = false) => {

        console.log(`[autoAll] ${msg}`);
    };

    Analytics.initialize(log);

    const timerWorkerCode = `
        self.onmessage = function(e) {
            setTimeout(function() {
                self.postMessage({ id: e.data.id });
            }, e.data.ms);
        };
    `;
    let timerWorker = null;
    let timerCallbacks = new Map();
    let timerId = 0;

    function getTimerWorker() {
        if (!timerWorker && typeof Worker !== 'undefined' && typeof Blob !== 'undefined') {
            try {
                const blob = new Blob([timerWorkerCode], { type: 'application/javascript' });
                timerWorker = new Worker(URL.createObjectURL(blob));
                timerWorker.onmessage = function (e) {
                    const cb = timerCallbacks.get(e.data.id);
                    if (cb) {
                        timerCallbacks.delete(e.data.id);
                        cb();
                    }
                };
                timerWorker.onerror = function (err) {
                    log('[Timer] Worker error, falling back to setTimeout');
                    timerWorker = null;
                };
                log('[Timer] Web Worker initialized for background operation');
            } catch (err) {
                log('[Timer] Web Worker not available, using setTimeout fallback');
            }
        }
        return timerWorker;
    }

    function workerDelay(ms) {
        return new Promise(function (resolve) {
            const worker = getTimerWorker();
            if (worker) {
                const id = ++timerId;
                timerCallbacks.set(id, resolve);
                worker.postMessage({ id: id, ms: ms });
            } else {

                setTimeout(resolve, ms);
            }
        });
    }

    const getDocuments = (root = document) => {
        let docs = [root];
        try {
            const iframes = root.querySelectorAll('iframe, frame');
            for (const iframe of iframes) {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDoc) docs.push(...getDocuments(iframeDoc));
                } catch (e) { }
            }
        } catch (e) { }
        return docs;
    };

    const queryAll = (selector) => {
        const results = [];
        getDocuments().forEach(doc => {
            try { results.push(...Array.from(doc.querySelectorAll(selector))); } catch (e) { }
        });
        return results;
    };

    const stripTimeSuffix = (text) => {
        return (text || '').trim().replace(/\s*\d+[smh]$/, '').trim();
    };

    const deduplicateNames = (names) => {
        const counts = {};
        return names.map(name => {
            if (counts[name] === undefined) {
                counts[name] = 1;
                return name;
            } else {
                counts[name]++;
                return `${name} (${counts[name]})`;
            }
        });
    };

    const updateTabNames = (tabs) => {
        const rawNames = Array.from(tabs).map(tab => stripTimeSuffix(tab.textContent));
        const tabNames = deduplicateNames(rawNames);

        if (JSON.stringify(window.__autoAllState.tabNames) !== JSON.stringify(tabNames)) {
            log(`updateTabNames: Detected ${tabNames.length} tabs: ${tabNames.join(', ')}`);
            window.__autoAllState.tabNames = tabNames;
        }
    };

    const updateConversationCompletionState = (rawTabName, status) => {
        const tabName = stripTimeSuffix(rawTabName);
        const current = window.__autoAllState.completionStatus[tabName];
        if (current !== status) {
            log(`[State] ${tabName}: ${current} → ${status}`);
            window.__autoAllState.completionStatus[tabName] = status;
        }
    };

    const OVERLAY_ID = '__autoAllBgOverlay';
    const STYLE_ID = '__autoAllBgStyles';
    const STYLES = `
        #__autoAllBgOverlay { position: fixed; background: rgba(0, 0, 0, 0.98); z-index: 2147483647; font-family: sans-serif; color: #fff; display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: none; opacity: 0; transition: opacity 0.3s; }
        #__autoAllBgOverlay.visible { opacity: 1; }
        .aab-slot { margin-bottom: 12px; width: 80%; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; }
        .aab-header { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
        .aab-progress-track { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; }
        .aab-progress-fill { height: 100%; width: 20%; background: #6b7280; transition: width 0.3s, background 0.3s; }
        .aab-slot.working .aab-progress-fill { background: #a855f7; }
        .aab-slot.done .aab-progress-fill { background: #22c55e; }
        .aab-slot .status-text { color: #6b7280; }
        .aab-slot.working .status-text { color: #a855f7; }
        .aab-slot.done .status-text { color: #22c55e; }
    `;

    function showOverlay() {
        if (document.getElementById(OVERLAY_ID)) {
            log('[Overlay] Already exists, skipping creation');
            return;
        }

        log('[Overlay] Creating overlay...');
        const state = window.__autoAllState;

        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = STYLES;
            document.head.appendChild(style);
            log('[Overlay] Styles injected');
        }

        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;

        const container = document.createElement('div');
        container.id = 'aab-c';
        container.style.cssText = 'width:100%; display:flex; flex-direction:column; align-items:center;';
        overlay.appendChild(container);

        document.body.appendChild(overlay);
        log('[Overlay] Overlay appended to body');

        const ide = state.currentMode || 'cursor';
        let panel = null;
        if (ide === 'antigravity') {
            panel = queryAll('#antigravity\\.agentPanel').find(p => p.offsetWidth > 50);
        } else {
            panel = queryAll('#workbench\\.parts\\.auxiliarybar').find(p => p.offsetWidth > 50);
        }

        if (panel) {
            log(`[Overlay] Found panel for ${ide}, syncing position`);
            const sync = () => {
                const r = panel.getBoundingClientRect();
                Object.assign(overlay.style, { top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', height: r.height + 'px' });
            };
            sync();
            new ResizeObserver(sync).observe(panel);
        } else {
            log('[Overlay] No panel found, using fullscreen');
            Object.assign(overlay.style, { top: '0', left: '0', width: '100%', height: '100%' });
        }

        const waitingDiv = document.createElement('div');
        waitingDiv.className = 'aab-waiting';
        waitingDiv.style.cssText = 'color:#888; font-size:12px;';
        waitingDiv.textContent = 'Scanning for conversations...';
        container.appendChild(waitingDiv);

        requestAnimationFrame(() => overlay.classList.add('visible'));
    }

    function updateOverlay() {
        const state = window.__autoAllState;
        const container = document.getElementById('aab-c');

        if (!container) {
            log('[Overlay] updateOverlay: No container found, skipping');
            return;
        }

        log(`[Overlay] updateOverlay call: tabNames count=${state.tabNames?.length || 0}`);
        const newNames = state.tabNames || [];

        if (newNames.length === 0) {
            if (!container.querySelector('.aab-waiting')) {
                container.textContent = '';
                const waitingDiv = document.createElement('div');
                waitingDiv.className = 'aab-waiting';
                waitingDiv.style.cssText = 'color:#888; font-size:12px;';
                waitingDiv.textContent = 'Scanning for conversations...';
                container.appendChild(waitingDiv);
            }
            return;
        }

        const waiting = container.querySelector('.aab-waiting');
        if (waiting) waiting.remove();

        const currentSlots = Array.from(container.querySelectorAll('.aab-slot'));

        currentSlots.forEach(slot => {
            const name = slot.getAttribute('data-name');
            if (!newNames.includes(name)) slot.remove();
        });

        newNames.forEach(name => {
            const status = state.completionStatus[name];
            const isDone = status === 'done';

            const statusClass = isDone ? 'done' : 'working';
            const statusText = isDone ? 'COMPLETED' : 'IN PROGRESS';
            const progressWidth = isDone ? '100%' : '66%';

            let slot = container.querySelector(`.aab-slot[data-name="${name}"]`);

            if (!slot) {
                slot = document.createElement('div');
                slot.className = `aab-slot ${statusClass}`;
                slot.setAttribute('data-name', name);

                const header = document.createElement('div');
                header.className = 'aab-header';

                const nameSpan = document.createElement('span');
                nameSpan.textContent = name;
                header.appendChild(nameSpan);

                const statusSpan = document.createElement('span');
                statusSpan.className = 'status-text';
                statusSpan.textContent = statusText;
                header.appendChild(statusSpan);

                slot.appendChild(header);

                const track = document.createElement('div');
                track.className = 'aab-progress-track';

                const fill = document.createElement('div');
                fill.className = 'aab-progress-fill';
                fill.style.width = progressWidth;
                track.appendChild(fill);

                slot.appendChild(track);
                container.appendChild(slot);
                log(`[Overlay] Created slot: ${name} (${statusText})`);
            } else {

                slot.className = `aab-slot ${statusClass}`;

                const statusSpan = slot.querySelector('.status-text');
                if (statusSpan) statusSpan.textContent = statusText;

                const bar = slot.querySelector('.aab-progress-fill');
                if (bar) bar.style.width = progressWidth;
            }
        });
    }

    function hideOverlay() {
        const overlay = document.getElementById(OVERLAY_ID);
        if (overlay) {
            log('[Overlay] Hiding overlay...');
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    function findNearbyCommandText(el) {
        const commandSelectors = ['pre', 'code', 'pre code'];
        let commandText = '';

        let container = el.parentElement;
        let depth = 0;
        const maxDepth = 10;

        while (container && depth < maxDepth) {

            let sibling = container.previousElementSibling;
            let siblingCount = 0;

            while (sibling && siblingCount < 5) {

                if (sibling.tagName === 'PRE' || sibling.tagName === 'CODE') {
                    const text = sibling.textContent.trim();
                    if (text.length > 0) {
                        commandText += ' ' + text;
                        log(`[BannedCmd] Found <${sibling.tagName}> sibling at depth ${depth}: "${text.substring(0, 100)}..."`);
                    }
                }

                for (const selector of commandSelectors) {
                    const codeElements = sibling.querySelectorAll(selector);
                    for (const codeEl of codeElements) {
                        if (codeEl && codeEl.textContent) {
                            const text = codeEl.textContent.trim();
                            if (text.length > 0 && text.length < 5000) {
                                commandText += ' ' + text;
                                log(`[BannedCmd] Found <${selector}> in sibling at depth ${depth}: "${text.substring(0, 100)}..."`);
                            }
                        }
                    }
                }

                sibling = sibling.previousElementSibling;
                siblingCount++;
            }

            if (commandText.length > 10) {
                break;
            }

            container = container.parentElement;
            depth++;
        }

        if (commandText.length === 0) {
            let btnSibling = el.previousElementSibling;
            let count = 0;
            while (btnSibling && count < 3) {
                for (const selector of commandSelectors) {
                    const codeElements = btnSibling.querySelectorAll ? btnSibling.querySelectorAll(selector) : [];
                    for (const codeEl of codeElements) {
                        if (codeEl && codeEl.textContent) {
                            commandText += ' ' + codeEl.textContent.trim();
                        }
                    }
                }
                btnSibling = btnSibling.previousElementSibling;
                count++;
            }
        }

        if (el.getAttribute('aria-label')) {
            commandText += ' ' + el.getAttribute('aria-label');
        }
        if (el.getAttribute('title')) {
            commandText += ' ' + el.getAttribute('title');
        }

        const result = commandText.trim().toLowerCase();
        if (result.length > 0) {
            log(`[BannedCmd] Extracted command text (${result.length} chars): "${result.substring(0, 150)}..."`);
        }
        return result;
    }

    function isCommandBanned(commandText) {
        const state = window.__autoAllState;
        const bannedList = state.bannedCommands || [];

        if (bannedList.length === 0) return false;
        if (!commandText || commandText.length === 0) return false;

        const lowerText = commandText.toLowerCase();

        for (const banned of bannedList) {
            const pattern = banned.trim();
            if (!pattern || pattern.length === 0) continue;

            try {

                if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {

                    const lastSlash = pattern.lastIndexOf('/');
                    const regexPattern = pattern.substring(1, lastSlash);
                    const flags = pattern.substring(lastSlash + 1) || 'i';

                    const regex = new RegExp(regexPattern, flags);
                    if (regex.test(commandText)) {
                        log(`[BANNED] Command blocked by regex: /${regexPattern}/${flags}`);
                        Analytics.trackBlocked(log);
                        return true;
                    }
                } else {

                    const lowerPattern = pattern.toLowerCase();
                    if (lowerText.includes(lowerPattern)) {
                        log(`[BANNED] Command blocked by pattern: "${pattern}"`);
                        Analytics.trackBlocked(log);
                        return true;
                    }
                }
            } catch (e) {

                log(`[BANNED] Invalid regex pattern "${pattern}", using literal match: ${e.message}`);
                if (lowerText.includes(pattern.toLowerCase())) {
                    log(`[BANNED] Command blocked by pattern (fallback): "${pattern}"`);
                    Analytics.trackBlocked(log);
                    return true;
                }
            }
        }
        return false;
    }

    function isAcceptButton(el) {
        const text = (el.textContent || "").trim().toLowerCase();
        if (text.length === 0 || text.length > 50) return false;

        // Use configured patterns from state if available, otherwise use defaults
        const state = window.__autoAllState || {};
        const defaultPatterns = ['accept', 'accept all', 'run', 'run command', 'retry', 'apply', 'execute', 'confirm', 'allow once', 'allow', 'proceed', 'continue', 'yes', 'ok', 'save', 'approve', 'enable', 'install', 'update', 'overwrite'];
        const patterns = state.acceptPatterns || defaultPatterns;
        const rejects = ['skip', 'reject', 'cancel', 'close', 'refine', 'deny', 'no', 'dismiss', 'abort', 'ask every time', 'always run', 'always allow'];

        // Skip dropdown menu items - these are handled by clickAlwaysRunDropdown
        if (el.getAttribute('role') === 'menuitem' || el.getAttribute('role') === 'option') return false;
        if (el.closest('[role="menu"]') || el.closest('[role="listbox"]')) return false;

        // Skip elements that are dropdown triggers (usually have a caret/arrow)
        if (text.includes('ask every time') || text === 'always run' || text === 'always allow') return false;

        if (rejects.some(r => text.includes(r))) return false;
        if (!patterns.some(p => text.includes(p))) return false;

        const isCommandButton = text.includes('run command') || text.includes('execute') || text.includes('run');

        if (isCommandButton) {
            const nearbyText = findNearbyCommandText(el);
            if (isCommandBanned(nearbyText)) {
                log(`[BANNED] Skipping button: "${text}" - command is banned`);
                return false;
            }
        }

        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && rect.width > 0 && style.pointerEvents !== 'none' && !el.disabled;
    }

    function isElementVisible(el) {
        if (!el || !el.isConnected) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && rect.width > 0 && style.visibility !== 'hidden';
    }

    function waitForDisappear(el, timeout = 500) {
        return new Promise(resolve => {
            const startTime = Date.now();
            const check = () => {
                if (!isElementVisible(el)) {
                    resolve(true);
                } else if (Date.now() - startTime >= timeout) {
                    resolve(false);
                } else {
                    requestAnimationFrame(check);
                }
            };

            setTimeout(check, 50);
        });
    }

    // Click "Always run" option in Antigravity's permission dropdown (new UI feature)
    // Track if we've already clicked it to avoid re-triggering the dropdown
    let alwaysRunClicked = false;

    function clickAlwaysRunDropdown() {
        // If we've already clicked "Always run", don't interact with dropdown anymore
        if (alwaysRunClicked) {
            return false;
        }

        // Look for dropdown menu items containing "Always run" or "Always allow"
        const dropdownSelectors = [
            '[role="menuitem"]',
            '[role="option"]',
            '.dropdown-item',
            '.menu-item',
            'div[class*="dropdown"] div',
            'div[class*="menu"] div',
            'li'
        ];

        for (const selector of dropdownSelectors) {
            const items = queryAll(selector);
            for (const item of items) {
                const text = (item.textContent || '').trim().toLowerCase();
                // Match "Always run", "Always allow", etc.
                if (text === 'always run' ||
                    text === 'always allow' ||
                    (text.includes('always') && (text.includes('run') || text.includes('allow')))) {

                    // Make sure it's visible and clickable
                    const style = window.getComputedStyle(item);
                    const rect = item.getBoundingClientRect();
                    const isVisible = style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        parseFloat(style.opacity) > 0.1 &&
                        rect.width > 0 && rect.height > 0;

                    if (isVisible) {
                        log('[Dropdown] Clicking "Always run" option - will not click again');
                        item.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
                        alwaysRunClicked = true;  // Remember we clicked it
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Reset the alwaysRunClicked flag when a new session starts
    function resetAlwaysRunState() {
        alwaysRunClicked = false;
    }


    async function performClick(selectors) {
        const found = [];
        selectors.forEach(s => queryAll(s).forEach(el => found.push(el)));
        let clicked = 0;
        let verified = 0;
        const uniqueFound = [...new Set(found)];

        for (const el of uniqueFound) {
            if (isAcceptButton(el)) {
                const buttonText = (el.textContent || "").trim();
                log(`Clicking: "${buttonText}"`);

                el.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
                clicked++;

                const disappeared = await waitForDisappear(el);

                if (disappeared) {

                    Analytics.trackClick(buttonText, log);
                    verified++;
                    log(`[Stats] Click verified (button disappeared)`);
                } else {
                    log(`[Stats] Click not verified (button still visible after 500ms)`);
                }
            }
        }

        if (clicked > 0) {
            log(`[Click] Attempted: ${clicked}, Verified: ${verified}`);
        }
        return verified;
    }

    async function cursorLoop(sid) {
        log('[Loop] cursorLoop STARTED');
        let index = 0;
        let cycle = 0;
        while (window.__autoAllState.isRunning && window.__autoAllState.sessionID === sid) {
            cycle++;
            log(`[Loop] Cycle ${cycle}: Starting...`);

            const clicked = await performClick(['button', '[class*="button"]', '[class*="anysphere"]']);
            log(`[Loop] Cycle ${cycle}: Clicked ${clicked} buttons`);

            await workerDelay(800);

            const tabSelectors = [
                '#workbench\\.parts\\.auxiliarybar ul[role="tablist"] li[role="tab"]',
                '.monaco-pane-view .monaco-list-row[role="listitem"]',
                'div[role="tablist"] div[role="tab"]',
                '.chat-session-item'
            ];

            let tabs = [];
            for (const selector of tabSelectors) {
                tabs = queryAll(selector);
                if (tabs.length > 0) {
                    log(`[Loop] Cycle ${cycle}: Found ${tabs.length} tabs using selector: ${selector}`);
                    break;
                }
            }

            if (tabs.length === 0) {
                log(`[Loop] Cycle ${cycle}: No tabs found in any known locations.`);
            }

            updateTabNames(tabs);

            if (tabs.length > 0) {
                const targetTab = tabs[index % tabs.length];
                const tabLabel = targetTab.getAttribute('aria-label') || targetTab.textContent?.trim() || 'unnamed tab';
                log(`[Loop] Cycle ${cycle}: Clicking tab "${tabLabel}"`);
                targetTab.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
                index++;
            }

            const state = window.__autoAllState;
            log(`[Loop] Cycle ${cycle}: State = { tabs: ${state.tabNames?.length || 0}, isRunning: ${state.isRunning}, sid: ${state.sessionID} }`);

            updateOverlay();
            log(`[Loop] Cycle ${cycle}: Overlay updated, waiting 3s...`);

            await workerDelay(3000);
        }
        log('[Loop] cursorLoop STOPPED');
    }

    async function antigravityLoop(sid) {
        log('[Loop] antigravityLoop STARTED');
        let index = 0;
        let cycle = 0;

        while (window.__autoAllState.isRunning && window.__autoAllState.sessionID === sid) {
            cycle++;
            log(`[Loop] Cycle ${cycle}: Starting...`);

            // First: Click "Always run" dropdown if visible (new Antigravity permission UI)
            clickAlwaysRunDropdown();

            // Look for Antigravity accept buttons AND general dialog buttons (for permissions, etc.)
            const clicked = await performClick(['.bg-ide-button-background', 'button', '[role="button"]', '[class*="button"]']);
            if (clicked > 0) {
                log(`[Loop] Cycle ${cycle}: Clicked ${clicked} accept buttons`);
            }

            await workerDelay(1500);

            const tabs = queryAll('button.grow');
            log(`[Loop] Cycle ${cycle}: Found ${tabs.length} tabs`);
            updateTabNames(tabs);

            if (tabs.length > 1) {
                const targetTab = tabs[index % tabs.length];
                const tabName = stripTimeSuffix(targetTab.textContent);

                const state = window.__autoAllState;
                if (state.completionStatus[tabName] !== 'done') {
                    log(`[Loop] Cycle ${cycle}: Switching to tab "${tabName}"`);
                    targetTab.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
                    index++;

                    await workerDelay(2000);

                    const badges = queryAll('span').filter(s => {
                        const t = s.textContent.trim();
                        return t === 'Good' || t === 'Bad';
                    });

                    if (badges.length > 0) {
                        updateConversationCompletionState(tabName, 'done');
                        log(`[Loop] Cycle ${cycle}: Tab "${tabName}" marked as DONE`);
                    }
                } else {

                    index++;
                    log(`[Loop] Cycle ${cycle}: Skipping completed tab "${tabName}"`);
                }
            }

            updateOverlay();

            await workerDelay(5000);
        }
        log('[Loop] antigravityLoop STOPPED');
    }

    window.__autoAllUpdateBannedCommands = function (bannedList) {
        const state = window.__autoAllState;
        state.bannedCommands = Array.isArray(bannedList) ? bannedList : [];
        log(`[Config] Updated banned commands list: ${state.bannedCommands.length} patterns`);
        if (state.bannedCommands.length > 0) {
            log(`[Config] Banned patterns: ${state.bannedCommands.join(', ')}`);
        }
    };

    window.__autoAllUpdateAcceptPatterns = function (patternList) {
        const state = window.__autoAllState;
        state.acceptPatterns = Array.isArray(patternList) && patternList.length > 0 ? patternList : null;
        log(`[Config] Updated accept patterns: ${state.acceptPatterns ? state.acceptPatterns.length + ' patterns' : 'using defaults'}`);
    };

    window.__autoAllGetStats = function () {
        const stats = Analytics.getStats();
        return {
            clicks: stats.clicksThisSession || 0,
            blocked: stats.blockedThisSession || 0,
            sessionStart: stats.sessionStartTime,
            fileEdits: stats.fileEditsThisSession || 0,
            terminalCommands: stats.terminalCommandsThisSession || 0,
            actionsWhileAway: stats.actionsWhileAway || 0
        };
    };

    window.__autoAllResetStats = function () {
        return Analytics.collectROI(log);
    };

    window.__autoAllGetSessionSummary = function () {
        return Analytics.getSessionSummary();
    };

    window.__autoAllGetAwayActions = function () {
        return Analytics.consumeAwayActions(log);
    };

    window.__autoAllSetFocusState = function (isFocused) {
        Analytics.setFocusState(isFocused, log);
    };

    window.__autoAllStart = function (config) {
        try {
            const ide = (config.ide || 'cursor').toLowerCase();
            const isPro = config.isPro !== false;
            const isBG = config.isBackgroundMode === true;

            if (config.bannedCommands) {
                window.__autoAllUpdateBannedCommands(config.bannedCommands);
            }
            if (config.acceptPatterns) {
                window.__autoAllUpdateAcceptPatterns(config.acceptPatterns);
            }

            log(`__autoAllStart called: ide=${ide}, isPro=${isPro}, isBG=${isBG}`);

            const state = window.__autoAllState;

            if (state.isRunning && state.currentMode === ide && state.isBackgroundMode === isBG) {
                log(`Already running with same config, skipping`);
                return;
            }

            if (state.isRunning) {
                log(`Stopping previous session...`);
                state.isRunning = false;
            }

            state.isRunning = true;
            state.currentMode = ide;
            state.isBackgroundMode = isBG;
            state.sessionID++;
            const sid = state.sessionID;

            if (!state.stats.sessionStartTime) {
                state.stats.sessionStartTime = Date.now();
            }

            log(`Agent Loaded (IDE: ${ide}, BG: ${isBG}, isPro: ${isPro})`, true);

            if (isBG && isPro) {
                log(`[BG] Starting background loop (no overlay)...`);

                log(`[BG] Starting ${ide} loop...`);
                if (ide === 'cursor') cursorLoop(sid);
                else antigravityLoop(sid);
            } else if (isBG && !isPro) {
                log(`[BG] Background mode without Pro...`);

                if (ide === 'cursor') cursorLoop(sid);
                else antigravityLoop(sid);
            } else {
                hideOverlay();
                log(`Starting static poll loop...`);
                (async function staticLoop() {
                    while (state.isRunning && state.sessionID === sid) {
                        performClick(['button', '[class*="button"]', '[class*="anysphere"]']);
                        await workerDelay(config.pollInterval || 1000);
                    }
                })();
            }
        } catch (e) {
            log(`ERROR in __autoAllStart: ${e.message}`);
            console.error('[autoAll] Start error:', e);
        }
    };

    window.__autoAllStop = function () {
        window.__autoAllState.isRunning = false;
        hideOverlay();
        log("Agent Stopped.");
    };

    log("Core Bundle Initialized.", true);
})();
