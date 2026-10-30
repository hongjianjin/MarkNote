import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { DirEntry } from '../shared/types'
import { isInside, MARKDOWN_FILE_RE } from './pathUtils'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const SKIPPED_DIRS = new Set(['node_modules'])

// The explorer root is chosen by the user in a native dialog and kept here in the
// main process. The renderer can only list/read paths inside it — it never supplies
// the root itself, so a compromised page can't use this API to read arbitrary files.
let root: string | null = null
let rootLoaded = false

function rootFile(): string {
  return path.join(app.getPath('userData'), 'explorer-root.json')
}

async function getRoot(): Promise<string | null> {
  if (rootLoaded) return root
  rootLoaded = true
  try {
    const saved = JSON.parse(await fs.readFile(rootFile(), 'utf-8')) as { root?: unknown }
    if (typeof saved.root === 'string' && (await fs.stat(saved.root)).isDirectory()) {
      root = await fs.realpath(saved.root)
    }
  } catch {
    // No saved folder, or it no longer exists.
  }
  return root
}

async function assertInsideRoot(target: string): Promise<string> {
  const base = await getRoot()
  if (!base) throw new Error('No folder is open.')
  const real = await fs.realpath(target)
  if (!isInside(base, real)) throw new Error('That path is outside the opened folder.')
  return real
}

async function listDir(dir: string): Promise<DirEntry[]> {
  const real = await assertInsideRoot(dir)
  const dirents = await fs.readdir(real, { withFileTypes: true })
  const entries: DirEntry[] = []
  for (const d of dirents) {
    if (d.name.startsWith('.')) continue
    const full = path.join(real, d.name)
    let isDirectory = d.isDirectory()
    if (d.isSymbolicLink()) {
      try {
        isDirectory = (await fs.stat(full)).isDirectory()
      } catch {
        continue // broken link
      }
    }
    if (isDirectory) {
      if (!SKIPPED_DIRS.has(d.name)) entries.push({ name: d.name, path: full, isDirectory: true })
    } else if (MARKDOWN_FILE_RE.test(d.name)) {
      entries.push({ name: d.name, path: full, isDirectory: false })
    }
  }
  return entries.sort(
    (a, b) =>
      Number(b.isDirectory) - Number(a.isDirectory) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
  )
}

async function readFile(file: string): Promise<string> {
  if (!MARKDOWN_FILE_RE.test(file)) throw new Error('Only Markdown/text files can be opened.')
  const real = await assertInsideRoot(file)
  const stat = await fs.stat(real)
  if (stat.size > MAX_FILE_BYTES) throw new Error('File is larger than 10 MB.')
  return fs.readFile(real, 'utf-8')
}

export function registerExplorerHandlers(): void {
  ipcMain.handle('explorer:getRoot', () => getRoot())

  ipcMain.handle('explorer:chooseRoot', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const options = {
      title: 'Open folder',
      properties: ['openDirectory' as const]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    root = await fs.realpath(result.filePaths[0])
    rootLoaded = true
    await fs.writeFile(rootFile(), JSON.stringify({ root }), 'utf-8')
    return root
  })

  ipcMain.handle('explorer:listDir', (_e, dir: string) => listDir(dir))
  ipcMain.handle('explorer:readFile', (_e, file: string) => readFile(file))
}
