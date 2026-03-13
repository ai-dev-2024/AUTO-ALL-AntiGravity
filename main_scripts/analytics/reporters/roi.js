/**
 * ROI Reporter Module
 * Generates reports for weekly ROI statistics collection.
 * 
 * @module analytics/reporters/roi
 */

/**
 * Get current ROI stats without resetting.
 * Used for display purposes.
 * 
 * @param {Object} stats - The stats object
 * @returns {Object} Current ROI metrics
 */
function getROIStats(stats) {
    return {
        clicks: stats.clicksThisSession || 0,
        blocked: stats.blockedThisSession || 0,
        sessionStart: stats.sessionStartTime
    };
}

/**
 * Collect and reset ROI stats for periodic aggregation.
 * Only resets core ROI metrics, preserving UX notification counters.
 * 
 * @param {Object} stats - The stats object to update
 * @param {Function} log - Logger function
 * @returns {Object} Collected ROI metrics
 */
function collectAndResetROI(stats, log) {
    const collected = {
        clicks: stats.clicksThisSession || 0,
        blocked: stats.blockedThisSession || 0,
        sessionStart: stats.sessionStartTime
    };

    log(`[ROI] Collecting stats: ${collected.clicks} clicks, ${collected.blocked} blocked`);

    // Reset ONLY core ROI metrics
    // Keep fileEdits, terminalCommands, actionsWhileAway for UX notifications
    stats.clicksThisSession = 0;
    stats.blockedThisSession = 0;
    stats.sessionStartTime = Date.now();

    return collected;
}

/**
 * Constants for time saved calculations.
 */
const SECONDS_PER_CLICK = 5;
const TIME_VARIANCE = 0.2; // +/- 20%

/**
 * Calculate estimated time saved from clicks.
 * 
 * @param {number} clicks - Number of clicks
 * @returns {Object|null} Time range { min, max } in minutes, or null if no clicks
 */
function calculateTimeSaved(clicks) {
    if (clicks <= 0) return null;

    const baseSecs = clicks * SECONDS_PER_CLICK;
    const minMins = Math.max(1, Math.floor((baseSecs * (1 - TIME_VARIANCE)) / 60));
    const maxMins = Math.ceil((baseSecs * (1 + TIME_VARIANCE)) / 60);

    return { min: minMins, max: maxMins };
}

/**
 * Format time saved range as a string.
 * 
 * @param {number} clicks - Number of clicks
 * @returns {string|null} Formatted time range or null
 */
function formatTimeSaved(clicks) {
    const range = calculateTimeSaved(clicks);
    if (!range) return null;
    return `${range.min}–${range.max}`;
}

// Export for browser (IIFE) or Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getROIStats, collectAndResetROI, calculateTimeSaved, formatTimeSaved, SECONDS_PER_CLICK };
}
