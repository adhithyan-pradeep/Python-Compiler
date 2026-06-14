import { useRef, useState, useEffect, useCallback } from 'react';
import './ResizablePanel.css';

const MIN_SIZE = 15; // minimum percent
const MAX_SIZE = 85; // maximum percent
const STORAGE_KEY = 'pyide-panel-sizes';

function loadSizes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function saveSizes(sizes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
  } catch (_) {}
}

/**
 * ResizablePanel — horizontal 3-panel layout:
 * [sidebar] | [editor] | [terminal]
 * Each separator is draggable.
 */
export default function ResizablePanel({ sidebar, editor, terminal }) {
  const [sizes, setSizes] = useState(() => {
    const saved = loadSizes();
    return saved || { sidebar: 18, editor: 47, terminal: 35 };
  });

  const containerRef = useRef(null);
  const draggingRef = useRef(null); // 'left' | 'right'
  const startXRef = useRef(0);
  const startSizesRef = useRef(null);

  const handleMouseDown = useCallback((sep) => (e) => {
    e.preventDefault();
    draggingRef.current = sep;
    startXRef.current = e.clientX;
    startSizesRef.current = { ...sizes };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sizes]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!draggingRef.current || !containerRef.current) return;
      const containerW = containerRef.current.getBoundingClientRect().width;
      const dx = ((e.clientX - startXRef.current) / containerW) * 100;

      setSizes((prev) => {
        const s = { ...startSizesRef.current };

        if (draggingRef.current === 'left') {
          // Between sidebar and editor
          const newSidebar = Math.min(MAX_SIZE, Math.max(MIN_SIZE, s.sidebar + dx));
          const delta = newSidebar - s.sidebar;
          const newEditor = Math.max(MIN_SIZE, s.editor - delta);
          if (newEditor < MIN_SIZE) return prev;
          return { ...s, sidebar: newSidebar, editor: newEditor };
        } else {
          // Between editor and terminal
          const newEditor = Math.min(MAX_SIZE, Math.max(MIN_SIZE, s.editor + dx));
          const delta = newEditor - s.editor;
          const newTerminal = Math.max(MIN_SIZE, s.terminal - delta);
          if (newTerminal < MIN_SIZE) return prev;
          return { ...s, editor: newEditor, terminal: newTerminal };
        }
      });
    };

    const onMouseUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSizes((s) => { saveSizes(s); return s; });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="resizable-container" ref={containerRef}>
      {/* Sidebar */}
      <div className="panel" style={{ width: `${sizes.sidebar}%` }}>
        {sidebar}
      </div>

      {/* Separator 1 */}
      <div
        className="separator"
        onMouseDown={handleMouseDown('left')}
        title="Drag to resize"
      >
        <div className="separator-handle" />
      </div>

      {/* Editor */}
      <div className="panel" style={{ width: `${sizes.editor}%` }}>
        {editor}
      </div>

      {/* Separator 2 */}
      <div
        className="separator"
        onMouseDown={handleMouseDown('right')}
        title="Drag to resize"
      >
        <div className="separator-handle" />
      </div>

      {/* Terminal */}
      <div className="panel" style={{ width: `${sizes.terminal}%` }}>
        {terminal}
      </div>
    </div>
  );
}
