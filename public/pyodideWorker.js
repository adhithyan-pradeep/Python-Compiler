const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';

importScripts(PYODIDE_CDN);

let pyodide;

self.onmessage = async (e) => {
  const { type, id, code, files, activeFile, stdinBuffer, packageToInstall } = e.data;

  if (type === 'INIT') {
    try {
      pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
      });
      await pyodide.loadPackagesFromImports('import micropip');
      pyodide.setStdout({ batched: (text) => self.postMessage({ type: 'stdout', text }) });
      pyodide.setStderr({ batched: (text) => self.postMessage({ type: 'stderr', text }) });
      
      let stdinString = "";
      let stdinIndex = 0;

      // Setup synchronous stdin via SharedArrayBuffer
      pyodide.setStdin({
        isatty: false,
        stdin: () => {
          if (stdinIndex >= stdinString.length) {
            self.postMessage({ type: 'input_request' });
            const int32 = new Int32Array(stdinBuffer);
            // Wait for main thread to set index 0 to 1
            Atomics.wait(int32, 0, 0);
            
            // Read string from buffer
            const len = int32[1];
            const bytes = new Uint8Array(stdinBuffer, 8, len);
            const decoder = new TextDecoder();
            stdinString = decoder.decode(bytes) + '\n';
            stdinIndex = 0;
            
            // Reset for next input
            int32[0] = 0;
          }
          const charCode = stdinString.charCodeAt(stdinIndex);
          stdinIndex++;
          return charCode;
        }
      });

      // Patch builtins.input to send the prompt message before blocking
      await pyodide.runPythonAsync(`
import builtins
import js

_original_input = builtins.input

def _pyide_input(prompt=''):
    js.postMessage(js.Object.fromEntries([("type", "input_prompt"), ("text", str(prompt))]))
    return _original_input()

builtins.input = _pyide_input
      `);

      self.postMessage({ type: 'INIT_DONE', id });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message, id });
    }
  } else if (type === 'RUN') {
    try {
      // Write files
      pyodide.FS.chdir('/home/pyodide');
      for (const [filename, content] of Object.entries(files)) {
        const parts = filename.split('/');
        if (parts.length > 1) {
          let dir = '/home/pyodide';
          for (let i = 0; i < parts.length - 1; i++) {
            dir += '/' + parts[i];
            try { pyodide.FS.mkdir(dir); } catch (_) {}
          }
        }
        pyodide.FS.writeFile('/home/pyodide/' + filename, content, { encoding: 'utf8' });
      }

      await pyodide.runPythonAsync(`
import sys
if '/home/pyodide' not in sys.path:
    sys.path.insert(0, '/home/pyodide')
      `);
      
      await pyodide.runPythonAsync(files[activeFile] || '');
      self.postMessage({ type: 'RUN_DONE', id });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message, id });
    }
  } else if (type === 'INSTALL') {
     try {
       await pyodide.runPythonAsync(`
import micropip
await micropip.install('${packageToInstall}')
       `);
       self.postMessage({ type: 'INSTALL_DONE', id });
     } catch(err) {
       self.postMessage({ type: 'ERROR', error: err.message, id });
     }
  }
};
