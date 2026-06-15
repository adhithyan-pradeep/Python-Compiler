import { useEffect, useRef, useCallback, useState } from 'react';
import useStore from '../store/useStore';

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';

let pyodideInstance = null; // singleton

export function usePyodide() {
  const [ready, setReady] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Initializing PyIDE...');
  const pyRef = useRef(null);

  // stdin queue for interactive input()
  const stdinResolvers = useRef([]);

  // Ref to the terminal's "enter input mode" function — set by Terminal component
  const enableInputModeRef = useRef(null);

  const { appendTerminalLine, setIsRunning, addInstalledPackage } = useStore();

  // Called by Terminal component to register the input-mode activator
  const registerInputMode = useCallback((fn) => {
    enableInputModeRef.current = fn;
  }, []);

  // Called by Terminal when user presses Enter — resolves pending Python input()
  const provideStdin = useCallback((line) => {
    if (stdinResolvers.current.length > 0) {
      const resolve = stdinResolvers.current.shift();
      resolve(line);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initPyodide() {
      try {
        if (pyodideInstance) {
          pyRef.current = pyodideInstance;
          // Re-register input shim on cached instance (new session may need it)
          registerInputShim(pyodideInstance);
          setReady(true);
          setLoadingStatus('');
          return;
        }

        setLoadingStatus('Loading Pyodide runtime...');

        // Dynamically load Pyodide script
        await new Promise((resolve, reject) => {
          if (window.loadPyodide) {
            resolve();
            return;
          }
          const existingScript = document.querySelector(`script[src="${PYODIDE_CDN}"]`);
          if (existingScript) {
            existingScript.addEventListener('load', resolve);
            existingScript.addEventListener('error', reject);
            return;
          }
          const script = document.createElement('script');
          script.src = PYODIDE_CDN;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        setLoadingStatus('Initializing Python...');

        const py = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
          stdout: (text) => appendTerminalLine({ type: 'stdout', text }),
          stderr: (text) => appendTerminalLine({ type: 'stderr', text }),
        });

        // Load micropip
        setLoadingStatus('Loading package manager...');
        await py.loadPackagesFromImports('import micropip');

        // Patch builtins.input to use our terminal
        registerInputShim(py);

        if (!cancelled) {
          pyodideInstance = py;
          pyRef.current = py;
          setReady(true);
          setLoadingStatus('');
        }
      } catch (err) {
        if (!cancelled) {
          setLoadingStatus(`Failed to load: ${err.message}`);
          appendTerminalLine({ type: 'stderr', text: `Pyodide load error: ${err.message}` });
        }
      }
    }

    function registerInputShim(py) {
      // Expose a JS function that Python can call to get a line of stdin
      // This returns a Promise — Python's async runtime awaits it
      window.__pyide_request_input__ = async (prompt) => {
        // Show prompt in terminal
        appendTerminalLine({ type: 'input_prompt', text: prompt || '' });

        // Activate input mode in the terminal UI
        enableInputModeRef.current?.();

        // Wait for user to type and press Enter
        return new Promise((resolve) => {
          stdinResolvers.current.push(resolve);
        });
      };

      // Patch Python's built-in input() to call our JS function
      py.runPython(`
import builtins
import js

async def _pyide_input(prompt=''):
    result = await js.__pyide_request_input__(str(prompt))
    return result

# Replace synchronous input with our async version
builtins.input = _pyide_input
`);
    }

    initPyodide();
    return () => { cancelled = true; };
  }, []);

  const installPackage = useCallback(async (packageName) => {
    if (!pyRef.current) return;
    const py = pyRef.current;
    try {
      appendTerminalLine({ type: 'system', text: `Installing ${packageName}...` });
      await py.runPythonAsync(`
import micropip
await micropip.install('${packageName}')
`);
      appendTerminalLine({ type: 'system', text: `✓ ${packageName} installed` });
      addInstalledPackage(packageName);
    } catch (err) {
      appendTerminalLine({ type: 'stderr', text: `Install failed: ${err.message}` });
    }
  }, []);

  const runCode = useCallback(async (files, activeFile) => {
    if (!pyRef.current || !activeFile) return;
    const py = pyRef.current;

    setIsRunning(true);

    // Clear any pending stdin resolvers from previous run
    stdinResolvers.current = [];

    try {
      // Write all files to Pyodide filesystem
      py.FS.chdir('/home/pyodide');
      for (const [filename, content] of Object.entries(files)) {
        const parts = filename.split('/');
        if (parts.length > 1) {
          let dir = '/home/pyodide';
          for (let i = 0; i < parts.length - 1; i++) {
            dir += '/' + parts[i];
            try { py.FS.mkdir(dir); } catch (_) {}
          }
        }
        py.FS.writeFile('/home/pyodide/' + filename, content, { encoding: 'utf8' });
      }

      // Ensure working dir on sys.path
      await py.runPythonAsync(`
import sys
if '/home/pyodide' not in sys.path:
    sys.path.insert(0, '/home/pyodide')
`);

      appendTerminalLine({ type: 'system', text: `▶ Running ${activeFile}` });

      const code = files[activeFile] || '';
      await py.runPythonAsync(code);

      appendTerminalLine({ type: 'system', text: '✓ Done' });
    } catch (err) {
      const msg = err.message || String(err);
      appendTerminalLine({ type: 'stderr', text: msg });
    } finally {
      setIsRunning(false);
      // Unblock any hanging input() calls
      stdinResolvers.current.forEach((r) => r(''));
      stdinResolvers.current = [];
    }
  }, []);

  return { ready, loadingStatus, runCode, installPackage, provideStdin, registerInputMode };
}
