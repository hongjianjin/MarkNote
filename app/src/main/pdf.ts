import { app, BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Prints a complete HTML document to PDF using a hidden, locked-down window
 * (no script, no Node, sandboxed). The page size and margins come from the
 * document's own @page rule (see shared/exportHtml.ts).
 */
export async function htmlToPdf(html: string): Promise<Buffer> {
  // A temp file rather than a data: URL, which Chromium caps at ~2 MB.
  const tmpFile = path.join(app.getPath('temp'), `marknote-${randomUUID()}.html`)
  await fs.writeFile(tmpFile, html, 'utf-8')

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      javascript: false
    }
  })

  try {
    await win.loadFile(tmpFile)
    return await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true })
  } finally {
    win.destroy()
    await fs.rm(tmpFile, { force: true })
  }
}
