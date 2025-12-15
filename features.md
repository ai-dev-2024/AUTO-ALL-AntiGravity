# Auto Accept Agent - Feature Documentation

## Overview
Auto Accept Agent is a VS Code and Cursor extension designed to automatically accept AI-generated code suggestions and run commands. It bridges the gap between AI code generation and user confirmation, streamlining the "agentic" coding workflow.

## Core Features

### 1. Universal Auto-Accept Engine
- **Multi-Provider Support**: Automatically detects and triggers "accept" commands for:
  - Antigravity (Google Deepmind)
  - Cursor (via Chrome DevTools Protocol)
  - Standard VS Code Inline Completion
- **Smart Polling**: Uses a non-blocking polling mechanism (default interval: 1s) to continuously check for and accept pending suggestions when enabled.
- **Global Sync**: Synchronizes the "Enabled/Disabled" state across multiple open VS Code/Cursor windows using `globalState`.

### 2. Deep Cursor Integration (CDP)
- **Problem**: Cursor's "Composer" and "Chat" UI elements are outside the standard VS Code Extension Host's reach.
- **Solution**: Chrome DevTools Protocol (CDP) injection that works across all Cursor instances.
- **Functionality**:
  - Automatically discovers all running Cursor instances with CDP enabled.
  - Injects auto-clicker script directly into the renderer process via `Runtime.evaluate`.
  - Works on unfocused windows and across multiple instances.
  - **Click Patterns**: Matches buttons labeled: `accept all`, `accept`, `keep all`, `run command`, `run`, `apply all`, `apply`, `confirm`.
  - **Exclusion**: Intelligently ignores destructive actions like `skip`, `cancel`, `reject`.

### 3. One-Time Setup (Cursor Only)
- **Auto-Configure**: The extension can automatically modify Cursor's `argv.json` to enable remote debugging.
- **Cross-Platform**: Works on Windows, macOS, and Linux with platform-specific path handling.
- **User Flow**: 
  1. Toggle ON → Extension detects CDP not available
  2. Shows setup notification with "Auto-Configure" button
  3. User clicks Auto-Configure → Extension modifies argv.json
  4. User restarts Cursor → CDP now available
  5. All future toggles work instantly

### 4. User Interface
- **Status Bar Control**: A clickable status bar item (`Auto Accept: ON/OFF`) for quick toggling.
- **Connection Status**: Shows CDP connection count when connected (e.g., `Auto Accept: ON (2 CDP)`).
- **Command Palette**: Standard commands under `Auto Accept: ...` namespace.

## Technical Architecture

### Module Overview

| Module | Purpose |
|--------|---------|
| `extension.js` | Main entry point, toggle handling, polling loop |
| `antigravity.js` | Handler for Antigravity IDE commands |
| `cursor-cdp.js` | CDP connection manager and script injection |
| `cursor-process-finder.js` | Cross-platform Cursor instance discovery |
| `setup-helper.js` | One-time setup flow for enabling CDP |

### CDP Communication Flow

```
Extension Toggle ON
       ↓
cursor-process-finder.js scans ports 9222-9232
       ↓
cursor-cdp.js connects via WebSocket to each instance
       ↓
Runtime.evaluate injects auto-clicker script
       ↓
Script polls for accept buttons and clicks them
       ↓
Every 10s: Re-discover and reconnect to new instances
```

## Command List
| Command ID | Title | Description |
|------------|-------|-------------|
| `auto-accept.toggle` | Toggle ON/OFF | Enable/Disable the global auto-accept loop. |
| `auto-accept.acceptNow` | Accept Now | Manually trigger a single accept cycle. |

## Requirements

### For Cursor Users
- **One-time setup**: Enable remote debugging via Auto-Configure or manually adding `"remote-debugging-port": 9222` to Cursor's argv.json.
- **Location of argv.json**:
  - Windows: `%APPDATA%\Cursor\argv.json`
  - macOS: `~/Library/Application Support/Cursor/argv.json`
  - Linux: `~/.config/Cursor/argv.json`

### For Antigravity Users
- No additional setup required. Works out of the box.
