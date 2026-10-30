import path from 'node:path'

/** True if `target` is `root` itself or lies inside it (both should already be real/absolute paths). */
export function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

export const MARKDOWN_FILE_RE = /\.(md|markdown|mdown|txt)$/i
