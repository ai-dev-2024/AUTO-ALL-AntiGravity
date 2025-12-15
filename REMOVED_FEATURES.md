# Removed Features Log

This document records all features, files, and logic removed from the `auto-accept-agent` extension to reduce it to its basic "Antigravity" form (v2.5.3).

## 1. Files Deleted
*   `welcome.html`: The HTML template for the Cursor onboarding webview.

## 2. Extension Logic (`extension.js`)

### Licensing & Monetization
*   **Payment System**: Removed all Stripe integration links and checkout URLs.
*   **License Checking**: Removed `checkLicenseStatus` and `silentLicenseCheck` functions that queried the external API.
*   **User Restoration**: Removed `restoreLicense` logic (email lookup via API).
*   **State Management**: Removed persistence of `isPro` status and `userId` generation/storage.
*   **UUID Generation**: Removed custom `generateUUID` fallback function.

### Local Server & Bridge
*   **Local HTTP Server**: Removed the `LocalServer` class that listened on ports 54321-54330.
*   **Status Endpoint**: Removed the `/status` endpoint used by the injected script to check extension state.
*   **Heartbeat Logic**: Removed tracking of the injected script's heartbeat.

### Onboarding & UI
*   **Welcome Panel**: Removed the `WelcomePanel` class that managed the setup webview.
    *   Removed logic for generating the specific loader script dynamically.
    *   Removed automatic copying of the loader script to clipboard.
*   **Commands Discovery**: Removed the debug tool that printed all available IDE commands to the output channel.

### Handlers
*   **Status Bar**: Simplified status bar. Removed "Pro/Free" status indicators.

## 3. Configuration (`package.json`)

### Removed Commands
The following commands were removed from the Command Palette contribution:
*   `auto-accept.upgrade`: "Upgrade to Pro"
*   `auto-accept.checkLicense`: "Check License"
*   `auto-accept.restoreLicense`: "Restore License"
*   `auto-accept.showStatus`: "Show Status"
*   `auto-accept.discoverCommands`: "Discover Commands"
*   `auto-accept.activateCursor`: "Activate for Cursor"
*   `auto-accept.showCursorWelcome`: "Show Cursor Welcome Panel"

## 4. Documentation (`features.md`)
*   Removed **Licensing & Monetization** section.
*   Removed **Technical Architecture** section (Local Server).
*   Updated **Command List** to include only `toggle` and `acceptNow`.

## Summary of Remaining Functionality
The extension now strictly performs:
1.  **Command Detection**: Identifies "accept" commands for Antigravity, Cursor, and Copilot.
2.  **Polling**: Periodically triggers these accept commands (default 1s interval).
3.  **Toggling**: Allows valid ON/OFF state management via Status Bar.
4.  **Global Sync**: Syncs ON/OFF state across windows.
