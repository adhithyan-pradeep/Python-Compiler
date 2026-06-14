import { useState } from 'react';
import { X, Package, Plus, Trash2, Download } from 'lucide-react';
import useStore from '../../store/useStore';
import './PackageManager.css';

const POPULAR_PACKAGES = [
  { name: 'numpy', desc: 'Numerical computing' },
  { name: 'pandas', desc: 'Data analysis' },
  { name: 'matplotlib', desc: 'Data visualization' },
  { name: 'scipy', desc: 'Scientific computing' },
  { name: 'pillow', desc: 'Image processing' },
  { name: 'requests', desc: 'HTTP library' },
  { name: 'sympy', desc: 'Symbolic math' },
  { name: 'scikit-learn', desc: 'Machine learning' },
];

export default function PackageManager({ onClose, onInstall }) {
  const [input, setInput] = useState('');
  const [installing, setInstalling] = useState(null);
  const { installedPackages } = useStore();

  const handleInstall = async (pkgName) => {
    const name = pkgName.trim().toLowerCase();
    if (!name) return;
    setInstalling(name);
    await onInstall(name);
    setInstalling(null);
    setInput('');
  };

  return (
    <div className="pkg-overlay" onClick={onClose}>
      <div className="pkg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pkg-header">
          <div className="pkg-header-left">
            <Package size={18} />
            <span>Package Manager</span>
          </div>
          <button className="pkg-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="pkg-body">
          {/* Install input */}
          <div className="pkg-section">
            <label className="pkg-label">Install Package</label>
            <div className="pkg-input-row">
              <input
                className="pkg-input"
                placeholder="e.g. numpy, pandas, matplotlib"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInstall(input)}
                autoFocus
              />
              <button
                className="pkg-install-btn"
                onClick={() => handleInstall(input)}
                disabled={!input.trim() || installing}
              >
                {installing === input.trim().toLowerCase() ? (
                  <span className="pkg-spinner" />
                ) : (
                  <Download size={14} />
                )}
                Install
              </button>
            </div>
            <p className="pkg-hint">Uses micropip — supports PyPI-compatible packages</p>
          </div>

          {/* Popular packages */}
          <div className="pkg-section">
            <label className="pkg-label">Popular Packages</label>
            <div className="pkg-grid">
              {POPULAR_PACKAGES.map((pkg) => {
                const installed = installedPackages.includes(pkg.name);
                return (
                  <div key={pkg.name} className={`pkg-card ${installed ? 'installed' : ''}`}>
                    <div className="pkg-card-info">
                      <span className="pkg-card-name">{pkg.name}</span>
                      <span className="pkg-card-desc">{pkg.desc}</span>
                    </div>
                    {installed ? (
                      <span className="pkg-badge">✓ Installed</span>
                    ) : (
                      <button
                        className="pkg-card-btn"
                        onClick={() => handleInstall(pkg.name)}
                        disabled={!!installing}
                      >
                        {installing === pkg.name ? <span className="pkg-spinner-sm" /> : <Plus size={12} />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Installed packages */}
          {installedPackages.length > 0 && (
            <div className="pkg-section">
              <label className="pkg-label">Installed This Session</label>
              <div className="pkg-installed-list">
                {installedPackages.map((pkg) => (
                  <span key={pkg} className="pkg-installed-chip">
                    <Package size={11} />
                    {pkg}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
