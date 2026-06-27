import { useState, useRef } from 'react';
import {
  File,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit3,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
} from 'lucide-react';
import useStore from '../../store/useStore';
import './FileTree.css';

// ponytail: predefined code templates for bootstrapping files
const TEMPLATES = [
  {
    name: 'Hello World',
    filename: 'hello.py',
    content: `# Simple greeting program\nname = input("What is your name? ")\nprint(f"Hello, {name}!")\n`,
  },
  {
    name: 'Sorting (QuickSort)',
    filename: 'sorting.py',
    content: `# QuickSort algorithm demo\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)\n\ntest_data = [3, 6, 8, 10, 1, 2, 1]\nprint("Original:", test_data)\nprint("Sorted:  ", quicksort(test_data))\n`,
  },
  {
    name: 'Data Science Starter',
    filename: 'data_science.py',
    content: `# Requires pandas/numpy packages installed via Micropip\nimport pandas as pd\nimport numpy as np\n\n# Create a simple dataframe\ndf = pd.DataFrame({\n    "x": np.arange(1, 6),\n    "y": np.random.rand(5)\n})\nprint("DataFrame:")\nprint(df)\nprint("\\nSummary Stats:")\nprint(df.describe())\n`,
  },
  {
    name: 'Text Analyzer',
    filename: 'text_analyzer.py',
    content: `# Word frequency count demo\ntext = """\nPython is an interpreted, high-level, general-purpose programming language.\nPython's design philosophy emphasizes code readability with its notable use of significant whitespace.\n"""\n\ndef analyze_text(raw_text):\n    words = raw_text.lower().replace('.', '').replace(',', '').split()\n    freq = {}\n    for w in words:\n        freq[w] = freq.get(w, 0) + 1\n    return sorted(freq.items(), key=lambda x: x[1], reverse=True)[:5]\n\nprint("Top 5 words:")\nfor word, count in analyze_text(text):\n    print(f"- {word}: {count}")\n`,
  },
];

function buildTree(files) {
  const root = {};
  Object.keys(files).forEach((path) => {
    const parts = path.split('/');
    let node = root;
    parts.forEach((part, i) => {
      if (!node[part]) {
        node[part] = i === parts.length - 1 ? { __isFile: true, __path: path } : {};
      }
      if (i < parts.length - 1) node = node[part];
    });
  });
  return root;
}

