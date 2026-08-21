import { contextBridge, ipcRenderer } from 'electron'
import type { OneNoteBridge } from '../shared/types'

const api: OneNoteBridge = {
  files: {
    openMarkdown: () => ipcRenderer.invoke('files:openMarkdown'),
    saveMarkdown: (content: string, suggestedName?: string) =>
      ipcRenderer.invoke('files:saveMarkdown', content, suggestedName),
    copyText: (text: string) => ipcRenderer.invoke('files:copyText', text),
    copyForOneNote: (payload: { text: string; html: string }) =>
      ipcRenderer.invoke('files:copyForOneNote', payload),
    readClipboardHtml: () => ipcRenderer.invoke('files:readClipboardHtml')
  }
}

contextBridge.exposeInMainWorld('oneNote', api)
