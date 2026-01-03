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
    <img src="https://img.shields.io/badge/Open%20VSX-v1.0.12-22c55e?style=for-the-badge&logo=eclipse-ide" alt="Open VSX Version" />
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
  <a href="https://ko-fi.com/ai_dev_2024">☕ Support</a>
</p>

---

## ✨ What is auto-all-Antigravity?

**auto-all-Antigravity** transforms your AI coding experience by eliminating repetitive approval prompts. It automatically accepts file edits, executes terminal commands, and recovers stuck agents—letting your AI work **continuously and autonomously**.

> **✅ 100% Free. No Paywalls. All Features Unlocked.**

---

## ⚡ Status Bar Modes

The extension lives in your status bar with clear, intuitive icons:

| Icon | Mode | Description |
|:---:|:---|:---|
| `$(zap) OFF` | **Disabled** | Extension is off. Click to enable. |
| `⚡ ON` | **Single Tab** | Monitors the active AI agent tab only. |
| `⚡ Multi` | **Multi-Tab** | Monitors ALL agent tabs simultaneously. Perfect for Agent Manager mode. |

### How to Use

1. **Click the status bar icon** to cycle through modes: `OFF → ON → Multi → OFF`
2. **Hover over the icon** to see current state and access settings
3. **Click "Open Settings"** in the tooltip to access the dashboard

### When to Use Each Mode

| Mode | Best For |
|:---|:---|
| **⚡ ON** | Single agent workflows. Light on resources. |
| **⚡ Multi** | Agent Manager with multiple concurrent agents. All tabs monitored in parallel. |

---

## 📸 Dashboard

<p align="center">
  <img src="media/dashboard-overview.png" alt="Impact Dashboard" width="700" />
</p>

The sleek **Impact Dashboard** tracks your productivity gains in real-time:
- **Clicks Saved** — Total manual approvals automated
- **Time Saved** — Minutes recovered from interruptions
- **Sessions** — Active AI sessions monitored
- **Blocked** — Dangerous commands prevented

---

## 🔥 Key Features

| Feature | Description |
| :--- | :--- |
| 🔄 **Auto-Accept File Edits** | Instantly applies AI-suggested code changes without clicking "Accept" |
| 💻 **Auto-Execute Commands** | Runs terminal commands automatically—no more "Run" button clicks |
| 🔁 **Auto-Recover Agents** | Detects and retries when AI agents get stuck or fail |
| ⚡ **Single & Multi-Tab Modes** | Choose between focused single-tab or parallel multi-tab monitoring |
| 🛡️ **Safety Blocklist** | Prevents dangerous commands like `rm -rf /` from running |
| 📊 **Impact Dashboard** | Visual stats on time and clicks saved |
| ⚙️ **Smart Tooltip** | Hover for quick status and one-click settings access |
| 🔄 **Auto-Recovery** | Detects when CDP is lost and prompts to restore connection |

---

## 🛡️ Safety First

Automation doesn't mean reckless execution. The built-in **Safety Rules** system blocks dangerous patterns:

```
rm -rf /
rm -rf ~
rm -rf *
format c:
del /f /s /q
rmdir /s /q
:(){ :|:& };:
```

✏️ Fully customizable—add your own blocked patterns via the dashboard.

---

## 📥 Installation

### From Open VSX (Recommended)
1. Open **Antigravity** or **VS Code**
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for `auto-all-antigravity`
4. Click **Install**

### From VSIX File
```bash
antigravity --install-extension auto-all-antigravity-1.0.11.vsix
```

### Verify Installation
Look for **`⚡ ON`** or **`$(zap) OFF`** in your status bar.

---

## 🎮 Usage

### Status Bar Controls
- **Left-click**: Cycle through modes (OFF → ON → Multi → OFF)
- **Hover**: See current state + click to open settings

### Command Palette
Press `Ctrl+Shift+P` and search for:

| Command | Description |
| :--- | :--- |
| `auto-all-Antigravity: Toggle ON/OFF` | Enable/disable automation |
| `auto-all-Antigravity: Toggle Multi-Tab Mode` | Switch between Single and Multi mode |
| `auto-all-Antigravity: Settings` | Open the Impact Dashboard |

---

## 🔧 Supported IDEs

| IDE | Status |
| :--- | :--- |
| ✅ **Antigravity** | Fully Tested |
| ✅ **VS Code** | Fully Tested |
| ✅ **Cursor** | Fully Tested |

---

## 🔗 Antigravity Manager Compatibility

If you use **Antigravity Manager** to switch between accounts, the extension works seamlessly. For best results, ensure your Manager config (`~/.antigravity_tools/gui_config.json`) includes:

```json
{
  "antigravity_executable": "C:\\Users\\YourUser\\AppData\\Local\\Programs\\Antigravity\\Antigravity.exe",
  "antigravity_args": ["--remote-debugging-port=9000"]
}
```

This ensures Antigravity is always launched with CDP (Chrome DevTools Protocol) enabled, which the extension requires for auto-accepting actions.

> **Note**: If CDP is lost (e.g., Antigravity restarted without the flag), the extension will detect this and prompt you to relaunch.

---

## 🚀 CI/CD & Releases

This project uses **GitHub Actions** to automatically publish new versions to Open VSX.

### How It Works

1. Push a version tag (e.g., `v1.0.12`)
2. GitHub Actions automatically:
   - Builds and packages the extension
   - Publishes to Open VSX
   - Creates a GitHub Release with the VSIX attached

### Quick Release

Maintainers can use the `/release` workflow to automate the entire process—version bump, changelog, commit, tag, and push.

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