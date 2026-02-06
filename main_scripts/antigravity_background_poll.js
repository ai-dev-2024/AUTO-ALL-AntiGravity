// defines the sequence of clicks for antigravity background mode

import { autoAccept, click } from './auto_accept.js'
import * as utils from './utils.js'
import { showOverlay, manageOverlay } from './overlay.js'

// hard coded intervals for web ui to have sufficient time to load
const AG_ACCEPT_PAUSE = 50
const AG_NEW_TAB_PAUSE = 100
const AG_NEXT_CONVERSATION_PAUSE = 200

export async function antigravityBackgroundPoll() {
    console.log('[BG-Poll] antigravityBackgroundPoll started');
    let currentTabIndex = 0;
    utils.assert(window.__autoAcceptState, "AutoAccept state not found");
    const sid = window.__autoAcceptState.sessionID;
    console.log(`[BG-Poll] Session ID: ${sid}, isRunning: ${window.__autoAcceptState.isRunning}`);

    // Show overlay once at the start
    showOverlay();

    // check that the session is the same as the previous one(guard restart failure)
    while (window.__autoAcceptState.isRunning && window.__autoAcceptState.sessionID === sid) {
        console.log(`[BG-Poll] Loop iteration, tab index: ${currentTabIndex}`);

        // 0. check completion state for overlay ui
        checkForCompletion()

        // 0.1 Render Overlay
        manageOverlay();

        // 1. click accept/retry and wait for 0.5s
        autoAccept(["accept", "retry"])
        await new Promise(resolve => setTimeout(resolve, AG_ACCEPT_PAUSE))

        // 2. click new tab (+ button) and wait for 1s
        click("[data-tooltip-id='new-conversation-tooltip']")
        await new Promise(resolve => setTimeout(resolve, AG_NEW_TAB_PAUSE))

        // 3. click next conversation tab and wait for 3s
        const tabs = utils.queryAll('button.grow');
        console.log(`[BG-Poll] Found ${tabs.length} tabs`);
        utils.updateTabNames(tabs);

        if (tabs.length > 0) {
            const nextIndex = currentTabIndex % tabs.length;
            const tabToClick = tabs[nextIndex];
            console.log(`[BG-Poll] Clicking tab ${nextIndex}: "${tabToClick.textContent?.trim()}"`);
            tabToClick.click(); // Using direct click for speed in BG
            currentTabIndex++;
        }
        await new Promise(resolve => setTimeout(resolve, AG_NEXT_CONVERSATION_PAUSE))
    }
    console.log('[BG-Poll] Loop ended');

    function checkForCompletion() {
        let isCompleted = false;

        // Look for Good/Bad feedback badge
        const feedbackContainers = utils.queryAll('div.ml-auto.flex.flex-row.items-center.gap-2');
        for (const feedbackContainer of feedbackContainers) {
            const spans = feedbackContainer.querySelectorAll('span.opacity-70');
            for (const span of spans) {
                const text = span.textContent?.trim();
                if (text === 'Good' || text === 'Bad') {
                    isCompleted = true;
                    break;
                }
            }
            if (isCompleted) break;
        }

        // Identify active tab to update state
        const tabs = utils.queryAll('button.grow');
        let activeTab = null;
        tabs.forEach(t => {
            const style = window.getComputedStyle(t);
            if (t.classList.contains('bg-ide-input-background') || style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                activeTab = t;
            }
        });

        if (activeTab) {
            utils.updateConversationCompletionState(activeTab.textContent.trim(), isCompleted);
        }
    }
}
