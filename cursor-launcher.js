/**
 * Cursor Launcher
 * Cross-platform launcher for Cursor with CDP enabled.
 */

const vscode = require('vscode');
const { execSync } = require('child_process');
const os = require('os');

const BASE_CDP_PORT = 9222;

class CursorLauncher {
    constructor() {
        this.platform = os.platform();
        this.nextPort = BASE_CDP_PORT;
    }

    getNextPort() {
        return this.nextPort++;
    }

    /**
     * Launch new Cursor with CDP and close current instance
     */
    async launchAndReplace() {
        const port = this.getNextPort();

        try {
            if (this.platform === 'win32') {
                // Windows: Use PowerShell Start-Process for truly detached execution
                const psCommand = `Start-Process -FilePath 'cursor' -ArgumentList '--remote-debugging-port=${port}' -WindowStyle Normal`;
                execSync(`powershell -Command "${psCommand}"`, { windowsHide: true });
            } else if (this.platform === 'darwin') {
                // macOS: open command detaches by default
                execSync(`open -a Cursor --args --remote-debugging-port=${port}`);
            } else {
                // Linux: nohup + disown
                execSync(`nohup cursor --remote-debugging-port=${port} > /dev/null 2>&1 &`);
            }

            console.log('CursorLauncher: Launched on port', port);

            // Wait for new instance to start, then close current
            setTimeout(() => {
                vscode.commands.executeCommand('workbench.action.quit');
            }, 2000);

            return { success: true, port };

        } catch (error) {
            console.error('CursorLauncher: Failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Show launch prompt
     */
    async showLaunchPrompt() {
        const choice = await vscode.window.showInformationMessage(
            'Relaunch to activate extension',
            'Relaunch',
            'Cancel'
        );

        if (choice === 'Relaunch') {
            const result = await this.launchAndReplace();

            if (!result.success) {
                vscode.window.showErrorMessage(`Failed: ${result.error}`);
                return 'dismissed';
            }

            return 'launched';
        }

        return 'dismissed';
    }
}

module.exports = { CursorLauncher, BASE_CDP_PORT };
