const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'extension.js'), 'utf8');
const dist = fs.readFileSync(path.join(root, 'dist', 'extension.js'), 'utf8');

function blockBetween(text, start, end) {
    const from = text.indexOf(start);
    const to = text.indexOf(end, from);
    assert.notEqual(from, -1, `missing start marker: ${start}`);
    assert.notEqual(to, -1, `missing end marker: ${end}`);
    return text.slice(from, to);
}

test('startup never relaunches the IDE automatically when CDP is missing', () => {
    const startup = blockBetween(source, 'async function checkEnvironmentAndStart()', 'async function handleToggle');
    assert.doesNotMatch(startup, /relaunchWithCDP\s*\(/);
    assert.match(startup, /Automatic startup relaunch is disabled/);
    assert.match(startup, /showWarningMessage\s*\(/);
});

test('explicit relaunch paths remain available', () => {
    const promptFlow = blockBetween(source, 'async function ensureCDPOrPrompt', 'async function checkEnvironmentAndStart');
    const commandFlow = blockBetween(source, 'async function handleRelaunch()', 'async function handleFrequencyUpdate');
    assert.match(promptFlow, /showRelaunchPrompt\s*\(/);
    assert.match(commandFlow, /relaunchWithCDP\s*\(/);
});

test('the packaged extension contains the startup safeguard', () => {
    assert.match(dist, /Automatic startup relaunch is disabled/);
    assert.doesNotMatch(dist, /CDP not available\. Auto-relaunching with CDP enabled/);
});
