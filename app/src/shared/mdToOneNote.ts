// Converts Markdown into HTML for pasting into OneNote (via the clipboard's
// HTML flavor). OneNote's paste handler accepts much richer inline CSS than
// the old Graph "create page" HTML subset did, so every block here carries
// explicit inline styles — without them, the pasted result loses all of the
// spacing/backgrounds visible in the app's own live preview, since that
// preview is styled by the app's stylesheet, which obviously doesn't travel
// through the clipboard.
//
// OneNote still has no native <blockquote>/<hr>/<code> tags, so those are
// mapped to styled elements below.
//
// html:true is deliberately on: Markdown has no standard syntax for colored
// text, so the supported convention is inline HTML, e.g.
// <span style="color:#c0392b">text</span>. Raw HTML tokens (html_inline /
// html_block) are passed through verbatim in renderInline/renderBlocks
// below. This is safe here — the content is authored locally by the user
// and pasted straight into their own OneNote page, not rendered on a page
// serving other people.

import MarkdownIt from 'markdown-it'

type Token = ReturnType<MarkdownIt['parse']>[number]

const md = new MarkdownIt({ html: true, linkify: true, breaks: false })

export interface MdToOneNoteResult {
  title: string
  bodyHtml: string
  fullHtml: string
}

const TASK_MARKER_RE = /^\[( |x|X)\]\s+/

const FONT = "font-family:Calibri,'Segoe UI',Arial,sans-serif;"
const MONO = "font-family:Consolas,'Courier New',monospace;"

const HEADING_STYLE: Record<string, string> = {
  h1: `${FONT}font-size:20px;font-weight:700;margin:18px 0 8px 0;`,
  h2: `${FONT}font-size:17px;font-weight:700;margin:16px 0 6px 0;`,
  h3: `${FONT}font-size:15px;font-weight:700;margin:14px 0 6px 0;`,
  h4: `${FONT}font-size:14px;font-weight:700;margin:12px 0 4px 0;`,
  h5: `${FONT}font-size:13px;font-weight:700;margin:10px 0 4px 0;`,
  h6: `${FONT}font-size:12px;font-weight:700;margin:10px 0 4px 0;`
}
const PARAGRAPH_STYLE = `${FONT}font-size:11pt;margin:0 0 8px 0;`
const LIST_STYLE = `${FONT}font-size:11pt;margin:0 0 8px 0;padding-left:24px;`
// Code blocks are rendered as a single-cell table rather than a styled <pre>.
// OneNote's paste sanitizer reliably keeps background-color/border on table
// cells (that's how table shading survives paste) but was observed to strip
// them off a plain <pre style="...">, leaving unstyled monospace text.
const CODE_TABLE_STYLE = 'border-collapse:collapse;width:100%;margin:0 0 20px 0;'
const CODE_CELL_STYLE = `${MONO}font-size:10pt;background-color:#f4f4f4;padding:10px 12px;`
const INLINE_CODE_STYLE = `${MONO}background-color:#f0f0f0;border:1px solid #e0e0e0;border-radius:3px;padding:1px 4px;`
const TABLE_STYLE = `${FONT}font-size:11pt;border-collapse:collapse;margin:0 0 10px 0;`
const CELL_STYLE = 'border:1px solid #d0d0d0;padding:5px 10px;'
const QUOTE_STYLE = 'margin:0 0 10px 16px;padding:2px 0 2px 10px;border-left:3px solid #c8c8c8;color:#595959;'
const HR_STYLE = 'border:none;border-top:1px solid #c8c8c8;margin:14px 0;'

export function markdownToOneNoteHtml(
  markdown: string,
  fallbackTitle = 'Untitled page'
): MdToOneNoteResult {
  const tokens = md.parse(markdown, {})
  const title = extractTitle(tokens) ?? fallbackTitle
  const bodyHtml = renderBlocks(tokens, 0, tokens.length)
  const fullHtml = wrapPage(title, bodyHtml)
  return { title, bodyHtml, fullHtml }
}

