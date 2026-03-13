# Contributing to auto-all-Antigravity

Thanks for your interest in contributing! 🚀

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ai-dev-2024/AUTO-ALL-AntiGravity.git
   cd AUTO-ALL-AntiGravity
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Compile the extension**
   ```bash
   npm run compile
   ```

4. **Test in Antigravity/VS Code**
   - Open the project folder in Antigravity
   - Press `F5` to launch Extension Development Host
   - The extension will be loaded in the new window

## Making Changes

1. Edit source files (`extension.js`, `main_scripts/*.js`)
2. Run `npm run compile` to rebuild
3. Reload the Extension Development Host (`Ctrl+R`)

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to your fork: `git push origin feature/my-feature`
5. Open a Pull Request

## Release Process

Maintainers release new versions by:
1. Updating `package.json` version
2. Updating `CHANGELOG.md`
3. Pushing a version tag (e.g., `git tag v1.0.15 && git push --tags`)

GitHub Actions automatically publishes to Open VSX when a version tag is pushed.

## Questions?

Open an issue on GitHub or reach out via the repository discussions.
