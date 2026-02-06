// function that simply clicks the "accept"/"run"/"retry" buttons

import * as utils from './utils.js';
import { getDocuments } from './utils.js';


// high level wrapper of click() with constraints
export function autoAccept(buttons) {
    utils.assert(Array.isArray(buttons), "buttons must be an array")

    // First, try to click "Always run" in any visible dropdown menus
    clickAlwaysRunDropdown();

    let targetSelectors = []
    let panelSelector = null

    // cursor specific button
    if (buttons.includes("run")) {
        targetSelectors.push('div.full-input-box', 'button', '[class*="anysphere"]')
        panelSelector = "#workbench\\.parts\\.auxiliarybar"
    }

    if (buttons.includes("accept") || buttons.includes("retry")) {
        targetSelectors.push(".bg-ide-button-background", "button")
        panelSelector = "#antigravity\\.agentPanel"
    }

    utils.assert(targetSelectors.length > 0, "no target selectors found")
    return click(targetSelectors, panelSelector)
}


// Click "Always run" option in Antigravity's permission dropdown
function clickAlwaysRunDropdown() {
    const docs = getDocuments();

    for (const doc of docs) {
        // Look for dropdown menu items containing "Always run" or "Always allow"
        const dropdownSelectors = [
            '[role="menuitem"]',
            '[role="option"]',
            '.dropdown-item',
            '.menu-item',
            'div[class*="dropdown"] div',
            'div[class*="menu"] div',
            'li',
            'button'
        ];

        for (const selector of dropdownSelectors) {
            const items = doc.querySelectorAll(selector);
            for (const item of items) {
                const text = (item.textContent || '').trim().toLowerCase();
                // Match "Always run", "Always allow", "always auto-approve", etc.
                if (text === 'always run' ||
                    text === 'always allow' ||
                    text.includes('always run') ||
                    text.includes('always allow') ||
                    text.includes('always auto')) {

                    // Make sure it's visible and clickable
                    const style = doc.defaultView.getComputedStyle(item);
                    const rect = item.getBoundingClientRect();
                    const isVisible = style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        parseFloat(style.opacity) > 0.1 &&
                        rect.width > 0 && rect.height > 0;

                    if (isVisible) {
                        console.log('[auto-all] Clicking "Always run" dropdown option');
                        item.click();
                        return true;
                    }
                }
            }
        }
    }
    return false;
}


// basic sanity checks before clicking
function isAcceptButton(el) {
    // define the types that are supported
    const ACCEPT_PATTERNS = [
        { pattern: 'accept', exact: false },
        { pattern: 'accept all', exact: false },
        { pattern: 'acceptalt', exact: false },
        { pattern: 'run command', exact: false },
        { pattern: 'run', exact: false },
        { pattern: 'run code', exact: false },
        { pattern: 'run cell', exact: false },
        { pattern: 'run all', exact: false },
        { pattern: 'run selection', exact: false },
        { pattern: 'run and debug', exact: false },
        { pattern: 'run test', exact: false },
        { pattern: 'apply', exact: true },
        { pattern: 'execute', exact: true },
        { pattern: 'resume', exact: true },
        { pattern: 'retry', exact: true },
        { pattern: 'try again', exact: false },
        { pattern: 'confirm', exact: false },
        { pattern: 'Allow Once', exact: true },
        { pattern: 'always allow', exact: false },
        { pattern: 'always auto', exact: false },
        { pattern: 'proceed', exact: false },
        { pattern: 'continue', exact: false },
        { pattern: 'yes', exact: true },
        { pattern: 'ok', exact: true },
        { pattern: 'save', exact: false },
        { pattern: 'approve', exact: false },
        { pattern: 'enable', exact: false },
        { pattern: 'install', exact: false },
        { pattern: 'update', exact: false },
        { pattern: 'overwrite', exact: false }
    ];

    // define the types that are not targetted
    const REJECT_PATTERNS = ['skip', 'reject', 'cancel', 'discard', 'deny', 'close', 'refine', 'other', 'no', 'dismiss', 'abort'];

    if (!el || !el.textContent) return false;

    const text = el.textContent.trim().toLowerCase();
    if (text.length === 0 || text.length > 50) return false;

    // Pattern matching
    const matched = ACCEPT_PATTERNS.some(p => p.exact ? text === p.pattern : text.includes(p.pattern));
    if (!matched) return false;

    // Reject if matches negative pattern
    if (REJECT_PATTERNS.some(p => text.includes(p))) {
        return false;
    }

    // State validation
    const visible = isElementVisible(el);
    const clickable = isElementClickable(el);

    if (!visible || !clickable) {
        return false;
    }

    return true;
}


function isElementVisible(el) {
    const win = el.ownerDocument.defaultView || window;
    const style = win.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        parseFloat(style.opacity) > 0.1 &&
        rect.width > 0 &&
        rect.height > 0;
}


function isElementClickable(el) {
    const win = el.ownerDocument.defaultView || window;
    const style = win.getComputedStyle(el);
    return style.pointerEvents !== 'none' && !el.disabled && !el.hasAttribute('disabled');
}


export function click(targetSelectors, panelSelector) {
    focusOnPanel(panelSelector) // focus on the panel
    const targets = Array.isArray(targetSelectors) ? targetSelectors : [targetSelectors]
    const docs = getDocuments();
    const discoveredElements = [];

    // Cursor-specific logic: if we see the input box selector, we do the sibling scan
    if (targets.includes('div.full-input-box')) {
        for (const doc of docs) {
            const inputBox = doc.querySelector('div.full-input-box');
            if (inputBox) {
                let sibling = inputBox.previousElementSibling;
                let count = 0;
                while (sibling && count < 5) {
                    const innerSelectors = ['div[class*="button"]', 'button', '[class*="anysphere"]'];
                    innerSelectors.forEach(s => {
                        sibling.querySelectorAll(s).forEach(el => discoveredElements.push(el));
                    });
                    sibling = sibling.previousElementSibling;
                    count++;
                }
            }
        }
    }

    // Generic selector matching
    for (const target of targets) {
        if (typeof target === 'string') {
            for (const doc of docs) {
                const results = doc.querySelectorAll(target);

                results.forEach(el => discoveredElements.push(el));
            }
        } else if (target && typeof target === 'object' && target.nodeType === 1) {
            discoveredElements.push(target);
        }
    }

    // Filter and click elements
    const uniqueElements = [...new Set(discoveredElements)];

    let clickCount = 0;
    for (const el of uniqueElements) {
        // If it's an accept button, click it
        if (isAcceptButton(el)) {
            el.click();
            clickCount++;
        }
    }

    return
}


export function focusOnPanel(panelSelector) {
    if (!panelSelector) return
    const docs = getDocuments();
    for (const doc of docs) {
        const panel = doc.querySelector(panelSelector)
        if (panel) {
            panel.focus()
            break
        }
    }
}
