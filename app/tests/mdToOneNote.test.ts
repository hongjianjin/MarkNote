import { describe, expect, it } from 'vitest'
import { markdownToOneNoteHtml } from '../src/shared/mdToOneNote'

describe('markdownToOneNoteHtml', () => {
  it('extracts the H1 as the page title', () => {
    const { title, fullHtml } = markdownToOneNoteHtml('# My Page\n\nHello world.')
    expect(title).toBe('My Page')
    expect(fullHtml).toContain('<title>My Page</title>')
    expect(fullHtml).toMatch(/<h1[^>]*>My Page<\/h1>/)
  })

  it('falls back to the provided title when there is no H1', () => {
    const { title } = markdownToOneNoteHtml('Just a paragraph.', 'Fallback')
    expect(title).toBe('Fallback')
  })

  it('renders bold and italic as b/i, not strong/em', () => {
    const { bodyHtml } = markdownToOneNoteHtml('**bold** and *italic*')
    expect(bodyHtml).toContain('<b>bold</b>')
    expect(bodyHtml).toContain('<i>italic</i>')
    expect(bodyHtml).not.toMatch(/<\/?strong>|<\/?em>/)
  })

  it('renders nested lists', () => {
    const { bodyHtml } = markdownToOneNoteHtml('- one\n  - nested\n- two')
    expect(bodyHtml).toContain('<ul')
    expect(bodyHtml).toContain('<li>')
    expect(bodyHtml.match(/<ul /g)?.length).toBe(2)
  })

  it('renders ordered lists as <ol>', () => {
    const { bodyHtml } = markdownToOneNoteHtml('1. first\n2. second')
    expect(bodyHtml).toContain('<ol')
    expect(bodyHtml).toMatch(/<li><p[^>]*>first<\/p><\/li>/)
  })

  it('renders task list items with data-tag', () => {
    const { bodyHtml } = markdownToOneNoteHtml('- [ ] todo item\n- [x] done item')
    expect(bodyHtml).toContain('data-tag="to-do"')
    expect(bodyHtml).toContain('data-tag="to-do:completed"')
    expect(bodyHtml).toContain('>todo item<')
    expect(bodyHtml).toContain('>done item<')
  })

  it('renders a GFM table with bold, shaded header cells', () => {
    const { bodyHtml } = markdownToOneNoteHtml('| A | B |\n| --- | --- |\n| 1 | 2 |')
    expect(bodyHtml).toContain('<table')
    expect(bodyHtml).toMatch(/<td[^>]*background-color:#f4f4f4[^>]*><p[^>]*><b>A<\/b><\/p><\/td>/)
    expect(bodyHtml).toMatch(/<td[^>]*><p[^>]*>1<\/p><\/td>/)
  })

  it('renders fenced code blocks as a boxed single-cell table, not <pre>', () => {
    // A styled <pre> was observed to lose its background/border when pasted
    // into OneNote; a table cell survives paste far more reliably.
    const { bodyHtml } = markdownToOneNoteHtml('```js\nconst x = 1;\n```')
    expect(bodyHtml).not.toContain('<pre')
    expect(bodyHtml).toMatch(/<table[^>]*><tr><td style="[^"]*background-color:#f4f4f4[^"]*">const x = 1;<\/td><\/tr><\/table>/)
  })

  it('preserves indentation and line breaks in code blocks via &nbsp;/<br>', () => {
    const { bodyHtml } = markdownToOneNoteHtml('```\nline one\n  indented\n```')
    expect(bodyHtml).toContain('line one<br/>&nbsp;&nbsp;indented')
  })

  it('renders inline code as a monospace, boxed span', () => {
    const { bodyHtml } = markdownToOneNoteHtml('Use `npm install`.')
    expect(bodyHtml).toContain('font-family:Consolas')
    expect(bodyHtml).toContain('background-color:#f0f0f0')
    expect(bodyHtml).toContain('npm install')
  })

  it('renders links', () => {
    const { bodyHtml } = markdownToOneNoteHtml('[OneNote](https://onenote.com)')
    expect(bodyHtml).toMatch(/<a href="https:\/\/onenote\.com"[^>]*>OneNote<\/a>/)
  })

  it('renders images', () => {
    const { bodyHtml } = markdownToOneNoteHtml('![alt text](https://example.com/a.png)')
    expect(bodyHtml).toContain('src="https://example.com/a.png"')
    expect(bodyHtml).toContain('alt="alt text"')
  })

  it('approximates blockquotes with an indented, bordered div', () => {
    const { bodyHtml } = markdownToOneNoteHtml('> quoted text')
    expect(bodyHtml).toContain('border-left:3px solid')
    expect(bodyHtml).toContain('quoted text')
  })

  it('escapes HTML-significant characters in plain text', () => {
    const { bodyHtml } = markdownToOneNoteHtml('1 < 2 & 3 > 1')
    expect(bodyHtml).toContain('1 &lt; 2 &amp; 3 &gt; 1')
  })

  it('passes inline HTML through verbatim, for colored text', () => {
    const { bodyHtml } = markdownToOneNoteHtml(
      'This is <span style="color:#c0392b">red text</span> in a sentence.'
    )
    expect(bodyHtml).toContain('<span style="color:#c0392b">red text</span>')
  })

  it('gives every paragraph explicit margin so pasted spacing matches the preview', () => {
    const { bodyHtml } = markdownToOneNoteHtml('One.\n\nTwo.')
    const matches = bodyHtml.match(/<p style="[^"]*margin:[^"]*"/g)
    expect(matches?.length).toBe(2)
  })

  it('produces a well-formed full document', () => {
    const { fullHtml } = markdownToOneNoteHtml('# Title\n\nBody text.')
    expect(fullHtml).toMatch(/^<!DOCTYPE html>/)
    expect(fullHtml).toContain('<head>')
    expect(fullHtml).toContain('<body>')
  })
})
