import { Play, Package, Loader2, Download, Sun, Moon } from 'lucide-react';
import JSZip from 'jszip';
import useStore from '../../store/useStore';
import './Topbar.css';

export default function Topbar({ onRun, onOpenPackages, isRunning, pyodideReady, loadingStatus }) {
  const { theme, toggleTheme } = useStore(); // ponytail: hook up store theme state

  const handleDownload = async () => {
    // ponytail: get state directly to avoid re-renders
    const files = useStore.getState().files;
    const zip = new JSZip();
    Object.entries(files).forEach(([name, content]) => {
      zip.file(name, content);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pynapple_project.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="topbar">
      {/* Logo */}
      <div className="topbar-logo">
        <span className="topbar-logo-icon">🍍</span>
      </div>

      {/* Center: loading status */}
      {!pyodideReady && loadingStatus && (
        <div className="topbar-loading">
          <Loader2 size={13} className="topbar-spinner-icon" />
          <span>{loadingStatus}</span>
        </div>
      )}

      {/* Actions */}
      <div className="topbar-actions">
        <button
          className="topbar-btn topbar-btn-ghost theme-toggle"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>

        <button
          className="topbar-btn topbar-btn-ghost"
          onClick={handleDownload}
          title="Download as ZIP"
        >
          <Download size={14} />
          <span>Download</span>
        </button>

        <button
          className="topbar-btn topbar-btn-ghost"
          onClick={onOpenPackages}
          title="Package Manager"
          disabled={!pyodideReady}
        >
          <Package size={14} />
          <span>Packages</span>
        </button>

        <button
          className={`topbar-btn topbar-btn-run ${isRunning ? 'running' : ''}`}
          onClick={onRun}
          disabled={!pyodideReady || isRunning}
          title="Run (Ctrl+Enter)"
        >
          {isRunning ? (
            <>
              <Loader2 size={14} className="topbar-spinner-icon" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              <span>Run</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
