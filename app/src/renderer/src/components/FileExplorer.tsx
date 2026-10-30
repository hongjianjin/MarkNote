import { useCallback, useEffect, useState } from 'react'
import type { DirEntry } from '@shared/types'

interface Props {
  /** Full path of the document currently open in the editor, if it came from disk. */
  activePath: string | null
  onOpenFile: (path: string) => void
}

function leafName(p: string): string {
  return p.split(/[\\/]/).filter(Boolean).pop() ?? p
}

function samePath(a: string | null, b: string): boolean {
  return a !== null && a.toLowerCase() === b.toLowerCase() // Windows paths are case-insensitive
}

export default function FileExplorer({ activePath, onOpenFile }: Props): JSX.Element {
  const [root, setRoot] = useState<string | null>(null)
  const [children, setChildren] = useState<Record<string, DirEntry[]>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (dir: string): Promise<void> => {
    try {
      const entries = await window.oneNote.explorer.listDir(dir)
      setChildren((prev) => ({ ...prev, [dir]: entries }))
    } catch (e) {
      setError(`Couldn't read ${leafName(dir)}: ${(e as Error)?.message ?? String(e)}`)
    }
  }, [])

  const showRoot = useCallback(
    (dir: string): void => {
      setRoot(dir)
      setChildren({})
      setExpanded(new Set())
      setError(null)
      void load(dir)
    },
    [load]
  )

  useEffect(() => {
    void window.oneNote.explorer.getRoot().then((dir) => {
      if (dir) showRoot(dir)
    })
  }, [showRoot])

  async function chooseFolder(): Promise<void> {
    const dir = await window.oneNote.explorer.chooseRoot()
    if (dir) showRoot(dir)
  }

  function refresh(): void {
    if (!root) return
    setError(null)
    void load(root)
    expanded.forEach((dir) => void load(dir))
  }

  function toggleDir(dir: string): void {
    const next = new Set(expanded)
    if (next.has(dir)) {
      next.delete(dir)
    } else {
      next.add(dir)
      if (!children[dir]) void load(dir)
    }
    setExpanded(next)
  }

  function renderEntries(dir: string, depth: number): JSX.Element[] {
    return (children[dir] ?? []).map((entry) => {
      const indent = { paddingLeft: 10 + depth * 14 }
      if (entry.isDirectory) {
        const open = expanded.has(entry.path)
        return (
          <div key={entry.path}>
            <button className="explorer-row" style={indent} onClick={() => toggleDir(entry.path)}>
              <span className="explorer-chevron">{open ? '▾' : '▸'}</span>
              <span className="explorer-name">{entry.name}</span>
            </button>
            {open && renderEntries(entry.path, depth + 1)}
            {open && children[entry.path]?.length === 0 && (
              <div className="explorer-empty" style={{ paddingLeft: 24 + (depth + 1) * 14 }}>
                No Markdown files
              </div>
            )}
          </div>
        )
      }
      return (
        <button
          key={entry.path}
          className={'explorer-row' + (samePath(activePath, entry.path) ? ' active' : '')}
          style={indent}
          title={entry.path}
          onClick={() => onOpenFile(entry.path)}
        >
          <span className="explorer-chevron" />
          <span className="explorer-name">{entry.name}</span>
        </button>
      )
    })
  }

  return (
    <aside className="explorer">
      <div className="explorer-header">
        <span className="explorer-title" title={root ?? undefined}>
          {root ? leafName(root) : 'Explorer'}
        </span>
        {root && (
          <>
            <button className="explorer-icon" title="Refresh" onClick={refresh}>
              ↻
            </button>
            <button className="explorer-icon" title="Open a different folder" onClick={chooseFolder}>
              Folder…
            </button>
          </>
        )}
      </div>
      {error && <div className="explorer-error">{error}</div>}
      {root ? (
        <div className="explorer-tree">
          {renderEntries(root, 0)}
          {children[root]?.length === 0 && <div className="explorer-empty">No Markdown files</div>}
        </div>
      ) : (
        <div className="explorer-placeholder">
          <p>Browse a folder and open Markdown files with a click.</p>
          <button className="primary" onClick={chooseFolder}>
            Open Folder…
          </button>
        </div>
      )}
    </aside>
  )
}
