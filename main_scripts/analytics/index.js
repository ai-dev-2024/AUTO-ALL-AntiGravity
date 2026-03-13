

(function (exports) {
    'use strict';

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

    const ActionType = {
        FILE_EDIT: 'file_edit',
        TERMINAL_COMMAND: 'terminal_command'
    };

    const TERMINAL_KEYWORDS = ['run', 'execute', 'command', 'terminal'];

    function categorizeClick(buttonText) {
        const text = (buttonText || '').toLowerCase();
        for (const keyword of TERMINAL_KEYWORDS) {
            if (text.includes(keyword)) {
                return ActionType.TERMINAL_COMMAND;
            }
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

        const baseSecs = clicks * 5;
        const minMins = Math.max(1, Math.floor((baseSecs * 0.8) / 60));
        const maxMins = Math.ceil((baseSecs * 1.2) / 60);

        return {
            clicks,
            fileEdits: stats.fileEditsThisSession || 0,
            terminalCommands: stats.terminalCommandsThisSession || 0,
            blocked: stats.blockedThisSession || 0,
            estimatedTimeSaved: clicks > 0 ? `${minMins}–${maxMins}` : null
        };
    }

    function consumeAwayActions(log) {
        const stats = getStatsMutable();
        const count = stats.actionsWhileAway || 0;
        log(`[Away] Getting away actions: ${count}`);
        stats.actionsWhileAway = 0;
        return count;
    }

    function isUserAway() {
        return !getStats().isWindowFocused;
    }

    let focusListenersAttached = false;

    function setupFocusListeners(log) {
        if (typeof window === 'undefined') return;
        if (focusListenersAttached) return;

        log('[Focus] Setting up listeners...');

        const handleFocusChange = (isFocused, source) => {
            const state = window.__autoAllState;
            if (!state || !state.stats) return;

            const wasAway = !state.stats.isWindowFocused;
            state.stats.isWindowFocused = isFocused;

            log(`[Focus] ${source}: focused=${isFocused}, wasAway=${wasAway}`);

            if (isFocused && wasAway) {
                const awayActions = state.stats.actionsWhileAway || 0;
                log(`[Focus] User returned! awayActions=${awayActions}`);
                if (awayActions > 0) {
                    window.dispatchEvent(new CustomEvent('autoAllUserReturned', {
                        detail: { actionsWhileAway: awayActions }
                    }));
                }
            }
        };

        window.addEventListener('focus', () => handleFocusChange(true, 'window-focus'));
        window.addEventListener('blur', () => handleFocusChange(false, 'window-blur'));
        document.addEventListener('visibilitychange', () =>
            handleFocusChange(!document.hidden, 'visibility-change')
        );

        handleFocusChange(!document.hidden, 'init');
        focusListenersAttached = true;
        log('[Focus] Listeners registered');
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

        setupFocusListeners(log);

        if (!window.__autoAllState.stats.sessionStartTime) {
            window.__autoAllState.stats.sessionStartTime = Date.now();
        }

        log('[Analytics] Initialized successfully');
    }

    exports.Analytics = {
        
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

        setupFocusListeners
    };

    exports.trackClick = trackClick;
    exports.trackBlocked = trackBlocked;
    exports.collectROI = collectROI;
    exports.getSessionSummary = getSessionSummary;
    exports.consumeAwayActions = consumeAwayActions;
    exports.initialize = initialize;

})(typeof module !== 'undefined' && module.exports ? module.exports : window);
