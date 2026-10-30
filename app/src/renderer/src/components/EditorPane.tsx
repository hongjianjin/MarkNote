import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown as markdownLang } from '@codemirror/lang-markdown'
import { markdownToOneNoteHtml } from '@shared/mdToOneNote'
import { renderPreviewHtml } from '../lib/previewRender'

const SPLIT_KEY = 'marknote.splitPercent'
const SPLIT_DEFAULT = 50
const SPLIT_MIN = 15
const SPLIT_MAX = 85

function clampSplit(p: number): number {
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, p))
}

function loadSplit(): number {
  try {
    const saved = Number(localStorage.getItem(SPLIT_KEY))
    return saved ? clampSplit(saved) : SPLIT_DEFAULT
  } catch {
    return SPLIT_DEFAULT
  }
}

interface Props {
  value: string
  onChange: (value: string) => void
  onOpenFile: () => void
  onSaveFile: () => void
  onExportHtml: () => void
  onExportPdf: () => void
  onCopyMarkdown: () => void
  onCopyForOneNote: () => void
  onPasteFromOneNote: () => void
  busy: boolean
  error: string | null
}

export default function EditorPane({
  value,
  onChange,
  onOpenFile,
  onSaveFile,
  onExportHtml,
  onExportPdf,
  onCopyMarkdown,
  onCopyForOneNote,
  onPasteFromOneNote,
  busy,
  error
}: Props): JSX.Element {
  const [showSource, setShowSource] = useState(true)
  const [showPreview, setShowPreview] = useState(true)
  const [splitPercent, setSplitPercent] = useState(loadSplit)
  const splitRef = useRef<HTMLDivElement>(null)

  function updateSplit(next: number, persist: boolean): void {
    const clamped = clampSplit(next)
    setSplitPercent(clamped)
    if (persist) {
      try {
        localStorage.setItem(SPLIT_KEY, String(clamped))
      } catch {
        // Storage unavailable — the ratio just won't survive a restart.
      }
    }
  }

  function percentFromPointer(e: PointerEvent): number {
    const rect = splitRef.current!.getBoundingClientRect()
    return ((e.clientX - rect.left) / rect.width) * 100
  }

  function onDividerPointerDown(e: PointerEvent<HTMLDivElement>): void {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId) // keep receiving moves over the editor/preview
  }
  function onDividerPointerMove(e: PointerEvent<HTMLDivElement>): void {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) updateSplit(percentFromPointer(e), false)
  }
  function onDividerPointerUp(e: PointerEvent<HTMLDivElement>): void {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    updateSplit(percentFromPointer(e), true)
  }
  function onDividerKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'ArrowLeft') updateSplit(splitPercent - 2, true)
    else if (e.key === 'ArrowRight') updateSplit(splitPercent + 2, true)
    else if (e.key === 'Home' || e.key === 'Enter') updateSplit(SPLIT_DEFAULT, true)
    else return
    e.preventDefault()
  }

  const { title } = useMemo(() => markdownToOneNoteHtml(value, '(untitled)'), [value])
  const previewHtml = useMemo(() => renderPreviewHtml(value), [value])

  return (
    <section className="editor-pane">
      <div className="editor-toolbar">
        <div className="editor-location">
          Title: <b>{title}</b>
        </div>
        <div className="editor-view-toggles">
          <button
            className={'ghost' + (showSource ? ' active' : '')}
            onClick={() => setShowSource((v) => !v)}
          >
            Source
          </button>
          <button
            className={'ghost' + (showPreview ? ' active' : '')}
            onClick={() => setShowPreview((v) => !v)}
          >
            Preview
          </button>
        </div>
        <div className="editor-actions">
          <button className="ghost" disabled={busy} onClick={onOpenFile}>
            Open .md
          </button>
          <button className="ghost" disabled={busy} onClick={onSaveFile}>
            Save .md
          </button>
          <button className="ghost" disabled={busy} onClick={onExportHtml}>
            Save HTML
          </button>
          <button className="ghost" disabled={busy} onClick={onExportPdf}>
            Save PDF
          </button>
          <button className="ghost" disabled={busy} onClick={onCopyMarkdown}>
            Copy Markdown
          </button>
          <button className="ghost" disabled={busy} onClick={onPasteFromOneNote}>
            Paste from OneNote
          </button>
          <button className="primary" disabled={busy} onClick={onCopyForOneNote}>
            Copy for OneNote
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="editor-split" ref={splitRef}>
        {showSource && (
          <div
            className="editor-source"
            style={showPreview ? { flex: `0 0 ${splitPercent}%` } : undefined}
          >
            <CodeMirror
              value={value}
              height="100%"
              extensions={[markdownLang()]}
              onChange={onChange}
              basicSetup={{ lineNumbers: true, foldGutter: false }}
            />
          </div>
        )}
        {showSource && showPreview && (
          <div
            className="split-divider"
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={Math.round(splitPercent)}
            aria-valuemin={SPLIT_MIN}
            aria-valuemax={SPLIT_MAX}
            tabIndex={0}
            title="Drag to resize · double-click to reset"
            onPointerDown={onDividerPointerDown}
            onPointerMove={onDividerPointerMove}
            onPointerUp={onDividerPointerUp}
            onDoubleClick={() => updateSplit(SPLIT_DEFAULT, true)}
            onKeyDown={onDividerKeyDown}
          />
        )}
        {showPreview && (
          <div className="editor-preview">
            <div
              className="preview-content"
              // markdown-it has html:true (for inline HTML like colored-text spans);
              // renderPreviewHtml sanitizes with DOMPurify before it lands here.
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>
    </section>
  )
}
