// Converts OneNote page HTML (as returned by GET .../pages/{id}/content) back
// into Markdown, for viewing/exporting an existing page.
//
// Uses turndown, which needs a real DOM (document/DOMParser) — this module
// is intended to run in the renderer process (Chromium), not the Node-only
// main process.

import TurndownService from 'turndown'

/** True for the single-cell, monospace-styled table mdToOneNote.ts uses to render code blocks. */
function isCodeTable(table: HTMLTableElement): boolean {
  const rows = table.rows
  if (rows.length !== 1 || rows[0].cells.length !== 1) return false
  const style = rows[0].cells[0].getAttribute('style') || ''
  return /font-family:\s*Consolas|Courier New/i.test(style)
}

/** Reconstructs code text from a code-block cell: <br> -> newline, &nbsp; -> space. */
function codeCellToText(cell: HTMLTableCellElement): string {
  const nbsp = String.fromCharCode(160)
  const space = String.fromCharCode(32)
  let out = ''
  cell.childNodes.forEach((node) => {
    if (node.nodeName === 'BR') {
      out += '\n'
    } else {
      out += (node.textContent ?? '').split(nbsp).join(space)
    }
  })
  return out
}

export function oneNoteHtmlToMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
  })

  // Our own converter renders fenced code blocks as a single-cell table
  // (see the CODE_TABLE_STYLE comment in mdToOneNote.ts for why: OneNote's
  // paste sanitizer keeps background/border on table cells more reliably
  // than on a <pre>). Recognize that shape and convert it back to a fenced
  // code block instead of falling through to the generic table rule below.
  turndown.addRule('oneNoteCodeBlock', {
    filter: (node) => node.nodeName === 'TABLE' && isCodeTable(node as HTMLTableElement),
    replacement: (_content, node) => {
      const cell = (node as HTMLTableElement).rows[0]?.cells[0]
      const code = cell ? codeCellToText(cell) : ''
      return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`
    }
  })

  // OneNote tables are plain <table><tr><td>...</td></tr></table> with no
  // <thead>/<th> (see onenote-update-page's own table example), which
  // turndown-plugin-gfm's table rule doesn't recognize as a valid GFM table.
  // Handle tables ourselves: treat the first row as the header row and
  // recursively convert each cell's contents to Markdown.
  turndown.addRule('oneNoteTable', {
    filter: (node) => node.nodeName === 'TABLE' && !isCodeTable(node as HTMLTableElement),
    replacement: (_content, node) => {
      const rows = Array.from((node as HTMLTableElement).querySelectorAll('tr'))
      if (rows.length === 0) return ''
      const toCellText = (cell: Element): string =>
        turndown
          .turndown((cell as HTMLElement).innerHTML || '')
          .replace(/\|/g, '\\|')
          .replace(/\s+/g, ' ')
          .trim()
      const rowsMd = rows.map((row) => Array.from(row.children).map(toCellText))
      const colCount = Math.max(...rowsMd.map((r) => r.length))
      const pad = (r: string[]): string[] => [...r, ...Array(colCount - r.length).fill('')]
      const [headerRow, ...bodyRows] = rowsMd.map(pad)
      const lines = [
        `| ${headerRow.join(' | ')} |`,
        `| ${Array(colCount).fill('---').join(' | ')} |`,
        ...bodyRows.map((r) => `| ${r.join(' | ')} |`)
      ]
      return `\n\n${lines.join('\n')}\n\n`
    }
  })

  // Our own converter renders to-do checkboxes as <p data-tag="to-do"|"to-do:completed">.
  turndown.addRule('oneNoteToDo', {
    filter: (node) =>
      node.nodeName === 'P' && !!(node as HTMLElement).getAttribute('data-tag')?.startsWith('to-do'),
    replacement: (content, node) => {
      const tag = (node as HTMLElement).getAttribute('data-tag') || ''
      const checked = tag.includes('completed')
      return `- [${checked ? 'x' : ' '}] ${content.trim()}\n`
    }
  })

  // Our own converter renders inline code as a monospace <span>.
  turndown.addRule('monospaceSpan', {
    filter: (node) =>
      node.nodeName === 'SPAN' &&
      /font-family:\s*Consolas|Courier New/i.test((node as HTMLElement).getAttribute('style') || ''),
    replacement: (content) => `\`${content}\``
  })

  // Our own converter renders strikethrough as a styled <span>.
  turndown.addRule('strikethroughSpan', {
    filter: (node) =>
      node.nodeName === 'SPAN' &&
      /text-decoration:\s*line-through/i.test((node as HTMLElement).getAttribute('style') || ''),
    replacement: (content) => `~~${content}~~`
  })

  // Drop OneNote's absolute-positioning wrapper divs down to their content
  // instead of leaving stray attributes/whitespace behind.
  turndown.addRule('genericDiv', {
    filter: 'div',
    replacement: (content) => `${content}\n`
  })

  return `${turndown.turndown(html).trim()}\n`
}

/** Extracts the <title> text from OneNote page HTML, for use as an H1/filename. */
export function extractPageTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  if (!match) return null
  const div = document.createElement('div')
  div.innerHTML = match[1]
  return div.textContent?.trim() || null
}
