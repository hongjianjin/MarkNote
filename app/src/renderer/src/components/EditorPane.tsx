import { useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown as markdownLang } from '@codemirror/lang-markdown'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { markdownToOneNoteHtml } from '@shared/mdToOneNote'

// html:true so the preview matches what "Copy for OneNote" produces (colored
// text etc. via inline HTML like <span style="color:...">) — sanitized with
// DOMPurify before rendering, since this Markdown can come from an untrusted
// file opened off disk and gets injected via dangerouslySetInnerHTML below.
const previewMd = new MarkdownIt({ html: true, linkify: true })

interface Props {
  value: string
  onChange: (value: string) => void
  onOpenFile: () => void
  onSaveFile: () => void
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
  onCopyMarkdown,
  onCopyForOneNote,
  onPasteFromOneNote,
  busy,
  error
}: Props): JSX.Element {
  const [showSource, setShowSource] = useState(true)
  const [showPreview, setShowPreview] = useState(true)

  const { title } = useMemo(() => markdownToOneNoteHtml(value, '(untitled)'), [value])
  const previewHtml = useMemo(() => DOMPurify.sanitize(previewMd.render(value)), [value])

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

      <div className="editor-split">
        {showSource && (
          <div className="editor-source">
            <CodeMirror
              value={value}
              height="100%"
              extensions={[markdownLang()]}
              onChange={onChange}
              basicSetup={{ lineNumbers: true, foldGutter: false }}
            />
          </div>
        )}
        {showPreview && (
          <div className="editor-preview">
            <div
              className="preview-content"
              // markdown-it has html:true (for inline HTML like colored-text spans),
              // so previewHtml is run through DOMPurify above before landing here.
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>
    </section>
  )
}
