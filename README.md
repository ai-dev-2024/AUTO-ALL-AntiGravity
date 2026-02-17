# auto-all-Antigravity

<p align="center">
  <img src="media/icon.png" alt="auto-all-Antigravity Logo" width="128" />
</p>

<h1 align="center">auto-all-Antigravity</h1>

<p align="center">
  <strong>🚀 Unleash Your AI Agents. Zero Interruptions.</strong>
</p>

<p align="center">
  <a href="https://open-vsx.org/extension/ai-dev-2024/auto-all-antigravity">
    <img src="https://img.shields.io/open-vsx/v/ai-dev-2024/auto-all-antigravity?style=for-the-badge&logo=eclipse-ide&color=22c55e&label=Open%20VSX" alt="Open VSX Version" />
  </a>
  <a href="https://github.com/ai-dev-2024/AUTO-ALL-AntiGravity/releases/latest">
    <img src="https://img.shields.io/github/v/release/ai-dev-2024/AUTO-ALL-AntiGravity?style=for-the-badge&logo=github&color=6366f1&label=Latest" alt="GitHub Release" />
  </a>
  <a href="https://github.com/ai-dev-2024/AUTO-ALL-AntiGravity/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
  </a>
  <a href="https://ko-fi.com/ai_dev_2024">
    <img src="https://img.shields.io/badge/Support-Ko--fi-ff5e5b?style=for-the-badge&logo=ko-fi" alt="Support on Ko-fi" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/ai-dev-2024/AUTO-ALL-AntiGravity">GitHub</a> •
  <a href="https://open-vsx.org/extension/ai-dev-2024/auto-all-antigravity">Open VSX</a> •
  <a href="#-installation">Install</a> •
  <a href="https://ko-fi.com/ai_dev_2024">☕ Support</a>
</p>

---

## ✨ What is auto-all-Antigravity?

**auto-all-Antigravity** transforms your AI coding workflow by eliminating every repetitive approval prompt. It automatically accepts file edits, executes terminal commands, expands collapsed approval steps, and recovers stuck agents — letting your AI work **continuously and autonomously** without any manual intervention.

> **✅ 100% Free. No Paywalls. All Features Unlocked.**

---

## 🔥 Key Features

| Feature | Description |
| :--- | :--- |
| 🔄 **Auto-Accept File Edits** | Instantly applies AI-suggested code changes without clicking "Accept" |
| 💻 **Auto-Execute Commands** | Runs terminal commands automatically — no more "Run" button clicks |
| 📂 **Auto-Expand Steps** | Automatically expands collapsed "N Steps Require Input" sections to reveal hidden approval buttons |
| 🔁 **Auto-Recover Agents** | Detects and retries when AI agents get stuck or fail |
| ⚡ **Single & Multi-Tab Modes** | Choose between focused single-tab or parallel multi-tab monitoring |
| 🛡️ **Safety Blocklist** | Prevents dangerous commands like `rm -rf /` from executing |
| 🎯 **Smart Click Scoping** | Only clicks buttons inside the agent panel — never touches sidebar, file explorer, or editor |
| 📊 **Impact Dashboard** | Visual stats on time saved, clicks automated, and sessions recovered |
| 🔄 **Auto-CDP Recovery** | Detects when CDP connection is lost and prompts to restore it |
| ⚙️ **Configurable Patterns** | Customize which button types get auto-accepted via the dashboard |

---

## ⚡ Status Bar Modes

The extension lives in your status bar with clear, intuitive controls:

| Icon | Mode | Description |
|:---:|:---|:---|
| `$(zap) OFF` | **Disabled** | Extension is off. Click to enable. |
| `⚡ ON` | **Single Tab** | Monitors the active AI agent tab only. |
| `⚡ Multi` | **Multi-Tab** | Monitors ALL agent tabs simultaneously. |

**Click the icon** to cycle through modes: `OFF → ON → Multi → OFF`

| Mode | Best For |
|:---|:---|
| **⚡ ON** | Single agent workflows. Light on resources. |
| **⚡ Multi** | Running multiple concurrent agents. All tabs monitored in parallel. |

---

## 📸 Dashboard

<p align="center">
  <img src="media/dashboard-overview.png" alt="Impact Dashboard" width="700" />
</p>

The **Impact Dashboard** tracks your productivity gains in real-time:

- **Clicks Saved** — Total manual approvals automated
- **Time Saved** — Minutes recovered from interruptions
- **Sessions** — Active AI sessions monitored
- **Blocked** — Dangerous commands prevented

---

## 🛡️ Safety First

Automation doesn't mean reckless execution. The built-in **Safety Rules** system blocks dangerous patterns:

```
rm -rf /          # Recursive root deletion
rm -rf ~          # Home directory wipe
format c:         # Windows drive format
del /f /s /q      # Force delete all files
:(){ :|:& };:     # Fork bomb
dd if=             # Disk overwrite
chmod -R 777 /    # Unrestricted permissions
```

✏️ **Fully customizable** — add regex or literal patterns via the dashboard.

<p align="center">
  <img src="media/safety-rules.png" alt="Safety Rules" width="500" />
</p>

---

## 📥 Installation

### From Open VSX (Recommended)

1. Open **Antigravity**, **VS Code**, or **Cursor**
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for `auto-all-antigravity`
4. Click **Install**

### From VSIX File

