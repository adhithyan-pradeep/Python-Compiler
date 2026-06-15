import { useState, useCallback, useEffect } from 'react';
import { usePyodide } from './pyodide/usePyodide';
import useStore from './store/useStore';
import Topbar from './components/Topbar/Topbar';
import FileTree from './components/FileTree/FileTree';
import Editor from './components/Editor/Editor';
import Terminal from './components/Terminal/Terminal';
import PackageManager from './components/PackageManager/PackageManager';
import ResizablePanel from './components/Layout/ResizablePanel';
import MobileLayout from './components/Layout/MobileLayout';
import './App.css';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function App() {
  const [showPackages, setShowPackages] = useState(false);
  const isMobile = useIsMobile();

  const { files, activeFile, isRunning } = useStore();

  const { ready, loadingStatus, runCode, installPackage, provideStdin, registerInputMode } = usePyodide();

  const handleRun = useCallback(() => {
    if (!ready || isRunning) return;
    runCode(files, activeFile);
  }, [ready, isRunning, files, activeFile, runCode]);

  const sidebar = <FileTree />;
  const editor = <Editor onRun={handleRun} />;
  const terminal = (
    <Terminal
      provideStdin={provideStdin}
      registerInputMode={registerInputMode}
      isRunning={isRunning}
    />
  );

  return (
    <div className="app">
      <Topbar
        onRun={handleRun}
        onOpenPackages={() => setShowPackages(true)}
        isRunning={isRunning}
        pyodideReady={ready}
        loadingStatus={loadingStatus}
      />

      <main className="app-main">
        {isMobile ? (
          <MobileLayout sidebar={sidebar} editor={editor} terminal={terminal} />
        ) : (
          <ResizablePanel sidebar={sidebar} editor={editor} terminal={terminal} />
        )}
      </main>

      {showPackages && (
        <PackageManager
          onClose={() => setShowPackages(false)}
          onInstall={async (pkg) => {
            await installPackage(pkg);
          }}
        />
      )}
    </div>
  );
}
