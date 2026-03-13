/**
 * Analytics State Module
 * Handles initialization and migration of analytics state.
 * 
 * @module analytics/state
 */

/**
 * Default stats structure for a fresh session.
 * @returns {Object} Fresh stats object
 */
function createDefaultStats() {
    return {
        // Core ROI metrics (reset every collection cycle)
        clicksThisSession: 0,
        blockedThisSession: 0,
        sessionStartTime: null,

        // Detailed breakdown (reset when session summary is shown)
        fileEditsThisSession: 0,
        terminalCommandsThisSession: 0,

        // Away mode tracking (reset when user returns)
        actionsWhileAway: 0,
        isWindowFocused: true,

        // Conversation tracking (for future features)
        lastConversationUrl: null,
        lastConversationStats: null
    };
}

/**
 * Initialize analytics state on the window object.
 * Creates a fresh state if none exists, or migrates existing state.
 * 
 * @param {Object} log - Logger function
 */
function initializeState(log) {
    if (!window.__autoAcceptState) {
        window.__autoAcceptState = {
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
        log('[Analytics] Fresh state initialized');
    } else {
        migrateState(log);
    }
}

/**
 * Migrate existing state to include any new fields.
 * Ensures backwards compatibility when updating the extension.
 * 
 * @param {Object} log - Logger function
 */
function migrateState(log) {
    const state = window.__autoAcceptState;

    // Ensure stats object exists
    if (!state.stats) {
        state.stats = createDefaultStats();
        log('[Analytics] Created missing stats object');
        return;
    }

    // Migrate individual fields
    const s = state.stats;
    let migrated = false;

    if (s.actionsWhileAway === undefined) {
        s.actionsWhileAway = 0;
        migrated = true;
    }
    if (s.isWindowFocused === undefined) {
        s.isWindowFocused = true;
        migrated = true;
    }
    if (s.fileEditsThisSession === undefined) {
        s.fileEditsThisSession = 0;
        migrated = true;
    }
    if (s.terminalCommandsThisSession === undefined) {
        s.terminalCommandsThisSession = 0;
        migrated = true;
    }

    if (migrated) {
        log('[Analytics] Migrated state to include new fields');
    }
}

/**
 * Get the current stats object (read-only snapshot).
 * @returns {Object} Current stats
 */
function getStats() {
    return window.__autoAcceptState?.stats || createDefaultStats();
}

/**
 * Get the mutable stats reference for trackers.
 * @returns {Object} Stats reference
 */
function getStatsMutable() {
    return window.__autoAcceptState.stats;
}

// Export for browser (IIFE) or Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createDefaultStats, initializeState, migrateState, getStats, getStatsMutable };
}
