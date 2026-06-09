# EnguePad

[![Release](https://github.com/SrReal/engue-pad/actions/workflows/release.yml/badge.svg)](https://github.com/SrReal/engue-pad/releases)
[![Version](https://img.shields.io/github/v/release/SrReal/engue-pad)](https://github.com/SrReal/engue-pad/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> Lightweight, fast, and hackable desktop code editor built for developers who care about their tools.

EnguePad is a modern cross-platform code editor built with **Tauri v2**, **Svelte 5**, and **TypeScript**. It combines the speed of a native desktop app with the flexibility of web technologies, giving you a responsive editing experience without the bloat of traditional IDEs.

---

## Features

- **Multi-panel layout** — Split editors, terminals, and previews side by side
- **File tree with live updates** — Watch your project files change in real time
- **Symbol outline panel** — Navigate JS/TS functions, classes, and methods instantly
- **Integrated terminal** — Terminal panels per tab group, shell-aware
- **Multi-language support** — Syntax highlighting for JS, TS, HTML, CSS, Python, JSON, Markdown, and more
- **Auto-save** — `afterDelay` and `onFocusChange` modes
- **Command palette** — Quick file navigation and actions
- **Mascot companion** — Customizable animated assistant with events and phrases
- **i18n** — English/Spanish interface
- **Customizable themes** — Modern dark UI with accent color support
- **Markdown live preview** — Toggle between raw and rendered with scroll persistence
- **Cross-platform** — Native builds for macOS (Intel & Apple Silicon) and Windows

---

## Download

Get the latest release from the [Releases](https://github.com/SrReal/engue-pad/releases) page.

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | `.dmg` or `.app.tar.gz` |
| macOS (Intel) | `.dmg` or `.app.tar.gz` |
| Windows | `.msi` or `.exe` |

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/) (latest stable)
- macOS: Xcode Command Line Tools
- Windows: Microsoft Visual C++ Build Tools

### Setup

```bash
git clone https://github.com/SrReal/engue-pad.git
cd engue-pad
npm install
```

### Run (development)

```bash
npm run tauri dev
```

### Build (production)

```bash
npm run tauri build
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Tauri v2](https://v2.tauri.app/) |
| Frontend | [Svelte 5](https://svelte.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Editor | [CodeMirror 6](https://codemirror.net/) |
| Terminal | [xterm.js](https://xtermjs.org/) via Tauri PTY |
| Icons | [Phosphor Icons](https://phosphoricons.com/) |
| Styling | CSS Variables (custom design system) |

---

## Project Structure

```
src/
  lib/
    components/      # UI components (Editor, TabPanel, FileTree, etc.)
    editor/          # CodeMirror extensions, symbol parser, formatter
    i18n/            # Translation dictionaries (en/es)
    layout/          # Split panel layout engine and tab state
    mascot/          # Companion system (sprites, events, phrases)
    todo/            # TODO list parser and store
    workspace/       # Project settings, recent folders, persistence
  routes/            # SvelteKit routes
src-tauri/
  src/               # Rust backend (file I/O, terminal, IPC, CLI)
  capabilities/      # Tauri capability definitions
```

---

## Contributing

Contributions are welcome. Please open an issue first to discuss significant changes.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit with [Conventional Commits](https://www.conventionalcommits.org/)
4. Push and open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE) for details.
