---
description: How to package the VS Code extension into a VSIX file
---

# Package Extension Workflow

## Pre-Packaging Checklist

Before running `vsce package`, ALWAYS verify:

### 1. Check `.vscodeignore` correctly handles node_modules:

The `.vscodeignore` MUST have these lines to include the `ws` module:
```
node_modules/**
!node_modules/ws/**
```

This excludes all of node_modules EXCEPT the `ws` folder which is required for Cursor CDP.

### 2. Check `.vscodeignore` does NOT exclude these required files:
- `settings-panel.js` - Pro features UI
- `main_scripts/` - Cursor/Antigravity handlers
- `extension.js` - main entry point

### 3. Verify `node_modules/ws` exists:
```powershell
Test-Path -Path "node_modules/ws"
```

If it doesn't exist, run:
```powershell
npm install
```

### 4. Verify what will be packaged:
// turbo
```powershell
npx @vscode/vsce ls | Select-String -Pattern "node_modules|ws|settings"
```

Expected output should include:
- `settings-panel.js`
- `node_modules/ws/*` files

## Package Command

// turbo
```powershell
npx @vscode/vsce package --no-dependencies
```

The `--no-dependencies` flag prevents vsce from running `npm install --production`.

## Post-Packaging Verification

Check the new VSIX was created:
// turbo
```powershell
Get-ChildItem -Filter "*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 Name, Length
```

## Common Errors

### "Cannot find module 'ws'"
**Cause:** `node_modules/ws` was excluded from the VSIX package.
**Fix:** 
1. Ensure `.vscodeignore` has:
   ```
   node_modules/**
   !node_modules/ws/**
   ```
2. Ensure `ws` is in `dependencies` (not `devDependencies`) in `package.json`
3. Run `npm install` before packaging
4. Run `npx @vscode/vsce ls` to verify ws is listed

### Settings panel not opening / "Failed to load SettingsPanel"
**Cause:** `settings-panel.js` was excluded from VSIX.
**Fix:** Remove `settings-panel.js` from `.vscodeignore`

### Status bar not showing
**Cause:** Extension activation is crashing before status bar is created.
**Fix:** Check Developer Tools console for errors. Likely a require() failure.
