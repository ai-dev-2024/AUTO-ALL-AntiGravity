
window.__autoAllState = window.__autoAllState || {
    isRunning: false,
    tabNames: [],
    completionStatus: {},
    sessionID: 0,
    currentMode: null
};

window.__autoAllStart = function (config) {

    const newMode = (config.isBackgroundMode && config.isPro) ? 'background' : 'simple';
    if (window.__autoAllState.isRunning && window.__autoAllState.currentMode === newMode) {
        return;
    }

    if (window.__autoAllState.isRunning) {
        window.__autoAllStop();
    }

    window.__autoAllState.isRunning = true;
    window.__autoAllState.currentMode = newMode;
    window.__autoAllState.sessionID++;

    if (newMode === 'background') {
        const ide = config.ide ? config.ide.toLowerCase() : '';
        if (ide === 'antigravity') {
            antigravityBackgroundPoll();
        } else if (ide === 'cursor') {
            cursorBackgroundPoll();
        } else {
            console.error('[autoAll] Unknown IDE for background mode:', config.ide);
        }
    } else {
        startSimpleCycle(config);
    }
};

window.__autoAllStop = function () {
    window.__autoAllState.isRunning = false;

    window.__autoAllState.currentMode = null;
    window.__autoAllState.tabNames = [];
    window.__autoAllState.completionStatus = {};
    window.__autoAllState.sessionID = 0;

    if (typeof hideOverlay === 'function') hideOverlay();

};

function startSimpleCycle(config) {
    const ide = config.ide ? config.ide.toLowerCase() : '';
    const buttons = ide === 'cursor' ? ['run'] : ['accept', 'retry'];
    const sid = window.__autoAllState.sessionID;
    function step() {
        if (!window.__autoAllState.isRunning || window.__autoAllState.sessionID !== sid) {
            return;
        }
        autoAll(buttons);
        setTimeout(step, config.pollInterval || 100);
    }
    step();
}
