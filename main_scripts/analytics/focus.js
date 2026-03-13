/**
 * Focus Manager Module
 * Handles window focus/blur events and dispatches user return events.
 * 
 * @module analytics/focus
 */

/**
 * Flag to prevent duplicate listener registration.
 */
let listenersAttached = false;

/**
 * Setup focus and visibility listeners for away mode tracking.
 * Only attaches once per page load.
 * 
 * @param {Object} stats - The stats object to update
 * @param {Function} log - Logger function
 * @param {Function} onUserReturn - Callback when user returns with away actions
 */
function setupFocusListeners(stats, log, onUserReturn) {
    if (typeof window === 'undefined') return;
    if (listenersAttached) {
        log('[Focus] Listeners already attached, skipping');
        return;
    }

    log('[Focus] Setting up focus/visibility listeners...');

    const handleFocusChange = (isFocused, source) => {
        if (!stats) return;

        const wasAway = !stats.isWindowFocused;
        stats.isWindowFocused = isFocused;

        log(`[Focus] ${source}: focused=${isFocused}, wasAway=${wasAway}`);

        if (isFocused && wasAway) {
            const awayActions = stats.actionsWhileAway || 0;
            log(`[Focus] User returned! awayActions=${awayActions}`);

            if (awayActions > 0 && onUserReturn) {
                onUserReturn(awayActions);
            }
        }
    };

    window.addEventListener('focus', () => handleFocusChange(true, 'window-focus'));
    window.addEventListener('blur', () => handleFocusChange(false, 'window-blur'));
    document.addEventListener('visibilitychange', () =>
        handleFocusChange(!document.hidden, 'visibility-change')
    );

    // Initialize with current state
    handleFocusChange(!document.hidden, 'init');

    listenersAttached = true;
    log('[Focus] Listeners registered');
}

/**
 * Dispatch a custom event for the extension to catch.
 * 
 * @param {number} awayActions - Number of actions performed while away
 */
function dispatchUserReturnedEvent(awayActions) {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('autoAcceptUserReturned', {
        detail: { actionsWhileAway: awayActions }
    }));
}

/**
 * Check if listeners are currently attached.
 * @returns {boolean} True if listeners are attached
 */
function areListenersAttached() {
    return listenersAttached;
}

/**
 * Reset listener state (for testing).
 */
function resetListenerState() {
    listenersAttached = false;
}

// Export for browser (IIFE) or Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupFocusListeners, dispatchUserReturnedEvent, areListenersAttached, resetListenerState };
}
