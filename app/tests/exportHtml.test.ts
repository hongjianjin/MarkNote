import { describe, expect, it } from 'vitest'
import { buildStandaloneHtml } from '../src/shared/exportHtml'

describe('buildStandaloneHtml', () => {
  it('produces a complete document containing the body', () => {
    const html = buildStandaloneHtml('My Doc', '<h1>Hello</h1><p>World</p>')
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('<h1>Hello</h1><p>World</p>')
    expect(html).toContain('</html>')
  })

  it('escapes the title', () => {
    const html = buildStandaloneHtml('A <b> & C', '<p>x</p>')
    expect(html).toContain('<title>A &lt;b&gt; &amp; C</title>')
  })

  it('embeds styles and forbids script via CSP', () => {
    const html = buildStandaloneHtml('t', '<p>x</p>')
    expect(html).toContain('<style>')
    expect(html).toContain('@page')
    expect(html).toMatch(/Content-Security-Policy" content="default-src 'none'/)
    expect(html).not.toMatch(/script-src/)
  })
})
