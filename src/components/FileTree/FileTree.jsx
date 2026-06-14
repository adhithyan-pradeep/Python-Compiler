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
} from 'lucide-react';
import useStore from '../../store/useStore';
import './FileTree.css';

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
  const inputRef = useRef(null);

  const tree = buildTree(files);

  const handleCreate = () => {
    if (!newName.trim()) { setCreating(null); return; }
    const name = creating === 'folder' ? newName.trim() + '/__init__.py' : newName.trim();
    createFile(name, creating === 'folder' ? '# ' + newName.trim() + ' package\n' : '');
    setNewName('');
    setCreating(null);
  };

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span className="file-tree-title">EXPLORER</span>
        <div className="file-tree-toolbar">
          <button title="New File" onClick={() => { setCreating('file'); setTimeout(() => inputRef.current?.focus(), 50); }}>
            <FilePlus size={14} />
          </button>
          <button title="New Folder" onClick={() => { setCreating('folder'); setTimeout(() => inputRef.current?.focus(), 50); }}>
            <FolderPlus size={14} />
          </button>
        </div>
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
