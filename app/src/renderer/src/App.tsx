import { useEffect, useRef, useState } from 'react'
import TopBar from './components/TopBar'
import EditorPane from './components/EditorPane'
import FileExplorer from './components/FileExplorer'
import { renderPreviewHtml } from './lib/previewRender'
import { markdownToOneNoteHtml } from '@shared/mdToOneNote'
import { oneNoteHtmlToMarkdown } from '@shared/oneNoteToMd'
import { buildStandaloneHtml } from '@shared/exportHtml'

const STARTER_MARKDOWN =
  '# New page\n\n' +
  'Write Markdown here — headings, **bold**, *italic*, lists, `code`, tables, and ' +
  '`- [ ]` checkboxes all convert to OneNote formatting.\n\n' +
  'When you\'re ready, click **Copy for OneNote**, switch to OneNote, and press ' +
  'Ctrl+V to paste it in, fully formatted. You can also drag a .md file onto this ' +
  'window to open it, or save the rendered result as HTML or PDF.\n'

const MARKDOWN_FILE_RE = /\.(md|markdown|mdown|txt)$/i

function baseName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

export default function App(): JSX.Element {
  const [markdownValue, setMarkdownValue] = useState(STARTER_MARKDOWN)
  const [fileName, setFileName] = useState<string | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [explorerOpen, setExplorerOpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  // The text as of the last open/drop/save, to tell whether a drop would discard edits.
  const baselineRef = useRef(STARTER_MARKDOWN)

  /** Title for export: the first H1, else the file name, else a generic fallback. */
  function documentTitle(): { title: string; suggestedName: string } {
    const fallback = fileName ? stripExtension(fileName) : 'Untitled'
    const { title } = markdownToOneNoteHtml(markdownValue, fallback)
    return { title, suggestedName: fileName ? stripExtension(fileName) : title }
  }

  function loadDocument(content: string, name: string | null, path: string | null = null): void {
    setMarkdownValue(content)
    setFileName(name)
    setFilePath(path)
    baselineRef.current = content
  }

  async function handleOpenFile(): Promise<void> {
    setError(null)
    const result = await window.oneNote.files.openMarkdown()
    if (result) {
      loadDocument(result.content, baseName(result.path), result.path)
      setStatus(`Opened ${result.path}`)
    }
  }

  async function handleOpenFromExplorer(path: string): Promise<void> {
    setError(null)
    if (path === filePath && markdownValue === baselineRef.current) return // already open, unchanged
    if (markdownValue !== baselineRef.current) {
      const confirmed = window.confirm(
        `Open "${baseName(path)}"? This replaces the current editor content, including unsaved edits.`
      )
      if (!confirmed) return
    }
    try {
      loadDocument(await window.oneNote.explorer.readFile(path), baseName(path), path)
      setStatus(`Opened ${path}`)
    } catch (e) {
      setError(`Couldn't open "${baseName(path)}": ${(e as Error)?.message ?? String(e)}`)
    }
  }

  async function handleDroppedFile(file: File): Promise<void> {
    setError(null)
    if (!MARKDOWN_FILE_RE.test(file.name)) {
      setError(`Can't open "${file.name}" — drop a .md, .markdown or .txt file.`)
      return
    }
    if (markdownValue !== baselineRef.current) {
      const confirmed = window.confirm(
        `Open "${file.name}"? This replaces the current editor content, including unsaved edits.`
      )
      if (!confirmed) return
    }
    try {
      loadDocument(await file.text(), file.name)
      setStatus(`Opened ${file.name}`)
    } catch (e) {
      setError(`Couldn't read "${file.name}": ${(e as Error)?.message ?? String(e)}`)
    }
  }

  // Window-level, capture-phase listeners: without preventDefault on drop, Electron
  // would navigate to the dropped file, and CodeMirror would otherwise insert the
  // file's text at the drop point instead of opening it as a document. The handler
  // lives in a ref so the listeners always see the current editor state.
  const dropHandlerRef = useRef(handleDroppedFile)
  dropHandlerRef.current = handleDroppedFile

  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent): boolean =>
      !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')

    const onDragEnter = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth += 1
      setDragging(true)
    }
    const onDragOver = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onDragLeave = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onDrop = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      e.preventDefault()
      e.stopPropagation()
      depth = 0
      setDragging(false)
      const file = e.dataTransfer?.files[0]
      if (file) void dropHandlerRef.current(file)
    }

    window.addEventListener('dragenter', onDragEnter, true)
    window.addEventListener('dragover', onDragOver, true)
    window.addEventListener('dragleave', onDragLeave, true)
    window.addEventListener('drop', onDrop, true)
    return () => {
      window.removeEventListener('dragenter', onDragEnter, true)
      window.removeEventListener('dragover', onDragOver, true)
      window.removeEventListener('dragleave', onDragLeave, true)
      window.removeEventListener('drop', onDrop, true)
    }
  }, [])

  async function handleSaveFile(): Promise<void> {
    setError(null)
    const { suggestedName } = documentTitle()
    const result = await window.oneNote.files.saveMarkdown(markdownValue, suggestedName)
    if (result) {
      setFileName(baseName(result.path))
      setFilePath(result.path)
      baselineRef.current = markdownValue
      setStatus(`Saved to ${result.path}`)
    }
  }

  async function handleExport(kind: 'html' | 'pdf'): Promise<void> {
    setError(null)
    setBusy(true)
    try {
      const { title, suggestedName } = documentTitle()
      const html = buildStandaloneHtml(title, renderPreviewHtml(markdownValue))
      const files = window.oneNote.files
      const result =
        kind === 'html'
          ? await files.saveHtml(html, suggestedName)
          : await files.savePdf(html, suggestedName)
      if (result) setStatus(`Saved ${kind.toUpperCase()} to ${result.path}`)
    } catch (e) {
      setError(`Couldn't save ${kind.toUpperCase()}: ${(e as Error)?.message ?? String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleCopyMarkdown(): Promise<void> {
    await window.oneNote.files.copyText(markdownValue)
    setStatus('Markdown copied to clipboard.')
  }

  async function handleCopyForOneNote(): Promise<void> {
    setError(null)
    setBusy(true)
    try {
      const { bodyHtml } = markdownToOneNoteHtml(markdownValue, 'Untitled page')
      await window.oneNote.files.copyForOneNote({ text: markdownValue, html: bodyHtml })
      setStatus('Copied! Switch to OneNote and press Ctrl+V to paste it in.')
    } catch (e) {
      setError((e as Error)?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handlePasteFromOneNote(): Promise<void> {
    setError(null)
    setBusy(true)
    try {
      const html = await window.oneNote.files.readClipboardHtml()
      if (!html) {
        setError('No rich content found on the clipboard — copy something from a OneNote page first.')
        return
      }
      const converted = oneNoteHtmlToMarkdown(html)
      const hasExistingWork =
        markdownValue.trim().length > 0 && markdownValue.trim() !== STARTER_MARKDOWN.trim()
      if (hasExistingWork) {
        const confirmed = window.confirm(
          'This replaces the current editor content with the Markdown converted from your ' +
            'clipboard. Continue?'
        )
        if (!confirmed) return
      }
      setMarkdownValue(converted)
      setStatus('Converted clipboard content to Markdown.')
    } catch (e) {
      setError((e as Error)?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <TopBar
        status={status}
        explorerOpen={explorerOpen}
        onToggleExplorer={() => setExplorerOpen((v) => !v)}
      />
      <div className="app-body">
        {/* Hidden rather than unmounted, so its expanded folders survive a toggle. */}
        <div className="explorer-slot" hidden={!explorerOpen}>
          <FileExplorer activePath={filePath} onOpenFile={(p) => void handleOpenFromExplorer(p)} />
        </div>
        <EditorPane
          value={markdownValue}
          onChange={setMarkdownValue}
          onOpenFile={handleOpenFile}
          onSaveFile={handleSaveFile}
          onExportHtml={() => void handleExport('html')}
          onExportPdf={() => void handleExport('pdf')}
          onCopyMarkdown={handleCopyMarkdown}
          onCopyForOneNote={handleCopyForOneNote}
          onPasteFromOneNote={handlePasteFromOneNote}
          busy={busy}
          error={error}
        />
      </div>
      {dragging && <div className="drop-overlay">Drop a Markdown file to open it</div>}
    </div>
  )
}