function TreeNode({ name, node, depth, prefix }) {
  const isFile = node.__isFile;
  const path = node.__path;
  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(name);
  const inputRef = useRef(null);

  const { activeFile, setActiveFile, deleteFile, renameFile } = useStore();

  const handleRenameSubmit = () => {
    if (renameVal && renameVal !== name) {
      const newPath = prefix ? `${prefix}/${renameVal}` : renameVal;
      renameFile(path || `${prefix}/${name}`, newPath);
    }
    setRenaming(false);
  };

  const children = isFile
    ? null
    : Object.entries(node).filter(([k]) => !k.startsWith('__'));

  const fullPath = isFile ? path : prefix ? `${prefix}/${name}` : name;

  return (
    <div className="tree-node">
      <div
        className={`tree-row ${isFile && activeFile === path ? 'active' : ''}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => {
          if (isFile) setActiveFile(path);
          else setOpen((o) => !o);
        }}
      >
        <span className="tree-icon">
          {isFile ? (
            <File size={13} />
          ) : open ? (
            <FolderOpen size={13} />
          ) : (
            <Folder size={13} />
          )}
        </span>

        {!isFile && (
          <span className="tree-chevron">
            {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </span>
        )}

        {renaming ? (
          <input
            ref={inputRef}
            className="tree-rename-input"
            value={renameVal}
            autoFocus
            onChange={(e) => setRenameVal(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') setRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="tree-label">{name}</span>
        )}

        <span className="tree-actions" onClick={(e) => e.stopPropagation()}>
          {isFile && (
            <>
              <button
                title="Rename"
                onClick={() => { setRenaming(true); setRenameVal(name); }}
              >
                <Edit3 size={11} />
              </button>
              <button
                title="Delete"
                onClick={() => deleteFile(path)}
              >
                <Trash2 size={11} />
              </button>
            </>
          )}
        </span>
      </div>

      {!isFile && open && children && (
        <div className="tree-children">
          {children
            .sort(([, a], [, b]) => {
              if (!a.__isFile && b.__isFile) return -1;
              if (a.__isFile && !b.__isFile) return 1;
              return 0;
            })
            .map(([childName, childNode]) => (
              <TreeNode
                key={childName}
                name={childName}
                node={childNode}
                depth={depth + 1}
                prefix={fullPath}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree() {
  const { files, createFile } = useStore();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(null); // 'file' | 'folder'
  const [showTemplates, setShowTemplates] = useState(false); // ponytail: toggle templates dropdown
  const inputRef = useRef(null);

  const tree = buildTree(files);

  // ponytail: find non-conflicting filename for templates
  const getUniqueFilename = (baseName) => {
    if (!files[baseName]) return baseName;

    const dotIndex = baseName.lastIndexOf('.');
    const namePart = dotIndex !== -1 ? baseName.slice(0, dotIndex) : baseName;
    const extPart = dotIndex !== -1 ? baseName.slice(dotIndex) : '';

    let counter = 1;
    while (files[`${namePart}_${counter}${extPart}`]) {
      counter++;
    }
    return `${namePart}_${counter}${extPart}`;
  };

  const handleCreate = () => {
    if (!newName.trim()) { setCreating(null); return; }
    const name = creating === 'folder' ? newName.trim() + '/__init__.py' : newName.trim();
    createFile(name, creating === 'folder' ? '# ' + newName.trim() + ' package\n' : '');
    setNewName('');
    setCreating(null);
  };

  const handleSelectTemplate = (template) => {
    const uniqueName = getUniqueFilename(template.filename);
    createFile(uniqueName, template.content);
    setShowTemplates(false);
  };

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span className="file-tree-title">EXPLORER</span>
        <div className="file-tree-toolbar">
          <button
            title="Templates & Snippets"
            onClick={() => setShowTemplates((prev) => !prev)}
            className={showTemplates ? 'active' : ''}
          >
            <Sparkles size={14} />
          </button>
          <button title="New File" onClick={() => { setCreating('file'); setShowTemplates(false); setTimeout(() => inputRef.current?.focus(), 50); }}>
            <FilePlus size={14} />
          </button>
          <button title="New Folder" onClick={() => { setCreating('folder'); setShowTemplates(false); setTimeout(() => inputRef.current?.focus(), 50); }}>
            <FolderPlus size={14} />
          </button>
        </div>

        {/* ponytail: dropdown list of templates */}
        {showTemplates && (
          <div className="templates-dropdown">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.name}
                className="templates-dropdown-item"
                onClick={() => handleSelectTemplate(tmpl)}
              >
                <Sparkles size={12} />
                <span>{tmpl.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {creating && (
        <div className="tree-new-input-row">
          {creating === 'folder' ? <Folder size={13} /> : <File size={13} />}
          <input
            ref={inputRef}
            className="tree-new-input"
            placeholder={creating === 'file' ? 'filename.py' : 'folder_name'}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setCreating(null);
            }}
            onBlur={handleCreate}
          />
          <button onClick={() => setCreating(null)}><X size={11} /></button>
        </div>
      )}

      <div className="tree-content">
        {Object.entries(tree)
          .sort(([, a], [, b]) => {
            if (!a.__isFile && b.__isFile) return -1;
            if (a.__isFile && !b.__isFile) return 1;
            return 0;
          })
          .map(([name, node]) => (
            <TreeNode key={name} name={name} node={node} depth={0} prefix="" />
          ))}
      </div>
    </div>
  );
}
