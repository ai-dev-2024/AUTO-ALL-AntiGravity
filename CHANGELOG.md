# Changelog

All notable changes to **auto-all-Antigravity** will be documented in this file.

## [1.0.27] - 2026-02-17

### Fixed

- **Auto-Accept Not Clicking Buttons**: Fixed critical bug where "Run All" and other accept buttons were not being clicked. The button text extraction was picking up "Always run" checkbox text from nearby UI elements, causing the reject filter to block legitimate buttons.
- **Smarter Button Text Extraction**: New `getButtonOwnText()` function extracts only the button's direct text nodes, preventing false-positive rejections from neighboring elements like checkboxes and labels.
- **Removed False Reject Patterns**: Removed `'always run'`, `'always allow'`, `'always proceed'` from the reject list — these are handled separately by the dedicated dropdown handler and were causing unintended button rejections.

---

## [1.0.26] - 2026-02-17

### Added

- **Sponsor Button**: Added `sponsor` field to `package.json` — Ko-Fi link now appears as a prominent "Sponsor" button on the extension page in Antigravity/VS Code
- **Enhanced Ko-Fi Visibility**: Ko-Fi support section is now prominently placed in the README right after Key Features
- **Richer Metadata**: Added `homepage`, `bugs`, and `qna` fields to `package.json` for better marketplace links

---

## [1.0.25] - 2026-02-17

### Fixed

- **"Step Requires Input" Auto-Expand**: Rewrote `expandCollapsedSections()` to reliably find and click the "Expand" button next to "N Step Requires Input" messages. Uses two strategies: first finds the step message text and clicks nearby expand elements, then falls back to broader search within the agent panel.
- **Erratic Clicking on Sidebar/Navigation**: Added `isInConversationArea()` guard that restricts auto-clicking to the agent/conversation panel only. Buttons in the sidebar, file explorer, activity bar, editor area, title bar, and status bar are now excluded.
- **Single-Tab Mode Expand**: The static single-tab polling loop now also calls `expandCollapsedSections()` before clicking accept buttons, matching the behavior of the multi-tab `antigravityLoop`.

---

## [1.0.23] - 2026-02-11

### Added

- **Auto-Expand Collapsed Sections**: Extension now automatically clicks "Expand" on collapsed step sections (e.g., "1 Step Requires Input") to reveal hidden buttons that need approval
- Added `'run all'` explicitly to default accept patterns

### Fixed

- **Button text detection**: Increased text length limit from 50 to 100 chars, fixing cases where "Run All" and other buttons weren't being detected
- Improved text extraction for complex buttons with nested child elements

---

## [1.0.22] - 2026-02-08

### Improved

- **Faster Auto-Accept Response Times**: Reduced all polling delays by ~60%
  - Button polling: 800-1500ms → 300-500ms
  - Tab switch delay: 2000ms → 800ms
  - Cycle wait: 3000-5000ms → 1000-1500ms
  - Single-tab mode: 1000ms → 500ms default

---

## [1.0.21] - 2026-02-06

### Fixed

- **Complete Dropdown Fix**: Removed 'always allow' and 'always auto' from accept patterns in all files
  - Extension now fully ignores "Always run" / "Ask every time" permission dropdowns
  - Fixed issue where dropdown patterns were still in settings-panel.js defaults

---

## [1.0.20] - 2026-02-06

### Fixed

- **Dropdown Items Excluded**: Added 'always run' and 'always allow' to reject list
  - Extension no longer clicks on dropdown menu items
  - Only clicks actual accept/run buttons, not permission dropdown options

---

## [1.0.19] - 2026-02-06

### Fixed

- **True YOLO Mode Restored**: Removed unnecessary dropdown interaction that was causing issues
  - Extension now just clicks accept/run buttons directly like before
  - No longer interacts with "Always run" / "Ask every time" dropdown menu
  - Simplified and faster button detection

### Changed

- Restored 'always allow' to accept patterns for clicking permission dialogs directly

---

## [1.0.18] - 2026-02-06

### Added

- **Ultra-Fast Response Times**: Poll interval reduced to 100ms for near-instant auto-accepting

### Fixed

- **Background Mode Speed**: Multi-tab cycling speeds improved (accept: 50ms, tab switch: 200ms)

---

## [1.0.17] - 2026-02-06

### Added

- **Configurable Button Patterns**: New dashboard section "AUTO-ACCEPT BUTTONS" with checkbox toggles for each button type
- Users can now customize which buttons get auto-accepted (accept, run, proceed, continue, yes, ok, save, etc.)
- Changes are saved instantly with auto-save functionality
- "Select All" and "Reset to Defaults" quick actions

### Fixed

- **Expanded auto-accept button patterns**: Now catches permission dialogs like "Always Allow", "Allow Once", "Proceed", "Continue", "Yes", "OK", "Save", etc.
- **Wider button selectors**: The antigravity loop now scans for general buttons and role="button" elements

---

## [1.0.16] - 2026-02-06

### Fixed

- **Expanded auto-accept button patterns**: Now catches permission dialogs like "Always Allow", "Allow Once", "Proceed", "Continue", "Yes", "OK", "Save", etc.
- **Wider button selectors**: The antigravity loop now scans for general buttons and role="button" elements in addition to `.bg-ide-button-background`, fixing issues where permission prompts weren't being auto-accepted.

---

## [1.0.15] - 2026-01-15

### Fixed

- **Auto-CDP now runs on startup**: Fixed bug where auto-CDP setup only ran when the extension was already enabled. Now it always ensures CDP is available on Antigravity startup, even for fresh installs or when previously disabled.

---

## [1.0.14] - 2026-01-15

### Changed

- **Auto-CDP Setup**: Extension now automatically relaunches Antigravity with CDP enabled on first activation, removing the need for manual "Setup & Restart" approval.

### Fixed

- Extension now works immediately after Antigravity is launched (no manual intervention required).

---

## [1.0.13] - 2026-01-03

### Fixed

- GitHub Actions workflow now handles re-runs gracefully when version is already published.

---

## [1.0.12] - 2026-01-03

### Added

- **GitHub Actions CI/CD**: Automatic publishing to Open VSX when version tags are pushed.
- **Agent release workflow**: Use `/release` or say "update all and push" for one-command releases.
- CI/CD documentation in README.

---

## [1.0.11] - 2026-01-03

### Added

- **Auto-recovery when CDP connections lost**: If Antigravity is restarted by external tools (like Antigravity Manager) without debugging enabled, the extension now detects this and prompts to relaunch with CDP enabled.
- CDP health tracking with 1-minute cooldown to prevent prompt spam.

### Fixed

- Extension now properly recovers when Antigravity Manager switches accounts and restarts Antigravity windows.

### Notes

- For seamless operation with Antigravity Manager, ensure `gui_config.json` has both `antigravity_executable` and `antigravity_args` set with `--remote-debugging-port=9000`.

---

## [1.0.10] - 2026-01-02

### Added

- Multi-Tab mode for monitoring all agent tabs simultaneously
- Impact Dashboard with session statistics
- Safety blocklist for dangerous commands
- Smart tooltip with settings access

### Changed

- Status bar icon cycles through OFF → ON → Multi → OFF

---

## [1.0.9] - 2025-12-28

### Initial Release

- Auto-accept file edits
- Auto-execute terminal commands
- Auto-recover stuck agents
- Single and Multi-Tab modes
- Customizable safety rules