Download the latest `.vsix` from [GitHub Releases](https://github.com/ai-dev-2024/AUTO-ALL-AntiGravity/releases/latest), then:

```bash
# Antigravity
antigravity --install-extension auto-all-antigravity-1.0.25.vsix

# VS Code
code --install-extension auto-all-antigravity-1.0.25.vsix

# Cursor
cursor --install-extension auto-all-antigravity-1.0.25.vsix
```

### Verify Installation

Look for **`⚡ ON`** or **`$(zap) OFF`** in your status bar after restarting.

---

## 🎮 Usage

### Status Bar Controls

- **Left-click**: Cycle through modes (`OFF → ON → Multi → OFF`)
- **Hover**: See current state + access settings

### Command Palette

Press `Ctrl+Shift+P` and search for:

| Command | Description |
| :--- | :--- |
| `auto-all-Antigravity: Toggle ON/OFF` | Enable/disable automation |
| `auto-all-Antigravity: Cycle State` | Cycle OFF → Single → Multi → OFF |
| `auto-all-Antigravity: Toggle Multi-Tab Mode` | Switch between Single and Multi mode |
| `auto-all-Antigravity: Settings` | Open the Impact Dashboard |

---

## 🔧 Supported Environments

| IDE | Status |
| :--- | :--- |
| ✅ **Antigravity** | Fully Tested |
| ✅ **VS Code** | Fully Tested |
| ✅ **Cursor** | Fully Tested |

**Requirements**: VS Code engine ≥ 1.75.0

---

## 📅 Version Compatibility

| Extension Version | Date | Key Changes |
| :--- | :--- | :--- |
| **v1.0.25** (Latest) | Feb 2026 | Fixed auto-expand for steps requiring input, scoped clicking to agent panel only |
| v1.0.23 | Feb 2026 | Added auto-expand for collapsed sections |
| v1.0.22 | Feb 2026 | Faster polling (60% reduction in response times) |
| v1.0.21 | Feb 2026 | Handles "Always run" permission dropdown |
| v1.0.17 | Feb 2026 | Configurable button patterns dashboard |
| v1.0.14 | Jan 2026 | Auto-CDP setup on first activation |
| v1.0.10 | Jan 2026 | Multi-Tab mode, Impact Dashboard, Safety blocklist |

> **Note**: Antigravity updates may change the UI. If auto-accept stops working after an update, check for a newer extension version or [open an issue](https://github.com/ai-dev-2024/AUTO-ALL-AntiGravity/issues).

---

## 🔗 Antigravity Manager Integration

If you use **Antigravity Manager** to switch between accounts, the extension works seamlessly. For best results, ensure your Manager config includes the CDP debugging flag:

```json
{
  "antigravity_args": ["--remote-debugging-port=9000"]
}
```

The Manager can also **auto-install** this extension before launching Antigravity — enable this in the Manager's Settings under "Auto-install Extension".

> **CDP Lost?** If Antigravity restarts without the debugging flag, the extension detects this and prompts you to relaunch with CDP enabled.

---

## 🚀 CI/CD & Releases

Releases are fully automated via **GitHub Actions**:

1. Bump version in `package.json`
2. Update `CHANGELOG.md`
3. Commit and push a version tag:

   ```bash
   git tag v1.0.25
   git push origin v1.0.25
   ```

4. GitHub Actions automatically:
   - Builds and packages the extension
   - Publishes to **Open VSX**
   - Creates a **GitHub Release** with the VSIX attached

---

## 🏗️ Architecture

```
auto-all-antigravity/
├── extension.js              # Main entry point (activation, status bar, commands)
├── settings-panel.js         # Impact Dashboard WebView UI
├── main_scripts/
│   ├── cdp-handler.js        # CDP connection management (WebSocket to browser)
│   ├── full_cdp_script.js    # Injected DOM script (button detection, clicking, expand)
│   ├── relauncher.js         # Auto-relaunch with CDP flag
│   ├── auto_accept.js        # Accept button logic
│   ├── overlay.js            # Multi-tab progress overlay
│   └── analytics/            # Click tracking and ROI statistics
├── media/                    # Icons and screenshots
├── .github/workflows/        # CI/CD pipeline
└── package.json              # Extension manifest
```

### How It Works

1. **CDP Connection**: On activation, the extension connects to Antigravity's Chrome DevTools Protocol (CDP) via WebSocket
2. **Script Injection**: Injects `full_cdp_script.js` into the browser page
3. **Smart Detection**: The injected script scans for accept/run buttons using configurable patterns
4. **Scoped Clicking**: `isInConversationArea()` ensures only buttons inside the agent panel are clicked — sidebar, editor, and toolbar are excluded
5. **Auto-Expand**: `expandCollapsedSections()` finds "N Steps Require Input" messages and clicks nearby expand buttons
6. **Safety Check**: Before executing commands, checks against the banned commands list (supports regex patterns)
7. **Analytics**: Tracks clicks, time saved, and blocked commands for the Impact Dashboard

---

## 🤝 Support the Project

This is a **free, open-source project**. If it saves you time, consider supporting development:

<a href="https://ko-fi.com/ai_dev_2024">
  <img src="https://storage.ko-fi.com/cdn/kofi2.png?v=3" alt="Buy Me a Coffee" height="40">
</a>

---

## 🙏 Acknowledgements

This project is a refined fork of [auto-accept-agent](https://github.com/Munkhin/auto-accept-agent) by **MunKhin**. Full credit to the original author for the foundational work.

---

## 📜 License

MIT License — Open and free forever.

<p align="center">
  Made with ❤️ for the AI community
</p>
