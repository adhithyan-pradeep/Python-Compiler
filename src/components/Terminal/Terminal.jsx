import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Trash2 } from 'lucide-react';
import useStore from '../../store/useStore';
import '@xterm/xterm/css/xterm.css';
import './Terminal.css';

// ANSI color codes
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[38;2;248;81;73m',
  green: '\x1b[38;2;63;185;80m',
  yellow: '\x1b[38;2;255;203;107m',
  cyan: '\x1b[38;2;88;166;255m',
  gray: '\x1b[38;2;110;118;129m',
  white: '\x1b[38;2;230;237;243m',
  purple: '\x1b[38;2;199;146;234m',
};

export default function Terminal({ provideStdin, registerInputMode, isRunning }) {
  const termRef = useRef(null);
  const xtermRef = useRef(null);
  const containerRef = useRef(null);

  // Interactive stdin state — all in refs so xterm's onKey closure always sees current value
  const inputBufferRef = useRef('');
  const inputModeRef = useRef(false);

  const { terminalLines, clearTerminal } = useStore();
  const prevLinesLengthRef = useRef(0);

  // Initialize XTerm once
  useEffect(() => {
    const xterm = new XTerm({
      theme: {
        background: '#0D1117',
        foreground: '#E6EDF3',
        cursor: '#58A6FF',
        cursorAccent: '#0D1117',
        selectionBackground: '#264F7840',
        black: '#0D1117',
        red: '#F85149',
        green: '#3FB950',
        yellow: '#D29922',
        blue: '#58A6FF',
        magenta: '#C792EA',
        cyan: '#39C5CF',
        white: '#E6EDF3',
        brightBlack: '#6E7681',
        brightRed: '#FF7B72',
        brightGreen: '#56D364',
        brightYellow: '#E3B341',
        brightBlue: '#79C0FF',
        brightMagenta: '#D2A8FF',
        brightCyan: '#56D4DD',
        brightWhite: '#F0F6FC',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
      fontSize: 13.5,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      convertEol: true,
      allowTransparency: false,
      disableStdin: false,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    xterm.open(termRef.current);
    fitAddon.fit();
    xtermRef.current = xterm;

    // Welcome banner
    setTimeout(() => {
      xterm.writeln(`${ANSI.cyan}${ANSI.bold}╔══════════════════════════════════════╗${ANSI.reset}`);
      xterm.writeln(`${ANSI.cyan}${ANSI.bold}║  🐍 PyIDE — Python Browser Compiler  ║${ANSI.reset}`);
      xterm.writeln(`${ANSI.cyan}${ANSI.bold}╚══════════════════════════════════════╝${ANSI.reset}`);
      xterm.writeln('');
      xterm.writeln(`${ANSI.gray}Press Ctrl+Enter in the editor or click Run to execute.${ANSI.reset}`);
      xterm.writeln('');
    }, 100);

    // Keyboard handler for special keys
    xterm.onKey(({ domEvent }) => {
      if (!inputModeRef.current) return;

      if (domEvent.key === 'Enter') {
        xterm.write('\r\n');
        const line = inputBufferRef.current;
        inputBufferRef.current = '';
        inputModeRef.current = false;
        provideStdin?.(line);
      } else if (domEvent.key === 'Backspace') {
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          xterm.write('\b \b');
        }
      }
    });

    // Handle all printable input (typing + paste)
    xterm.onData((data) => {
      if (!inputModeRef.current) return;
      // Skip backspace (\x7f) and enter (\r) which are handled by onKey
      if (data === '\x7f' || data === '\r') return;
      
      const safe = data.replace(/[^\x20-\x7E]/g, '');
      if (safe) {
        inputBufferRef.current += safe;
        xterm.write(safe);
      }
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch (_) {}
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      xterm.dispose();
    };
  }, []);

  // Register the enableInputMode callback with usePyodide so it can activate us
  useEffect(() => {
    registerInputMode?.(() => {
      inputModeRef.current = true;
      inputBufferRef.current = '';
      // Focus terminal so user can type immediately
      xtermRef.current?.focus();
    });
  }, [registerInputMode]);

  // Render new lines arriving in the store
  useEffect(() => {
    const xterm = xtermRef.current;
    if (!xterm) return;

    const lines = terminalLines;

    // Handle clear
    if (lines.length < prevLinesLengthRef.current) {
      xterm.reset();
      xterm.clear();
      prevLinesLengthRef.current = 0;
    }

    const newLines = lines.slice(prevLinesLengthRef.current);
    prevLinesLengthRef.current = lines.length;

    newLines.forEach((line) => {
      switch (line.type) {
        case 'stdout':
          xterm.write(`${ANSI.white}${line.text}${ANSI.reset}\r\n`);
          break;

        case 'stderr':
          xterm.write(`${ANSI.red}${line.text}${ANSI.reset}\r\n`);
          break;

        case 'stdin':
          // Already echoed character-by-character as user types
          break;

        case 'input_prompt':
          // Show the prompt string (e.g. "Enter your name: ")
          // Input mode is activated separately via registerInputMode callback
          xterm.write(`${ANSI.yellow}${line.text}${ANSI.reset}`);
          break;

        case 'system':
          if (line.text.startsWith('▶')) {
            xterm.write(`\r\n${ANSI.cyan}${ANSI.bold}${line.text}${ANSI.reset}\r\n`);
          } else if (line.text.startsWith('✓')) {
            xterm.write(`${ANSI.green}${line.text}${ANSI.reset}\r\n\r\n`);
          } else if (line.text.includes('Installing')) {
            xterm.write(`${ANSI.yellow}⟳ ${line.text}${ANSI.reset}\r\n`);
          } else {
            xterm.write(`${ANSI.gray}${line.text}${ANSI.reset}\r\n`);
          }
          break;

        default:
          xterm.write(`${line.text}\r\n`);
      }
    });
  }, [terminalLines]);

  // Disable input mode when run finishes
  useEffect(() => {
    if (!isRunning) {
      inputModeRef.current = false;
      inputBufferRef.current = '';
    }
  }, [isRunning]);

  const handleClear = useCallback(() => {
    clearTerminal();
    xtermRef.current?.reset();
    xtermRef.current?.clear();
    prevLinesLengthRef.current = 0;
  }, [clearTerminal]);

  return (
    <div className="terminal-container" ref={containerRef}>
      <div className="terminal-header">
        <span className="terminal-title">TERMINAL</span>
        {isRunning && (
          <span className="terminal-running-badge">
            <span className="running-dot" />
            Running
          </span>
        )}
        <div className="terminal-toolbar">
          <button title="Clear terminal" onClick={handleClear}>
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>
      <div className="terminal-xterm-wrapper" ref={termRef} />
    </div>
  );
}
