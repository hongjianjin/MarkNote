import { useState } from 'react'
import TopBar from './components/TopBar'
import EditorPane from './components/EditorPane'
import { markdownToOneNoteHtml } from '@shared/mdToOneNote'
import { oneNoteHtmlToMarkdown } from '@shared/oneNoteToMd'

const STARTER_MARKDOWN =
  '# New page\n\n' +
  'Write Markdown here — headings, **bold**, *italic*, lists, `code`, tables, and ' +
  '`- [ ]` checkboxes all convert to OneNote formatting.\n\n' +
  'When you\'re ready, click **Copy for OneNote**, switch to OneNote, and press ' +
  'Ctrl+V (Cmd+V on Mac) to paste it in, fully formatted.\n'

export default function App(): JSX.Element {
  const [markdownValue, setMarkdownValue] = useState(STARTER_MARKDOWN)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function handleOpenFile(): Promise<void> {
    setError(null)
    const result = await window.oneNote.files.openMarkdown()
    if (result) {
      setMarkdownValue(result.content)
      setStatus(`Opened ${result.path}`)
    }
  }

  async function handleSaveFile(): Promise<void> {
    setError(null)
    const { title } = markdownToOneNoteHtml(markdownValue, 'page')
    const result = await window.oneNote.files.saveMarkdown(markdownValue, title)
    if (result) setStatus(`Saved to ${result.path}`)
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
      setStatus('Copied! Switch to OneNote and press Ctrl+V (Cmd+V on Mac) to paste it in.')
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
      <TopBar status={status} />
      <div className="app-body">
        <EditorPane
          value={markdownValue}
          onChange={setMarkdownValue}
          onOpenFile={handleOpenFile}
          onSaveFile={handleSaveFile}
          onCopyMarkdown={handleCopyMarkdown}
          onCopyForOneNote={handleCopyForOneNote}
          onPasteFromOneNote={handlePasteFromOneNote}
          busy={busy}
          error={error}
        />
      </div>
    </div>
  )
}
