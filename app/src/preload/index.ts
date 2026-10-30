import { contextBridge, ipcRenderer } from 'electron'
import type { OneNoteBridge } from '../shared/types'

const api: OneNoteBridge = {
  explorer: {
    getRoot: () => ipcRenderer.invoke('explorer:getRoot'),
    chooseRoot: () => ipcRenderer.invoke('explorer:chooseRoot'),
    listDir: (dir: string) => ipcRenderer.invoke('explorer:listDir', dir),
    readFile: (file: string) => ipcRenderer.invoke('explorer:readFile', file)
  },
  files: {
    openMarkdown: () => ipcRenderer.invoke('files:openMarkdown'),
    saveMarkdown: (content: string, suggestedName?: string) =>
      ipcRenderer.invoke('files:saveMarkdown', content, suggestedName),
    saveHtml: (html: string, suggestedName?: string) =>
      ipcRenderer.invoke('files:saveHtml', html, suggestedName),
    savePdf: (html: string, suggestedName?: string) =>
      ipcRenderer.invoke('files:savePdf', html, suggestedName),
    copyText: (text: string) => ipcRenderer.invoke('files:copyText', text),
    copyForOneNote: (payload: { text: string; html: string }) =>
      ipcRenderer.invoke('files:copyForOneNote', payload),
    readClipboardHtml: () => ipcRenderer.invoke('files:readClipboardHtml')
  }
}

contextBridge.exposeInMainWorld('oneNote', api)
