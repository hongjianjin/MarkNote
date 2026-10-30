import { ipcMain, BrowserWindow, dialog, clipboard } from 'electron'
import { promises as fs } from 'node:fs'
import { htmlToPdf } from './pdf'

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'page'
}

/** Shows a Save dialog for `ext` files; resolves to the chosen path, or null if cancelled. */
async function pickSavePath(
  title: string,
  suggestedName: string | undefined,
  ext: string,
  filterName: string
): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow()
  const options = {
    title,
    defaultPath: `${sanitizeFileName(suggestedName ?? 'page')}.${ext}`,
    filters: [{ name: filterName, extensions: [ext] }]
  }
  const result = win
    ? await dialog.showSaveDialog(win, options)
    : await dialog.showSaveDialog(options)
  return result.canceled || !result.filePath ? null : result.filePath
}

export function registerIpcHandlers(): void {
  ipcMain.handle('files:openMarkdown', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win ?? (undefined as never), {
      title: 'Open Markdown file',
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const content = await fs.readFile(filePath, 'utf-8')
    return { path: filePath, content }
  })

  ipcMain.handle('files:saveMarkdown', async (_e, content: string, suggestedName?: string) => {
    const filePath = await pickSavePath('Save Markdown file', suggestedName, 'md', 'Markdown')
    if (!filePath) return null
    await fs.writeFile(filePath, content, 'utf-8')
    return { path: filePath }
  })

  ipcMain.handle('files:saveHtml', async (_e, html: string, suggestedName?: string) => {
    const filePath = await pickSavePath('Save as HTML', suggestedName, 'html', 'HTML')
    if (!filePath) return null
    await fs.writeFile(filePath, html, 'utf-8')
    return { path: filePath }
  })

  ipcMain.handle('files:savePdf', async (_e, html: string, suggestedName?: string) => {
    // Ask where to save first, so cancelling doesn't cost a render.
    const filePath = await pickSavePath('Save as PDF', suggestedName, 'pdf', 'PDF')
    if (!filePath) return null
    await fs.writeFile(filePath, await htmlToPdf(html))
    return { path: filePath }
  })

  ipcMain.handle('files:copyText', (_e, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('files:copyForOneNote', (_e, payload: { text: string; html: string }) => {
    clipboard.write({ text: payload.text, html: payload.html })
  })

  ipcMain.handle('files:readClipboardHtml', () => {
    const html = clipboard.readHTML()
    return html && html.trim() ? html : null
  })
}
