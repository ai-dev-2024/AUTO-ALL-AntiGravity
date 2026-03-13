/**
 * Click Tracker Module
 * Tracks and categorizes button clicks.
 * 
 * @module analytics/trackers/clicks
 */

/**
 * Action categories for click classification.
 */
const ActionType = {
    FILE_EDIT: 'file_edit',
    TERMINAL_COMMAND: 'terminal_command',
    UNKNOWN: 'unknown'
};

/**
 * Keywords that indicate a terminal/command action.
 */
const TERMINAL_KEYWORDS = ['run', 'execute', 'command', 'terminal'];

/**
 * Categorize a button click based on its text.
 * 
 * @param {string} buttonText - The text content of the clicked button
 * @returns {string} ActionType constant
 */
function categorizeClick(buttonText) {
    const text = (buttonText || '').toLowerCase();

    for (const keyword of TERMINAL_KEYWORDS) {
        if (text.includes(keyword)) {
            return ActionType.TERMINAL_COMMAND;
        }
    }

    return ActionType.FILE_EDIT;
}

/**
 * Track a button click in the analytics state.
 * Increments total clicks and categorized counters.
 * 
 * @param {Object} stats - The stats object to update
 * @param {string} buttonText - The text of the clicked button
 * @param {Function} log - Logger function
 * @returns {Object} Click metadata { category, isAway }
 */
function trackClick(stats, buttonText, log) {
    // Increment total clicks
    stats.clicksThisSession++;
    log(`[Stats] Click tracked. Total clicks this session: ${stats.clicksThisSession}`);

    // Categorize the click
    const category = categorizeClick(buttonText);

    if (category === ActionType.TERMINAL_COMMAND) {
        stats.terminalCommandsThisSession++;
        log(`[Stats] Categorized as terminal command. Total: ${stats.terminalCommandsThisSession}`);
    } else {
        stats.fileEditsThisSession++;
        log(`[Stats] Categorized as file edit. Total: ${stats.fileEditsThisSession}`);
    }

    // Track if this happened while user was away
    let isAway = false;
    if (!stats.isWindowFocused) {
        stats.actionsWhileAway++;
        isAway = true;
        log(`[Stats] Window unfocused - action counted as away. Total away: ${stats.actionsWhileAway}`);
    }

    return { category, isAway };
}

/**
 * Track a blocked command (not clicked due to ban list).
 * 
 * @param {Object} stats - The stats object to update
 * @param {Function} log - Logger function
 */
function trackBlocked(stats, log) {
    stats.blockedThisSession++;
    log(`[Stats] Blocked action tracked. Total blocked: ${stats.blockedThisSession}`);
}

// Export for browser (IIFE) or Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ActionType, categorizeClick, trackClick, trackBlocked, TERMINAL_KEYWORDS };
}
