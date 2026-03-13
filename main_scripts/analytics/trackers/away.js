/**
 * Away Mode Tracker Module
 * Tracks window focus state and actions performed while user is away.
 * 
 * @module analytics/trackers/away
 */

/**
 * Set the window focus state.
 * 
 * @param {Object} stats - The stats object to update
 * @param {boolean} isFocused - Whether the window is focused
 * @param {Function} log - Logger function
 * @returns {Object} Focus change metadata { wasAway, awayActions }
 */
function setFocusState(stats, isFocused, log) {
    const wasAway = !stats.isWindowFocused;
    stats.isWindowFocused = isFocused;

    const result = {
        wasAway,
        awayActions: stats.actionsWhileAway || 0
    };

    log(`[Away] Focus state changed: focused=${isFocused}, wasAway=${wasAway}`);

    return result;
}

/**
 * Check if the user just returned from being away.
 * 
 * @param {Object} stats - The stats object
 * @returns {boolean} True if user was away and is now focused
 */
function didUserReturn(stats) {
    return stats.isWindowFocused && stats.actionsWhileAway > 0;
}

/**
 * Get the count of actions performed while user was away.
 * Does NOT reset the counter - use consumeAwayActions for that.
 * 
 * @param {Object} stats - The stats object
 * @returns {number} Number of away actions
 */
function getAwayActionsCount(stats) {
    return stats.actionsWhileAway || 0;
}

/**
 * Get and reset the away actions counter.
 * This is called when showing the "handled while away" notification.
 * 
 * @param {Object} stats - The stats object to update
 * @param {Function} log - Logger function
 * @returns {number} Number of away actions before reset
 */
function consumeAwayActions(stats, log) {
    const count = stats.actionsWhileAway || 0;
    log(`[Away] Consuming away actions: ${count}`);
    stats.actionsWhileAway = 0;
    return count;
}

/**
 * Increment the away actions counter.
 * Called by click tracker when a click happens while unfocused.
 * 
 * @param {Object} stats - The stats object to update
 */
function incrementAwayAction(stats) {
    stats.actionsWhileAway++;
}

// Export for browser (IIFE) or Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setFocusState, didUserReturn, getAwayActionsCount, consumeAwayActions, incrementAwayAction };
}
