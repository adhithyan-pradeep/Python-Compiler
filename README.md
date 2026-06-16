# Pynapple — Browser Python Compiler

A fully client-side Python IDE built with React, Pyodide, and Monaco Editor.

![Pynapple](public/favicon.svg)

## Features

- **In-Browser Execution**: Runs Python completely locally in the browser using [Pyodide](https://pyodide.org/) (CPython compiled to WebAssembly).
- **Virtual File System**: Create, rename, and delete files and folders. Files are synced to the Pyodide runtime so you can `import` across multiple files normally.
- **Code Editor**: Integrated [Monaco Editor](https://microsoft.github.io/monaco-editor/) (VS Code engine) with full Python syntax highlighting, autocomplete, bracket matching, and a custom dark theme.
- **Interactive Terminal**: [Xterm.js](https://xtermjs.org/) terminal with ANSI color support. Fully supports interactive `input()` prompts — the terminal will pause and wait for user keyboard input during execution.
- **Package Manager**: Install third-party Python packages from PyPI (e.g., `numpy`, `pandas`) dynamically via Pyodide's `micropip`.
- **Offline Persistence**: Your code and files are automatically saved to the browser's `localStorage` and restored on your next visit.
- **Responsive Layout**: Resizable split panels on desktop, and a mobile-friendly tabbed interface for smaller screens.

## Tech Stack

- **Framework**: React + Vite
- **State Management**: Zustand
- **Python Runtime**: Pyodide
- **Editor Component**: `@monaco-editor/react`
- **Terminal Component**: `@xterm/xterm`
- **Styling**: Vanilla CSS with custom CSS variables (Dark Theme)

## Getting Started

### Prerequisites

You only need Node.js installed to run the development server.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/adhithyan-pradeep/Python-Compiler.git
   cd "Python Compiler"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`.

> **Note on Vite Config**: The project requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers to be set in `vite.config.js`. This cross-origin isolation is required by Pyodide to enable `SharedArrayBuffer` for optimal WASM performance.

## Usage

1. **Write Code**: Edit `main.py` in the center panel.
2. **Multiple Files**: Use the Explorer on the left to create new files like `utils.py`. You can `import utils` inside `main.py`.
3. **Run**: Click the "Run" button in the top right or press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> inside the editor.
4. **Install Packages**: Click the "Packages" button to search and install libraries like `matplotlib` or `requests`.

## License

MIT
