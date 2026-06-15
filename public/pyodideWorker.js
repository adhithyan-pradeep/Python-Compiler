const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';

importScripts(PYODIDE_CDN);

let pyodide;
let stdinBuffer = null;

// Synchronous JS function that blocks until the main thread provides input
function readLineFromTerminal() {
  self.postMessage({ type: 'input_request' });
  const int32 = new Int32Array(stdinBuffer);
  // Block until main thread sets flag to 1
  Atomics.wait(int32, 0, 0);

  // Read the string from the shared buffer
  const len = int32[1];
  const bytes = new Uint8Array(stdinBuffer, 8, len);
  const decoder = new TextDecoder();
  const str = decoder.decode(bytes.slice(0, len));

  // Reset flag for next call
  int32[0] = 0;

  return str;
}

self.onmessage = async (e) => {
  const { type, id, files, activeFile, packageToInstall } = e.data;

  if (type === 'INIT') {
    // Store the SharedArrayBuffer
    stdinBuffer = e.data.stdinBuffer;

    try {
      pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
        stdout: (text) => self.postMessage({ type: 'stdout', text }),
        stderr: (text) => self.postMessage({ type: 'stderr', text }),
      });

      await pyodide.loadPackagesFromImports('import micropip');

      // Expose the blocking JS readline function to Python
      self.__pyide_readline__ = readLineFromTerminal;

      // Patch builtins.input to:
      // 1. Send the prompt to the terminal UI
      // 2. Call our blocking JS function (no sys.stdin, no /dev/stdin)
      pyodide.runPython(`
import builtins
import js

def _pyide_input(prompt=''):
    if prompt:
        # Send prompt text to terminal UI for display
        from pyodide.ffi import to_js
        js.postMessage(to_js({"type": "input_prompt", "text": str(prompt)}, dict_converter=js.Object.fromEntries))
    # Call the blocking JS function directly — completely bypasses /dev/stdin
    return str(js.__pyide_readline__())

builtins.input = _pyide_input
`);

      self.postMessage({ type: 'INIT_DONE', id });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message, id });
    }
  } else if (type === 'RUN') {
    try {
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
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message, id });
    }
  }
};
