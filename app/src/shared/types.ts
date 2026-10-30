// Shared types used across main, preload, and renderer processes.

export interface DirEntry {
  name: string
  /** Absolute path. */
  path: string
  isDirectory: boolean
}

/** The typed API the preload script exposes to the renderer via contextBridge. */
export interface OneNoteBridge {
  explorer: {
    /** The previously opened folder, if it still exists. */
    getRoot: () => Promise<string | null>
    /** Shows a folder picker; null if cancelled. */
    chooseRoot: () => Promise<string | null>
    /** Subfolders and Markdown/text files in a folder (must be inside the opened folder). */
    listDir: (dir: string) => Promise<DirEntry[]>
    /** Text of a Markdown/text file (must be inside the opened folder). */
    readFile: (file: string) => Promise<string>
  }
  files: {
    openMarkdown: () => Promise<{ path: string; content: string } | null>
    saveMarkdown: (content: string, suggestedName?: string) => Promise<{ path: string } | null>
    /** Saves a complete standalone HTML document via a Save dialog. Null if cancelled. */
    saveHtml: (html: string, suggestedName?: string) => Promise<{ path: string } | null>
    /** Prints a complete standalone HTML document to PDF via a Save dialog. Null if cancelled. */
    savePdf: (html: string, suggestedName?: string) => Promise<{ path: string } | null>
    /** Plain-text clipboard copy (the raw Markdown source). */
    copyText: (text: string) => Promise<void>
    /** Writes both a plain-text and an HTML flavor to the clipboard, so pasting into
     *  OneNote (or Word, email, etc.) picks up rich formatting instead of raw text. */
    copyForOneNote: (payload: { text: string; html: string }) => Promise<void>
    /** Reads the HTML flavor currently on the clipboard (e.g. copied from a OneNote
     *  page), or null if the clipboard has no HTML content. */
    readClipboardHtml: () => Promise<string | null>
  }
}
