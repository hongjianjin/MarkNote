import { ipcMain, BrowserWindow, dialog, clipboard } from 'electron'
import { promises as fs } from 'node:fs'

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'page'
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
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win ?? (undefined as never), {
      title: 'Save Markdown file',
      defaultPath: `${sanitizeFileName(suggestedName ?? 'page')}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (result.canceled || !result.filePath) return null
    await fs.writeFile(result.filePath, content, 'utf-8')
    return { path: result.filePath }
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
