import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isInside, MARKDOWN_FILE_RE } from '../src/main/pathUtils'

describe('isInside', () => {
  const root = path.resolve('/projects/notes')

  it('accepts the root and its descendants', () => {
    expect(isInside(root, root)).toBe(true)
    expect(isInside(root, path.join(root, 'a.md'))).toBe(true)
    expect(isInside(root, path.join(root, 'sub', 'deep', 'a.md'))).toBe(true)
  })

  it('rejects parents, siblings and traversal', () => {
    expect(isInside(root, path.resolve('/projects'))).toBe(false)
    expect(isInside(root, path.resolve('/projects/notes-other/a.md'))).toBe(false)
    expect(isInside(root, path.join(root, '..', 'secret.md'))).toBe(false)
  })
})

describe('MARKDOWN_FILE_RE', () => {
  it('matches markdown/text extensions only', () => {
    for (const n of ['a.md', 'A.MD', 'a.markdown', 'a.mdown', 'a.txt']) {
      expect(MARKDOWN_FILE_RE.test(n)).toBe(true)
    }
    for (const n of ['a.png', 'a.md.exe', 'md', 'a.json']) {
      expect(MARKDOWN_FILE_RE.test(n)).toBe(false)
    }
  })
})
