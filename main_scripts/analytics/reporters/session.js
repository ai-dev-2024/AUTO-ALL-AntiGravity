/**
 * Session Summary Reporter Module
 * Generates summaries for completed coding sessions.
 * 
 * @module analytics/reporters/session
 */

/**
 * Get a summary of the current session.
 * Includes detailed breakdown of file edits vs terminal commands.
 * 
 * @param {Object} stats - The stats object
 * @returns {Object} Session summary
 */
function getSessionSummary(stats) {
    const clicks = stats.clicksThisSession || 0;
    const fileEdits = stats.fileEditsThisSession || 0;
    const terminalCommands = stats.terminalCommandsThisSession || 0;
    const blocked = stats.blockedThisSession || 0;

    // Calculate time saved estimate
    const baseSecs = clicks * 5;
    const minMins = Math.max(1, Math.floor((baseSecs * 0.8) / 60));
    const maxMins = Math.ceil((baseSecs * 1.2) / 60);

    return {
        clicks,
        fileEdits,
        terminalCommands,
        blocked,
        estimatedTimeSaved: clicks > 0 ? `${minMins}–${maxMins}` : null,
        hasActivity: clicks > 0 || blocked > 0
    };
}

/**
 * Reset session breakdown counters.
 * Called after showing the session summary notification.
 * 
 * @param {Object} stats - The stats object to update
 * @param {Function} log - Logger function
 */
function resetSessionBreakdown(stats, log) {
    log(`[Session] Resetting session breakdown: ${stats.fileEditsThisSession} file edits, ${stats.terminalCommandsThisSession} terminal commands`);
    stats.fileEditsThisSession = 0;
    stats.terminalCommandsThisSession = 0;
}

/**
 * Check if the session has significant activity worth summarizing.
 * 
 * @param {Object} stats - The stats object
 * @param {number} threshold - Minimum clicks to consider significant
 * @returns {boolean} True if session has significant activity
 */
function hasSignificantActivity(stats, threshold = 3) {
    const clicks = stats.clicksThisSession || 0;
    return clicks >= threshold;
}

// Export for browser (IIFE) or Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getSessionSummary, resetSessionBreakdown, hasSignificantActivity };
}
