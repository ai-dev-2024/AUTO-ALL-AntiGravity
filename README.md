# Auto Accept Agent

**Automate AI code acceptance with a single toggle.**

---

## How It Works

### Antigravity (VS Code)
Toggle ON → Extension auto-accepts Antigravity suggestions. No setup required.

### Cursor
1. Toggle ON → "Launch Cursor with Auto-Accept?" appears
2. Click **Launch Cursor** → New Cursor window opens with debugging enabled
3. In the **new window**, toggle ON → Auto-accept starts working

**Why the extra step?** Cursor doesn't expose the APIs needed for auto-accept. Launching with debugging enabled allows the extension to inject the auto-clicker.

---

## Usage

| Action | How |
|--------|-----|
| Toggle | Click `Auto Accept: ON/OFF` in status bar |
| Manual trigger | Command Palette → `Auto Accept: Accept Now` |

**Buttons clicked automatically:**
- Accept All / Accept
- Apply All / Apply
- Run Command / Run
- Keep All / Confirm

**Ignored:** Skip, Cancel, Reject, Discard

---

## Multi-Instance Support

Each time you click "Launch Cursor", a new instance opens on the next available port (9222, 9223, etc.). The extension connects to all instances automatically.

---

## Troubleshooting

**Status shows "ON (0 CDP)"**
- CDP not connected. Make sure you launched Cursor via the extension's "Launch Cursor" button.

**Buttons not being clicked**
- Ensure the panel with buttons is visible
- Check that the extension shows "ON" with a connection count

---

## Requirements

- VS Code 1.75.0 or later
- For Cursor: Must launch via extension (or with `--remote-debugging-port=9222`)

---

## License

MIT - see [LICENSE.md](LICENSE.md)
