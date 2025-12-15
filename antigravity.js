/**
 * Antigravity Handler
 * Handles auto-accept for Antigravity (VS Code with Antigravity extension)
 */

const vscode = require('vscode');

const ANTIGRAVITY_COMMANDS = [
    'antigravity.agent.acceptAgentStep'
];

class AntigravityHandler {
    constructor() {
        this.name = 'Antigravity';
        this.activeCommands = [];
    }

    async refreshCommands() {
        try {
            const all = await vscode.commands.getCommands(true);
            this.activeCommands = ANTIGRAVITY_COMMANDS.filter(c => all.includes(c));
        } catch (e) {
            this.activeCommands = [];
        }
    }

    getActiveCommands() {
        return this.activeCommands;
    }

    async executeAccept(skipFocus = false) {
        let executed = 0;

        for (const cmd of this.activeCommands) {
            try {
                await vscode.commands.executeCommand(cmd);
                executed++;
            } catch (e) { }
        }

        return {
            executed,
            docChanged: false
        };
    }
}

module.exports = { AntigravityHandler };
