# Changelog

All notable changes to **auto-all-Antigravity** will be documented in this file.

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
