import { useEffect, useRef, useCallback, useState } from 'react';
import useStore from '../store/useStore';

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';

let pyodideInstance = null; // singleton

export function usePyodide() {
  const [ready, setReady] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Initializing PyIDE...');
  const pyRef = useRef(null);

  // stdin queue for interactive input()
  const stdinQueue = useRef([]);
  const stdinResolvers = useRef([]);

  const { appendTerminalLine, setIsRunning, addInstalledPackage } = useStore();

  // Provide next stdin line — returns a Promise that resolves when user types
  const provideStdin = useCallback((line) => {
    if (stdinResolvers.current.length > 0) {
      const resolve = stdinResolvers.current.shift();
      resolve(line);
    } else {
      stdinQueue.current.push(line);
    }
  }, []);

  // Called by Python's input() — waits for user to type
  const readStdinLine = useCallback(() => {
    return new Promise((resolve) => {
      if (stdinQueue.current.length > 0) {
        resolve(stdinQueue.current.shift());
      } else {
        stdinResolvers.current.push(resolve);
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPyodide() {
      try {
        if (pyodideInstance) {
          pyRef.current = pyodideInstance;
          setReady(true);
          setLoadingStatus('');
          return;
        }

        setLoadingStatus('Loading Pyodide runtime...');

        // Dynamically load Pyodide script
        await new Promise((resolve, reject) => {
          if (document.querySelector(`script[src="${PYODIDE_CDN}"]`)) {
            resolve();
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

        // Override stdin to use our interactive queue
        py.setStdin({
          isatty: true,
          readline: async () => {
            const line = await readStdinLine();
            // Echo input back to terminal
            appendTerminalLine({ type: 'stdin', text: line });
            return line + '\n';
          },
        });

        // Load micropip for package installs
        setLoadingStatus('Loading package manager...');
        await py.loadPackagesFromImports('import micropip');

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

    loadPyodide();
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

    // Clear stdin queue from previous run
    stdinQueue.current = [];
    stdinResolvers.current = [];

    try {
      // Write all files to Pyodide filesystem
      py.FS.chdir('/home/pyodide');
      for (const [filename, content] of Object.entries(files)) {
        // Support nested paths (folders)
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

      // Add current dir to sys.path
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
      // PythonError — show traceback
      const msg = err.message || String(err);
      appendTerminalLine({ type: 'stderr', text: msg });
    } finally {
      setIsRunning(false);
      // Resolve any pending input() calls with empty string
      stdinResolvers.current.forEach((r) => r(''));
      stdinResolvers.current = [];
    }
  }, []);

  return { ready, loadingStatus, runCode, installPackage, provideStdin };
}
