import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Cross-Origin isolation headers needed for Pyodide (SharedArrayBuffer)
    {
      name: 'configure-response-headers',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          next();
        });
      },
    },
  ],
  optimizeDeps: {
    exclude: ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-web-links'],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('@monaco-editor') || id.includes('monaco-editor')) return 'monaco';
          if (id.includes('@xterm')) return 'xterm';
          if (id.includes('node_modules/react') || id.includes('node_modules/zustand')) return 'vendor';
        },
      },
    },
  },
})
