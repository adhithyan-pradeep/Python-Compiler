import { useEffect, useRef, useCallback, useState } from 'react';
import useStore from '../store/useStore';

let workerInstance = null; // singleton
let nextId = 1;
const resolvers = new Map();
let stdinBuffer = null;

export function usePyodide() {
  const [ready, setReady] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Initializing Pynapple Worker...');
  const workerRef = useRef(null);

  const enableInputModeRef = useRef(null);

  const { appendTerminalLine, setIsRunning, addInstalledPackage } = useStore();

  const registerInputMode = useCallback((fn) => {
    enableInputModeRef.current = fn;
  }, []);

  const provideStdin = useCallback((line) => {
    if (!stdinBuffer) return;
    const int32 = new Int32Array(stdinBuffer);
    const bytes = new Uint8Array(stdinBuffer, 8);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(line);
    
    // Copy to buffer (max 1024 bytes)
    const len = Math.min(encoded.length, bytes.length);
    bytes.set(encoded.subarray(0, len));
    
    int32[1] = len;
    int32[0] = 1; // flag ready
    Atomics.notify(int32, 0); // wake up worker
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initWorker() {
      if (workerInstance) {
        workerRef.current = workerInstance;
        setReady(true);
        setLoadingStatus('');
        return;
      }

      setLoadingStatus('Starting WebWorker...');
      
      const worker = new Worker('/pyodideWorker.js');
      workerInstance = worker;
      workerRef.current = worker;
      
      // 1032 bytes: 8 bytes for int32 array (flag, length), 1024 for string data
      stdinBuffer = new SharedArrayBuffer(1032);

      worker.onmessage = (e) => {
        const { type, text, error, id } = e.data;
        if (type === 'stdout') {
          appendTerminalLine({ type: 'stdout', text });
        } else if (type === 'stderr') {
          appendTerminalLine({ type: 'stderr', text });
        } else if (type === 'input_prompt') {
          appendTerminalLine({ type: 'input_prompt', text });
        } else if (type === 'input_request') {
           enableInputModeRef.current?.();
        } else if (type === 'INIT_DONE' || type === 'RUN_DONE' || type === 'INSTALL_DONE') {
          if (resolvers.has(id)) {
            resolvers.get(id).resolve();
            resolvers.delete(id);
          }
        } else if (type === 'ERROR') {
          if (resolvers.has(id)) {
            resolvers.get(id).reject(new Error(error));
            resolvers.delete(id);
          }
        }
      };

      const id = nextId++;
      resolvers.set(id, {
        resolve: () => {
          if (!cancelled) {
             setReady(true);
             setLoadingStatus('');
          }
        },
        reject: (err) => {
          if (!cancelled) {
             setLoadingStatus('Worker Init Failed');
             appendTerminalLine({ type: 'stderr', text: err.message });
          }
        }
      });

      worker.postMessage({ type: 'INIT', id, stdinBuffer });
    }

    initWorker();
    return () => { cancelled = true; };
  }, []);

  const installPackage = useCallback(async (packageName) => {
    if (!workerRef.current) return;
    const id = nextId++;
    appendTerminalLine({ type: 'system', text: `Installing ${packageName}...` });
    
    return new Promise((resolve, reject) => {
      resolvers.set(id, {
        resolve: () => {
           appendTerminalLine({ type: 'system', text: `✓ ${packageName} installed` });
           addInstalledPackage(packageName);
           resolve();
        },
        reject: (err) => {
           appendTerminalLine({ type: 'stderr', text: `Install failed: ${err.message}` });
           resolve(); // Resolve anyway so UI doesn't hang
        }
      });
      workerRef.current.postMessage({ type: 'INSTALL', id, packageToInstall: packageName });
    });
  }, []);

  const runCode = useCallback(async (files, activeFile) => {
    if (!workerRef.current || !activeFile) return;

    setIsRunning(true);
    const id = nextId++;

    // Reset stdin buffer flag so input() blocks properly on this run
    if (stdinBuffer) {
      const int32 = new Int32Array(stdinBuffer);
      int32[0] = 0;
      int32[1] = 0;
    }

    try {
      appendTerminalLine({ type: 'system', text: `▶ Running ${activeFile}` });
      
      await new Promise((resolve, reject) => {
        resolvers.set(id, { resolve, reject });
        workerRef.current.postMessage({ type: 'RUN', id, files, activeFile });
      });

      appendTerminalLine({ type: 'system', text: '✓ Done' });
    } catch (err) {
      appendTerminalLine({ type: 'stderr', text: err.message });
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { ready, loadingStatus, runCode, installPackage, provideStdin, registerInputMode };
}
