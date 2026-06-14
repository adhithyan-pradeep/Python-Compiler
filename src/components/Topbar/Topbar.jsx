import { Play, Package, Loader2 } from 'lucide-react';
import './Topbar.css';

export default function Topbar({ onRun, onOpenPackages, isRunning, pyodideReady, loadingStatus }) {
  return (
    <header className="topbar">
      {/* Logo */}
      <div className="topbar-logo">
        <span className="topbar-logo-icon">🐍</span>
        <span className="topbar-logo-text">PyIDE</span>
        <span className="topbar-logo-badge">BETA</span>
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
