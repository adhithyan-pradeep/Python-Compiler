import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_FILES = {
  'main.py': `# Welcome to Pynapple!
# Try running this example or create your own files.

def greet(name):
    return f"Hello, {name}!"

user = input("Enter your name: ")
print(greet(user))
print("\\nYou can also import from other files:")
print("Create utils.py and try: from utils import my_function")
`,
  'utils.py': `# Utility functions
# Import these in main.py with: from utils import *

def add(a, b):
    return a + b

def multiply(a, b):
    return a * b

def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
`,
};

const useStore = create(
  persist(
    (set, get) => ({
      // Theme
      theme: 'dark', // ponytail: simple theme state string

      // File system
      files: DEFAULT_FILES,
      activeFile: 'main.py',
      openTabs: ['main.py'],

      // Terminal
      terminalLines: [],
      isRunning: false,

      // Package manager
      installedPackages: [],

      // Actions — theme
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

      // Actions — files
      createFile: (path, content = '') => {
        const { files, openTabs } = get();
        if (files[path]) return false; // already exists
        set({
          files: { ...files, [path]: content },
          activeFile: path,
          openTabs: openTabs.includes(path) ? openTabs : [...openTabs, path],
        });
        return true;
      },

      deleteFile: (path) => {
        const { files, openTabs, activeFile } = get();
        const newFiles = { ...files };
        delete newFiles[path];
        const newTabs = openTabs.filter((t) => t !== path);
        const newActive =
          activeFile === path
            ? newTabs[newTabs.length - 1] || Object.keys(newFiles)[0] || null
            : activeFile;
        set({ files: newFiles, openTabs: newTabs, activeFile: newActive });
      },

      renameFile: (oldPath, newPath) => {
        const { files, openTabs, activeFile } = get();
        if (files[newPath]) return false;
        const newFiles = { ...files, [newPath]: files[oldPath] };
        delete newFiles[oldPath];
        const newTabs = openTabs.map((t) => (t === oldPath ? newPath : t));
        set({
          files: newFiles,
          openTabs: newTabs,
          activeFile: activeFile === oldPath ? newPath : activeFile,
        });
        return true;
      },

      updateFileContent: (path, content) => {
        const { files } = get();
        set({ files: { ...files, [path]: content } });
      },

      setActiveFile: (path) => {
        const { openTabs } = get();
        set({
          activeFile: path,
          openTabs: openTabs.includes(path) ? openTabs : [...openTabs, path],
        });
      },

      closeTab: (path) => {
        const { openTabs, activeFile } = get();
        const newTabs = openTabs.filter((t) => t !== path);
        const newActive =
          activeFile === path
            ? newTabs[newTabs.length - 1] || null
            : activeFile;
        set({ openTabs: newTabs, activeFile: newActive });
      },

      // Actions — terminal
      appendTerminalLine: (line) => {
        set((s) => ({ terminalLines: [...s.terminalLines, line] }));
      },

      clearTerminal: () => set({ terminalLines: [] }),

      setIsRunning: (v) => set({ isRunning: v }),

      // Actions — packages
      addInstalledPackage: (pkg) => {
        set((s) => ({
          installedPackages: s.installedPackages.includes(pkg)
            ? s.installedPackages
            : [...s.installedPackages, pkg],
        }));
      },
    }),
    {
      name: 'pyide-storage',
      partialize: (state) => ({
        theme: state.theme,
        files: state.files,
        activeFile: state.activeFile,
        openTabs: state.openTabs,
        installedPackages: state.installedPackages,
      }),
    }
  )
);

export default useStore;