export function wrapPage(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>\n<html>\n  <head>\n    <title>${escapeHtml(title)}</title>\n  </head>\n  <body>\n    ${bodyHtml}\n  </body>\n</html>`
}

function extractTitle(tokens: Token[]): string | null {
  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i].type === 'heading_open' && tokens[i].tag === 'h1') {
      return plainText(tokens[i + 1]) || null
    }
  }
  return null
}

/** Finds the index of the token that closes the "open" token at `openIdx`. */
function findClose(tokens: Token[], openIdx: number): number {
  let depth = 1
  for (let i = openIdx + 1; i < tokens.length; i++) {
    depth += tokens[i].nesting
    if (depth === 0) return i
  }
  return tokens.length - 1
}

function renderBlocks(tokens: Token[], start: number, end: number): string {
  let out = ''
  let i = start
  while (i < end) {
    const t = tokens[i]
    if (t.type === 'heading_open') {
      const style = HEADING_STYLE[t.tag] ?? HEADING_STYLE.h6
      out += `<${t.tag} style="${style}">${renderInline(tokens[i + 1])}</${t.tag}>`
      i += 3
    } else if (t.type === 'paragraph_open') {
      const inline = tokens[i + 1]
      const task = detectTaskMarker(inline)
      const attr = task ? ` data-tag="to-do${task === 'done' ? ':completed' : ''}"` : ''
      const text = renderInline(inline, task !== null)
      out += `<p${attr} style="${PARAGRAPH_STYLE}">${text || '&nbsp;'}</p>`
      i += 3
    } else if (t.type === 'bullet_list_open' || t.type === 'ordered_list_open') {
      const close = findClose(tokens, i)
      const tag = t.type === 'bullet_list_open' ? 'ul' : 'ol'
      out += `<${tag} style="${LIST_STYLE}">${renderListItems(tokens, i + 1, close)}</${tag}>`
      i = close + 1
    } else if (t.type === 'table_open') {
      const close = findClose(tokens, i)
      out += renderTable(tokens, i + 1, close)
      i = close + 1
    } else if (t.type === 'blockquote_open') {
      const close = findClose(tokens, i)
      // OneNote has no <blockquote>; approximate with an indented, bordered div.
      out += `<div style="${QUOTE_STYLE}">${renderBlocks(tokens, i + 1, close)}</div>`
      i = close + 1
    } else if (t.type === 'fence' || t.type === 'code_block') {
      out += renderCodeBlock(stripTrailingNewline(t.content))
      i += 1
    } else if (t.type === 'hr') {
      out += `<hr style="${HR_STYLE}" />`
      i += 1
    } else if (t.type === 'html_block') {
      // Passed through verbatim — see the html:true note at the top of this file.
      out += t.content.trim()
      i += 1
    } else {
      i += 1
    }
  }
  return out
}

function renderListItems(tokens: Token[], start: number, end: number): string {
  let out = ''
  let i = start
  while (i < end) {
    if (tokens[i].type === 'list_item_open') {
      const close = findClose(tokens, i)
      out += `<li>${renderBlocks(tokens, i + 1, close)}</li>`
      i = close + 1
    } else {
      i += 1
    }
  }
  return out
}

function renderTable(tokens: Token[], start: number, end: number): string {
  let rows = ''
  let i = start
  while (i < end) {
    if (tokens[i].type === 'tr_open') {
      const close = findClose(tokens, i)
      rows += `<tr>${renderTableRow(tokens, i + 1, close)}</tr>`
      i = close + 1
    } else {
      i += 1
    }
  }
  return `<table style="${TABLE_STYLE}">${rows}</table>`
}

function renderTableRow(tokens: Token[], start: number, end: number): string {
  let out = ''
  let i = start
  while (i < end) {
    const t = tokens[i]
    if (t.type === 'th_open' || t.type === 'td_open') {
      const close = findClose(tokens, i)
      const content = renderInline(tokens[i + 1])
      const cellStyle = t.type === 'th_open' ? `${CELL_STYLE}background-color:#f4f4f4;` : CELL_STYLE
      const inner = t.type === 'th_open' ? `<b>${content}</b>` : content
      out += `<td style="${cellStyle}"><p style="${FONT}margin:0;">${inner}</p></td>`
      i = close + 1
    } else {
      i += 1
    }
  }
  return out
}

