import { useState } from 'react';
import { Files, Code2, Terminal as TerminalIcon } from 'lucide-react';
import './MobileLayout.css';

const TABS = [
  { id: 'files', label: 'Files', Icon: Files },
  { id: 'editor', label: 'Editor', Icon: Code2 },
  { id: 'terminal', label: 'Terminal', Icon: TerminalIcon },
];

export default function MobileLayout({ sidebar, editor, terminal }) {
  const [activeTab, setActiveTab] = useState('editor');

  return (
    <div className="mobile-layout">
      <div className="mobile-content">
        <div className={`mobile-panel ${activeTab === 'files' ? 'visible' : ''}`}>
          {sidebar}
        </div>
        <div className={`mobile-panel ${activeTab === 'editor' ? 'visible' : ''}`}>
          {editor}
        </div>
        <div className={`mobile-panel ${activeTab === 'terminal' ? 'visible' : ''}`}>
          {terminal}
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="mobile-tabbar">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`mobile-tabbar-btn ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
