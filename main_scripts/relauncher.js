

const vscode = require('vscode');
const { execSync, spawn } = require('child_process');
const os = require('os');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_CDP_PORT = 9000;
const CDP_FLAG = `--remote-debugging-port=${BASE_CDP_PORT}`;

class Relauncher {
    constructor(logger = null) {
        this.platform = os.platform();
        this.logger = logger || console.log;
        this.logFile = path.join(os.tmpdir(), 'auto_accept_relaunch.log');
    }

    log(msg) {
        try {
            const timestamp = new Date().toISOString();
            const formattedMsg = `[Relauncher ${timestamp}] ${msg}`;
            if (this.logger && typeof this.logger === 'function') {
                this.logger(formattedMsg);
            }
            console.log(formattedMsg);
        } catch (e) {
            console.error('Relauncher log error:', e);
        }
    }

    logToFile(msg) {
        this.log(msg);
    }

    async isCDPRunning(port = BASE_CDP_PORT) {
        return new Promise((resolve) => {
            const req = http.get(`http://127.0.0.1:${port}/json`, (res) => {
                resolve(res.statusCode === 200);
            });
            req.on('error', () => resolve(false));
            req.setTimeout(2000, () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    getIDEName() {
        const appName = vscode.env.appName || '';
        if (appName.toLowerCase().includes('cursor')) return 'Cursor';
        if (appName.toLowerCase().includes('antigravity')) return 'Antigravity';
        return 'Code';
    }

    async findIDEShortcuts() {
        const ideName = this.getIDEName();
        this.log(`Finding shortcuts for: ${ideName}`);

        if (this.platform === 'win32') {
            return await this._findWindowsShortcuts(ideName);
        } else if (this.platform === 'darwin') {
            return await this._findMacOSShortcuts(ideName);
        } else {
            return await this._findLinuxShortcuts(ideName);
        }
    }

    async _findWindowsShortcuts(ideName) {
        const shortcuts = [];
        const possiblePaths = [

            path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', ideName, `${ideName}.lnk`),

            path.join(process.env.USERPROFILE || '', 'Desktop', `${ideName}.lnk`),

            path.join(process.env.APPDATA || '', 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar', `${ideName}.lnk`),
        ];

        for (const shortcutPath of possiblePaths) {
            if (fs.existsSync(shortcutPath)) {
                const info = await this._readWindowsShortcut(shortcutPath);
                shortcuts.push({
                    path: shortcutPath,
                    hasFlag: info.hasFlag,
                    type: shortcutPath.includes('Start Menu') ? 'startmenu' :
                        shortcutPath.includes('Desktop') ? 'desktop' : 'taskbar',
                    args: info.args,
                    target: info.target
                });
            }
        }

        this.log(`Found ${shortcuts.length} Windows shortcuts`);
        return shortcuts;
    }

    async _readWindowsShortcut(shortcutPath) {
        const scriptPath = path.join(os.tmpdir(), 'auto_accept_read_shortcut.ps1');

        try {
            const psScript = `
$ErrorActionPreference = "Stop"
try {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
    Write-Output "ARGS:$($shortcut.Arguments)"
    Write-Output "TARGET:$($shortcut.TargetPath)"
} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
}
`;
            fs.writeFileSync(scriptPath, psScript, 'utf8');

            const result = execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, {
                encoding: 'utf8',
                timeout: 10000
            });

            const lines = result.split('\n').map(l => l.trim()).filter(l => l);

            const errorLine = lines.find(l => l.startsWith('ERROR:'));
            if (errorLine) {
                this.log(`Error reading shortcut: ${errorLine.substring(6)}`);
                return { args: '', target: '', hasFlag: false };
            }

            const argsLine = lines.find(l => l.startsWith('ARGS:')) || 'ARGS:';
            const targetLine = lines.find(l => l.startsWith('TARGET:')) || 'TARGET:';

            const args = argsLine.substring(5);
            const target = targetLine.substring(7);
            const hasFlag = args.includes('--remote-debugging-port');

            this.log(`Read shortcut: args="${args}", hasFlag=${hasFlag}`);
            return { args, target, hasFlag };
        } catch (e) {
            this.log(`Error reading shortcut ${shortcutPath}: ${e.message}`);
            return { args: '', target: '', hasFlag: false };
        } finally {
            try { fs.unlinkSync(scriptPath); } catch (e) { }
        }
    }

    async _findMacOSShortcuts(ideName) {
        const shortcuts = [];

        const wrapperPath = path.join(os.homedir(), '.local', 'bin', `${ideName.toLowerCase()}-cdp`);
        if (fs.existsSync(wrapperPath)) {
            const content = fs.readFileSync(wrapperPath, 'utf8');
            shortcuts.push({
                path: wrapperPath,
                hasFlag: content.includes('--remote-debugging-port'),
                type: 'wrapper'
            });
        }

        const appPath = `/Applications/${ideName}.app`;
        if (fs.existsSync(appPath)) {
            shortcuts.push({
                path: appPath,
                hasFlag: false,
                type: 'app'
            });
        }

        this.log(`Found ${shortcuts.length} macOS shortcuts/apps`);
        return shortcuts;
    }

    async _findLinuxShortcuts(ideName) {
        const shortcuts = [];
        const desktopLocations = [
            path.join(os.homedir(), '.local', 'share', 'applications', `${ideName.toLowerCase()}.desktop`),
            `/usr/share/applications/${ideName.toLowerCase()}.desktop`,
        ];

        for (const desktopPath of desktopLocations) {
            if (fs.existsSync(desktopPath)) {
                const content = fs.readFileSync(desktopPath, 'utf8');
                const execMatch = content.match(/^Exec=(.*)$/m);
                const execLine = execMatch ? execMatch[1] : '';

                shortcuts.push({
                    path: desktopPath,
                    hasFlag: execLine.includes('--remote-debugging-port'),
                    type: desktopPath.includes('.local') ? 'user' : 'system',
                    execLine
                });
            }
        }

        this.log(`Found ${shortcuts.length} Linux .desktop files`);
        return shortcuts;
    }

    async ensureShortcutHasFlag(shortcut) {
        if (shortcut.hasFlag) {
            return { success: true, modified: false, message: 'Already has CDP flag' };
        }

        if (this.platform === 'win32') {
            return await this._modifyWindowsShortcut(shortcut.path);
        } else if (this.platform === 'darwin') {
            return await this._createMacOSWrapper();
        } else {
            return await this._modifyLinuxDesktop(shortcut.path);
        }
    }

    async _modifyWindowsShortcut(shortcutPath) {
        const scriptPath = path.join(os.tmpdir(), 'auto_accept_modify_shortcut.ps1');

        try {

            const psScript = `
$ErrorActionPreference = "Stop"
try {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
    
    Write-Output "BEFORE_ARGS:$($shortcut.Arguments)"
    Write-Output "TARGET:$($shortcut.TargetPath)"
    
    $currentArgs = $shortcut.Arguments
    $newPort = '${BASE_CDP_PORT}'
    $portPattern = '--remote-debugging-port=\\d+'
    
    if ($currentArgs -match $portPattern) {
        # Replace existing port with new port
        $shortcut.Arguments = $currentArgs -replace $portPattern, "--remote-debugging-port=$newPort"
        if ($shortcut.Arguments -ne $currentArgs) {
            $shortcut.Save()
            Write-Output "AFTER_ARGS:$($shortcut.Arguments)"
            Write-Output "RESULT:UPDATED"
        } else {
            Write-Output "RESULT:ALREADY_CORRECT"
        }
    } else {
        # No port flag, add it
        $shortcut.Arguments = "--remote-debugging-port=$newPort " + $currentArgs
        $shortcut.Save()
        Write-Output "AFTER_ARGS:$($shortcut.Arguments)"
        Write-Output "RESULT:MODIFIED"
    }
} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
}
`;

            fs.writeFileSync(scriptPath, psScript, 'utf8');
            this.log(`DEBUG: Wrote modify script to ${scriptPath}`);

            const rawResult = execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, {
                encoding: 'utf8',
                timeout: 10000
            });

            this.log(`DEBUG: Raw PowerShell output: ${JSON.stringify(rawResult)}`);

            const lines = rawResult.split('\n').map(l => l.trim()).filter(l => l);
            this.log(`DEBUG: Parsed lines: ${JSON.stringify(lines)}`);

            const errorLine = lines.find(l => l.startsWith('ERROR:'));
            if (errorLine) {
                const errorMsg = errorLine.substring(6);
                this.log(`PowerShell error: ${errorMsg}`);
                return { success: false, modified: false, message: errorMsg };
            }

            const resultLine = lines.find(l => l.startsWith('RESULT:'));
            const result = resultLine ? resultLine.substring(7) : 'UNKNOWN';
            this.log(`DEBUG: Result extracted: "${result}"`);

            if (result === 'MODIFIED') {
                this.log(`Modified shortcut: ${shortcutPath}`);
                return { success: true, modified: true, message: `Modified: ${path.basename(shortcutPath)}` };
            } else if (result === 'UPDATED') {
                this.log(`Updated shortcut port: ${shortcutPath}`);
                return { success: true, modified: true, message: `Updated port: ${path.basename(shortcutPath)}` };
            } else if (result === 'ALREADY_CORRECT') {
                this.log(`Shortcut already has correct CDP port`);
                return { success: true, modified: false, message: 'Already configured with correct port' };
            } else {
                this.log(`Unexpected result: ${result}`);
                return { success: false, modified: false, message: `Unexpected result: ${result}` };
            }
        } catch (e) {
            this.log(`Error modifying shortcut: ${e.message}`);
            if (e.stderr) this.log(`STDERR: ${e.stderr}`);
            return { success: false, modified: false, message: e.message };
        } finally {

            try { fs.unlinkSync(scriptPath); } catch (e) { }
        }
    }

    async _createMacOSWrapper() {
        const ideName = this.getIDEName();
        const wrapperDir = path.join(os.homedir(), '.local', 'bin');
        const wrapperPath = path.join(wrapperDir, `${ideName.toLowerCase()}-cdp`);

        try {

            fs.mkdirSync(wrapperDir, { recursive: true });

            const appBundle = `/Applications/${ideName}.app`;
            const possibleBinaries = [

                path.join(appBundle, 'Contents', 'MacOS', ideName),

                path.join(appBundle, 'Contents', 'Resources', 'app', 'bin', ideName.toLowerCase()),

                path.join(appBundle, 'Contents', 'MacOS', 'Electron'),
            ];

            let binaryPath = null;
            for (const binPath of possibleBinaries) {
                if (fs.existsSync(binPath)) {
                    binaryPath = binPath;
                    this.log(`Found macOS binary at: ${binPath}`);
                    break;
                }
            }

            if (!binaryPath) {

                this.log(`No direct binary found, using 'open -a' method`);
                const scriptContent = `#!/bin/bash
# auto-all-Antigravity - ${ideName} with CDP enabled
# Generated: ${new Date().toISOString()}
# Uses 'open -a' for reliable app launching with arguments
open -a "${appBundle}" --args ${CDP_FLAG} "$@"
`;
                fs.writeFileSync(wrapperPath, scriptContent, { mode: 0o755 });
                this.log(`Created macOS wrapper (open -a method): ${wrapperPath}`);
            } else {
                const scriptContent = `#!/bin/bash
# auto-all-Antigravity - ${ideName} with CDP enabled
# Generated: ${new Date().toISOString()}
"${binaryPath}" ${CDP_FLAG} "$@"
`;
                fs.writeFileSync(wrapperPath, scriptContent, { mode: 0o755 });
                this.log(`Created macOS wrapper (direct binary): ${wrapperPath}`);
            }

            return {
                success: true,
                modified: true,
                message: `Created wrapper script. Launch via: ${wrapperPath}`,
                wrapperPath
            };
        } catch (e) {
            this.log(`Error creating macOS wrapper: ${e.message}`);
            return { success: false, modified: false, message: e.message };
        }
    }

    async _modifyLinuxDesktop(desktopPath) {
        try {
            let content = fs.readFileSync(desktopPath, 'utf8');
            const originalContent = content;

            if (content.includes('--remote-debugging-port')) {

                content = content.replace(
                    /--remote-debugging-port=\d+/g,
                    CDP_FLAG
                );
                if (content === originalContent) {
                    return { success: true, modified: false, message: 'Already configured with correct port' };
                }
            } else {

                content = content.replace(
                    /^(Exec=)(.*)$/m,
                    `$1$2 ${CDP_FLAG}`
                );
            }

            const userDesktopDir = path.join(os.homedir(), '.local', 'share', 'applications');
            const targetPath = desktopPath.includes('.local') ? desktopPath :
                path.join(userDesktopDir, path.basename(desktopPath));

            fs.mkdirSync(userDesktopDir, { recursive: true });
            fs.writeFileSync(targetPath, content);

            this.log(`Modified Linux .desktop: ${targetPath}`);
            return { success: true, modified: true, message: `Modified: ${path.basename(targetPath)}` };
        } catch (e) {
            this.log(`Error modifying .desktop: ${e.message}`);
            return { success: false, modified: false, message: e.message };
        }
    }

    getWorkspaceFolders() {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) return [];
        return folders.map(f => f.uri.fsPath);
    }

    async relaunchViaShortcut(shortcut) {
        const workspaceFolders = this.getWorkspaceFolders();

        this.log(`Relaunching via: ${shortcut.path}`);
        this.log(`Workspaces: ${workspaceFolders.join(', ') || '(none)'}`);

        if (this.platform === 'win32') {
            return await this._relaunchWindows(shortcut, workspaceFolders);
        } else if (this.platform === 'darwin') {
            return await this._relaunchMacOS(shortcut, workspaceFolders);
        } else {
            return await this._relaunchLinux(shortcut, workspaceFolders);
        }
    }

    async _relaunchWindows(shortcut, workspaceFolders) {
        const folderArgs = workspaceFolders.map(f => `"${f}"`).join(' ');
        const ideName = this.getIDEName();

        let targetExe = shortcut.target || '';

        if (!targetExe) {

            try {
                const info = await this._readWindowsShortcut(shortcut.path);
                targetExe = info.target;
            } catch (e) {
                this.log(`Could not read target from shortcut: ${e.message}`);
            }
        }

        const batchFileName = `relaunch_${ideName.replace(/\s+/g, '_')}_${Date.now()}.bat`;
        const batchPath = path.join(os.tmpdir(), batchFileName);

        let commandLine = '';
        if (!targetExe || targetExe.endsWith('.lnk')) {

            this.log('Fallback: Could not resolve EXE, using shortcut path');
            commandLine = `start "" "${shortcut.path}" ${folderArgs}`;
        } else {

            const safeTarget = `"${targetExe}"`;
            commandLine = `start "" ${safeTarget} ${CDP_FLAG} ${folderArgs}`;
        }

        const batchContent = `@echo off
REM auto-all-Antigravity - IDE Relaunch Script
timeout /t 5 /nobreak >nul
${commandLine}
del "%~f0" & exit
`;

        try {
            fs.writeFileSync(batchPath, batchContent, 'utf8');
            this.log(`Created relaunch batch: ${batchPath}`);
            this.log(`Command: ${commandLine}`);

            const child = spawn('explorer.exe', [batchPath], {
                detached: true,
                stdio: 'ignore',
                windowsHide: true
            });
            child.unref();
            this.log('Explorer asked to run batch. Waiting for quit...');

            setTimeout(() => {
                this.log('Closing current window...');
                vscode.commands.executeCommand('workbench.action.quit');
            }, 1000);

            return { success: true };
        } catch (e) {
            this.log(`Relaunch failed: ${e.message}`);
            return { success: false, error: e.message };
        }
    }

    async _relaunchMacOS(shortcut, workspaceFolders) {
        const folderArgs = workspaceFolders.map(f => `"${f}"`).join(' ');

        const scriptPath = path.join(os.tmpdir(), 'relaunch_ide.sh');
        const launchCommand = shortcut.type === 'wrapper'
            ? `"${shortcut.path}" ${folderArgs}`
            : `open -a "${shortcut.path}" --args ${CDP_FLAG} ${folderArgs}`;

        const scriptContent = `#!/bin/bash
sleep 2
${launchCommand}
`;

        try {
            fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
            this.log(`Created macOS relaunch script: ${scriptPath}`);
            this.log(`Shortcut type: ${shortcut.type}`);
            this.log(`Launch command: ${launchCommand}`);

            const child = spawn('/bin/bash', [scriptPath], {
                detached: true,
                stdio: 'ignore'
            });
            child.unref();

            setTimeout(() => {
                vscode.commands.executeCommand('workbench.action.quit');
            }, 1500);

            return { success: true };
        } catch (e) {
            this.log(`macOS relaunch error: ${e.message}`);
            return { success: false, error: e.message };
        }
    }

    async _relaunchLinux(shortcut, workspaceFolders) {
        const folderArgs = workspaceFolders.map(f => `"${f}"`).join(' ');
        const ideName = this.getIDEName().toLowerCase();

        let execCommand = '';
        if (shortcut.execLine) {

            execCommand = shortcut.execLine.replace(/%[fFuUdDnNickvm]/g, '').trim();
        }

        const scriptPath = path.join(os.tmpdir(), 'relaunch_ide.sh');
        const desktopFileName = path.basename(shortcut.path, '.desktop');

        const scriptContent = `#!/bin/bash
sleep 2

# Method 1: gio launch (most reliable for .desktop files)
if command -v gio &> /dev/null; then
    gio launch "${shortcut.path}" ${folderArgs} 2>/dev/null && exit 0
fi

# Method 2: Direct execution from Exec line
${execCommand ? `${execCommand} ${folderArgs} 2>/dev/null && exit 0` : '# No Exec line available'}

# Method 3: gtk-launch fallback
if command -v gtk-launch &> /dev/null; then
    gtk-launch "${desktopFileName}" ${folderArgs} 2>/dev/null && exit 0
fi

# Method 4: Try to find and run the IDE binary directly
for bin in "/usr/bin/${ideName}" "/usr/share/${ideName}/bin/${ideName}" "/opt/${ideName}/bin/${ideName}"; do
    if [ -x "$bin" ]; then
        "$bin" ${CDP_FLAG} ${folderArgs} &
        exit 0
    fi
done

echo "Failed to launch IDE" >&2
exit 1
`;

        try {
            fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
            this.log(`Created Linux relaunch script: ${scriptPath}`);
            this.log(`Desktop file: ${shortcut.path}`);
            this.log(`Exec command: ${execCommand || '(none parsed)'}`);

            const child = spawn('/bin/bash', [scriptPath], {
                detached: true,
                stdio: 'ignore'
            });
            child.unref();

            setTimeout(() => {
                vscode.commands.executeCommand('workbench.action.quit');
            }, 1500);

            return { success: true };
        } catch (e) {
            this.log(`Linux relaunch error: ${e.message}`);
            return { success: false, error: e.message };
        }
    }

    async relaunchWithCDP() {
        this.log('Starting relaunchWithCDP flow...');

        const cdpAvailable = await this.isCDPRunning();
        if (cdpAvailable) {
            this.log('CDP already running, no relaunch needed');
            return { success: true, action: 'none', message: 'CDP already available' };
        }

        const shortcuts = await this.findIDEShortcuts();
        if (shortcuts.length === 0) {
            this.log('No shortcuts found');
            return {
                success: false,
                action: 'error',
                message: 'No IDE shortcuts found. Please create a shortcut first.'
            };
        }

        const primaryShortcut = shortcuts.find(s =>
            s.type === 'startmenu' || s.type === 'wrapper' || s.type === 'user'
        ) || shortcuts[0];

        const modifyResult = await this.ensureShortcutHasFlag(primaryShortcut);
        if (!modifyResult.success) {
            return {
                success: false,
                action: 'error',
                message: `Failed to modify shortcut: ${modifyResult.message}`
            };
        }

        if (modifyResult.modified) {
            primaryShortcut.hasFlag = true;
        }

        this.log('Relaunching IDE...');
        const relaunchResult = await this.relaunchViaShortcut(primaryShortcut);

        if (relaunchResult.success) {
            return {
                success: true,
                action: 'relaunched',
                message: modifyResult.modified
                    ? 'Shortcut updated. Relaunching with CDP enabled...'
                    : 'Relaunching with CDP enabled...'
            };
        } else {
            return {
                success: false,
                action: 'error',
                message: `Relaunch failed: ${relaunchResult.error}`
            };
        }
    }

    async launchAndReplace() {
        return await this.relaunchWithCDP();
    }

    async showRelaunchPrompt() {
        this.log('Showing relaunch prompt');

        const choice = await vscode.window.showInformationMessage(
            'auto-all-Antigravity requires a quick one-time setup to enable background mode. This will restart your IDE with necessary permissions.',
            { modal: false },
            'Setup & Restart',
            'Not Now'
        );

        this.log(`User chose: ${choice}`);

        if (choice === 'Setup & Restart') {
            const result = await this.relaunchWithCDP();

            if (!result.success) {
                vscode.window.showErrorMessage(`Setup failed: ${result.message}`);
            }

            return result.success ? 'relaunched' : 'failed';
        }

        return 'cancelled';
    }

    async showLaunchPrompt() {
        return await this.showRelaunchPrompt();
    }

    getLogFilePath() {
        return this.logFile;
    }
}

module.exports = { Relauncher, BASE_CDP_PORT };
