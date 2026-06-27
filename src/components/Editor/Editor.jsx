import { useRef, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import useStore from '../../store/useStore';
import './Editor.css';

const MONACO_OPTIONS = {
  fontSize: 14,
  fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  fontLigatures: true,
  lineHeight: 22,
  minimap: { enabled: false },
  scrollbar: {
    verticalScrollbarSize: 6,
    horizontalScrollbarSize: 6,
  },
  padding: { top: 16, bottom: 16 },
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  renderLineHighlight: 'gutter',
  bracketPairColorization: { enabled: true },
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always',
  formatOnPaste: true,
  wordWrap: 'off',
  tabSize: 4,
  insertSpaces: true,
  scrollBeyondLastLine: false,
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
  theme: 'pyide-dark',
};

function defineThemes(monaco) {
  // ponytail: define dark theme
  monaco.editor.defineTheme('pyide-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'C792EA', fontStyle: 'bold' },
      { token: 'string', foreground: 'C3E88D' },
      { token: 'comment', foreground: '546E7A', fontStyle: 'italic' },
      { token: 'number', foreground: 'F78C6C' },
      { token: 'type', foreground: '82AAFF' },
      { token: 'function', foreground: '82AAFF' },
      { token: 'class', foreground: 'FFCB6B' },
      { token: 'variable', foreground: 'EEFFFF' },
      { token: 'operator', foreground: '89DDFF' },
      { token: 'delimiter', foreground: '89DDFF' },
    ],
    colors: {
      'editor.background': '#0D1117',
      'editor.foreground': '#EEFFFF',
      'editor.lineHighlightBackground': '#161B22',
      'editor.selectionBackground': '#264F7840',
      'editor.inactiveSelectionBackground': '#264F7820',
      'editorLineNumber.foreground': '#30363D',
      'editorLineNumber.activeForeground': '#6E7681',
      'editorCursor.foreground': '#58A6FF',
      'editor.findMatchBackground': '#FFCB6B30',
      'editor.findMatchHighlightBackground': '#FFCB6B20',
      'editorIndentGuide.background1': '#21262D',
      'editorIndentGuide.activeBackground1': '#30363D',
      'editorBracketMatch.background': '#58A6FF20',
      'editorBracketMatch.border': '#58A6FF60',
      'scrollbar.shadow': '#00000060',
      'scrollbarSlider.background': '#30363D80',
      'scrollbarSlider.hoverBackground': '#30363DAA',
      'scrollbarSlider.activeBackground': '#58A6FF60',
    },
  });

  // ponytail: define light theme matching GitHub light look
  monaco.editor.defineTheme('pyide-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '0969DA', fontStyle: 'bold' },
      { token: 'string', foreground: '1A7F37' },
      { token: 'comment', foreground: '8C959F', fontStyle: 'italic' },
      { token: 'number', foreground: '0550AE' },
      { token: 'type', foreground: '953800' },
      { token: 'function', foreground: '8250DF' },
      { token: 'class', foreground: 'CF222E' },
      { token: 'variable', foreground: '24292F' },
      { token: 'operator', foreground: '0969DA' },
      { token: 'delimiter', foreground: '24292F' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#24292F',
      'editor.lineHighlightBackground': '#F6F8FA',
      'editor.selectionBackground': '#0969DA20',
      'editor.inactiveSelectionBackground': '#0969DA10',
      'editorLineNumber.foreground': '#8C959F',
      'editorLineNumber.activeForeground': '#57606A',
      'editorCursor.foreground': '#0969DA',
      'editor.findMatchBackground': '#FFD83B40',
      'editor.findMatchHighlightBackground': '#FFD83B20',
      'editorIndentGuide.background1': '#D0D7DE',
      'editorIndentGuide.activeBackground1': '#8C959F',
      'editorBracketMatch.background': '#0969DA20',
      'editorBracketMatch.border': '#0969DA60',
      'scrollbar.shadow': '#00000010',
      'scrollbarSlider.background': '#8C959F40',
      'scrollbarSlider.hoverBackground': '#8C959F60',
      'scrollbarSlider.activeBackground': '#0969DA40',
    },
  });
}

export default function Editor({ onRun }) {
  const editorRef = useRef(null);
  const onRunRef = useRef(onRun);
  const { files, activeFile, openTabs, updateFileContent, setActiveFile, closeTab, theme } = useStore();

  // Keep the ref in sync so Monaco's command always calls the latest onRun
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Ctrl+Enter / Cmd+Enter → run (uses ref to avoid stale closure)
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => onRunRef.current?.()
    );

    // Ctrl+S → save (no-op, already live, just prevent browser save)
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {}
    );
  };

  const handleBeforeMount = (monaco) => {
    defineThemes(monaco);
  };

  const currentContent = activeFile ? (files[activeFile] ?? '') : '';

  const getFileIcon = (filename) => {
    if (filename.endsWith('.py')) return '🍍';
    if (filename.endsWith('.txt')) return '📄';
    if (filename.endsWith('.json')) return '📋';
    if (filename.endsWith('.md')) return '📝';
    return '📄';
  };

  return (
    <div className="editor-container">
      {/* Tab bar */}
      <div className="editor-tabs">
        <div className="editor-tabs-scroll">
          {openTabs.map((tab) => {
            const name = tab.split('/').pop();
            return (
              <div
                key={tab}
                className={`editor-tab ${activeFile === tab ? 'active' : ''}`}
                onClick={() => setActiveFile(tab)}
              >
                <span className="tab-icon">{getFileIcon(name)}</span>
                <span className="tab-name">{name}</span>
                <button
                  className="tab-close"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab); }}
                  title="Close tab"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monaco Editor */}
      {activeFile ? (
        <div className="editor-monaco-wrapper">
          <MonacoEditor
            height="100%"
            language="python"
            value={currentContent}
            options={MONACO_OPTIONS}
            theme={theme === 'light' ? 'pyide-light' : 'pyide-dark'}
            onChange={(val) => updateFileContent(activeFile, val ?? '')}
            onMount={handleEditorDidMount}
            beforeMount={handleBeforeMount}
            loading={
              <div className="editor-loading">
                <div className="editor-loading-spinner" />
                <span>Loading Editor...</span>
              </div>
            }
          />
        </div>
      ) : (
        <div className="editor-empty">
          <div className="editor-empty-icon">🍍</div>
          <p>No file open</p>
          <p className="editor-empty-hint">Create or select a file from the explorer</p>
        </div>
      )}
    </div>
  );
}
