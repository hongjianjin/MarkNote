// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { extractPageTitle, oneNoteHtmlToMarkdown } from '../src/shared/oneNoteToMd'

describe('oneNoteHtmlToMarkdown', () => {
  it('converts headings and paragraphs', () => {
    const md = oneNoteHtmlToMarkdown('<h1>Title</h1><p>Body text.</p>')
    expect(md).toContain('# Title')
    expect(md).toContain('Body text.')
  })

  it('converts bold and italic', () => {
    const md = oneNoteHtmlToMarkdown('<p><b>bold</b> and <i>italic</i></p>')
    expect(md).toContain('**bold**')
    expect(md).toContain('_italic_')
  })

  it('converts to-do paragraphs back to task list syntax', () => {
    const md = oneNoteHtmlToMarkdown(
      '<p data-tag="to-do">open task</p><p data-tag="to-do:completed">done task</p>'
    )
    expect(md).toContain('- [ ] open task')
    expect(md).toContain('- [x] done task')
  })

  it('converts our monospace span back to inline code', () => {
    const md = oneNoteHtmlToMarkdown(
      '<p>Run <span style="font-family:Consolas,\'Courier New\',monospace;background-color:#f2f2f2;">npm install</span></p>'
    )
    expect(md).toContain('`npm install`')
  })

  it('converts our single-cell code table back to a fenced code block', () => {
    const cellStyle =
      "font-family:Consolas,'Courier New',monospace;font-size:10pt;background-color:#f4f4f4;"
    const md = oneNoteHtmlToMarkdown(
      `<table><tr><td style="${cellStyle}">line one<br/>&nbsp;&nbsp;indented</td></tr></table>`
    )
    expect(md).toContain('```')
    expect(md).toContain('line one')
    expect(md).toContain('  indented')
    expect(md).not.toContain('| line one |')
  })

  it('converts tables', () => {
    const md = oneNoteHtmlToMarkdown(
      '<table><tr><td><p><b>A</b></p></td><td><p><b>B</b></p></td></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></table>'
    )
    expect(md).toContain('| **A** | **B** |')
    expect(md).toContain('| 1 | 2 |')
  })

  it('converts lists', () => {
    const md = oneNoteHtmlToMarkdown('<ul><li><p>one</p></li><li><p>two</p></li></ul>')
    expect(md).toContain('one')
    expect(md).toContain('two')
  })

  it('extracts the page title', () => {
    const title = extractPageTitle('<html><head><title>My Page</title></head><body></body></html>')
    expect(title).toBe('My Page')
  })
})
