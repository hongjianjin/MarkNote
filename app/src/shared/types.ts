// Shared types used across main, preload, and renderer processes.

/** The typed API the preload script exposes to the renderer via contextBridge. */
export interface OneNoteBridge {
  files: {
    openMarkdown: () => Promise<{ path: string; content: string } | null>
    saveMarkdown: (content: string, suggestedName?: string) => Promise<{ path: string } | null>
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
