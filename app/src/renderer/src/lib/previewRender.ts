import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

// html:true so the preview matches what "Copy for OneNote" produces (colored
// text etc. via inline HTML like <span style="color:...">) — sanitized with
// DOMPurify, since this Markdown can come from an untrusted file opened or
// dropped off disk. Used for the live preview and for HTML/PDF export.
const previewMd = new MarkdownIt({ html: true, linkify: true })

export function renderPreviewHtml(markdown: string): string {
  return DOMPurify.sanitize(previewMd.render(markdown))
}