/**
 * Renders a fenced/indented code block as a single-cell table (see the
 * CODE_TABLE_STYLE comment for why). Line breaks become <br/> and leading
 * indentation becomes &nbsp; runs rather than relying on `white-space: pre`
 * surviving paste, which is equally unreliable across paste sanitizers.
 */
function renderCodeBlock(code: string): string {
  const lines = code
    .replace(/\t/g, '    ')
    .split('\n')
    .map((line) => {
      const leading = /^ +/.exec(line)?.[0].length ?? 0
      return '&nbsp;'.repeat(leading) + escapeHtml(line.slice(leading))
    })
  return `<table style="${CODE_TABLE_STYLE}"><tr><td style="${CODE_CELL_STYLE}">${lines.join('<br/>')}</td></tr></table>`
}

function detectTaskMarker(inline: Token | undefined): 'open' | 'done' | null {
  const first = inline?.children?.[0]
  if (!first || first.type !== 'text') return null
  const m = TASK_MARKER_RE.exec(first.content)
  if (!m) return null
  return m[1].toLowerCase() === 'x' ? 'done' : 'open'
}

/** Renders the inline children of a token (e.g. a paragraph's inline content) to OneNote-safe HTML. */
function renderInline(inline: Token | undefined, stripTaskMarker = false): string {
  if (!inline?.children) return ''
  let out = ''
  for (let idx = 0; idx < inline.children.length; idx++) {
    const c = inline.children[idx]
    switch (c.type) {
      case 'text': {
        const content =
          stripTaskMarker && idx === 0 ? c.content.replace(TASK_MARKER_RE, '') : c.content
        out += escapeHtml(content)
        break
      }
      case 'code_inline':
        // OneNote has no <code>; approximate with a monospace, boxed span.
        out += `<span style="${INLINE_CODE_STYLE}">${escapeHtml(c.content)}</span>`
        break
      case 'strong_open':
        out += '<b>'
        break
      case 'strong_close':
        out += '</b>'
        break
      case 'em_open':
        out += '<i>'
        break
      case 'em_close':
        out += '</i>'
        break
      case 's_open':
        out += '<span style="text-decoration:line-through;">'
        break
      case 's_close':
        out += '</span>'
        break
      case 'link_open':
        out += `<a href="${escapeAttr(c.attrGet('href') || '')}" style="color:#2f6feb;">`
        break
      case 'link_close':
        out += '</a>'
        break
      case 'image':
        out += `<img src="${escapeAttr(c.attrGet('src') || '')}" alt="${escapeAttr(c.content || '')}" style="max-width:100%;" />`
        break
      case 'softbreak':
        out += ' '
        break
      case 'hardbreak':
        out += '<br/>'
        break
      case 'html_inline':
        // Passed through verbatim — see the html:true note at the top of this file.
        out += c.content
        break
      default:
        break
    }
  }
  return out
}

/** Plain-text rendering (no formatting), used for page/section titles. */
function plainText(inline: Token | undefined): string {
  if (!inline?.children) return ''
  return inline.children
    .filter((c) => c.type === 'text' || c.type === 'code_inline')
    .map((c) => c.content)
    .join('')
    .trim()
}

function stripTrailingNewline(s: string): string {
  return s.endsWith('\n') ? s.slice(0, -1) : s
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;')
}
