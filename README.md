# MarkNote

A Windows desktop Markdown writing tool for Microsoft OneNote, in the spirit of
[OneMark](https://onemark.neux.studio/).

## Requirements

**To just run the app** (using a build from [Packaging](#packaging), e.g. `MarkNote-win-x64.zip`):
- Windows 10 or 11 (x64 or arm64)
- Nothing else — Electron bundles its own Chromium/Node runtime, so there's no separate
  install of Node, a browser, or any runtime required.
- Microsoft OneNote (desktop or web) installed/available, to paste into.

**To build or develop from source** (everything under [Development](#development) and
[Packaging](#packaging)):
- [Node.js](https://nodejs.org/) 20 or later (LTS recommended) — npm comes bundled with it
- Git, if cloning this repo rather than downloading it as a zip
- Windows, for `npm run build:win` specifically (electron-builder cross-compiles most of the
  packaging, but the app itself has only been built/tested on Windows — see
  [Known limitations](#known-limitations))

## Why a standalone app, not an "add-in"?

Microsoft's OneNote add-in platform (`OneNote.run`, task panes) only runs inside **OneNote on
the web** — the Windows desktop app doesn't support it at all. So instead of an in-app plugin
(which couldn't run there), this is a small **Electron desktop app**.

## Why clipboard paste, not sign-in + direct push?

An earlier version of this app signed in with your Microsoft account and pushed pages straight
into your notebooks via the Graph API. In practice, getting a Microsoft Entra app registration
working turned out to be a genuine ordeal for a personal project — tenant provisioning,
work-account admin restrictions, deprecated flows — none of which is worth the hassle for what
is fundamentally a "format my Markdown nicely" tool. So the app dropped all of that: **no sign-in,
no Azure setup, no account of any kind.**

Instead, it uses the clipboard, which OneNote already knows how to accept rich-formatted paste
from:

1. Write Markdown in the app, see the live preview.
2. Click **Copy for OneNote** — this puts richly-formatted content on your system clipboard
   (not just plain text).
3. Switch to OneNote, click into a page, press **Ctrl+V** — it pastes in fully formatted:
   headings, bold/italic, lists, tables, checkboxes, etc.

It also works the other way — **Paste from OneNote** reads whatever rich content you last
copied from a OneNote page and converts it back into Markdown in the editor, so you can pull
existing notes in, edit them as Markdown, and copy them back out.

## Features

- Live-preview Markdown editor (GFM: headings, bold/italic, nested lists, tables, fenced code
  blocks, `- [ ]` task-list checkboxes, links, images).
- **Copy for OneNote** — copies richly-formatted content to the clipboard for pasting into any
  OneNote page.
- **Paste from OneNote** — converts whatever's on the clipboard (copied from a OneNote page)
  back into Markdown.
- Open/save local `.md` files; copy the raw Markdown source to the clipboard.
- **Drag and drop** a `.md` / `.markdown` / `.txt` file anywhere onto the window to open it
  (asks first if that would discard unsaved edits).
- **Save HTML** / **Save PDF** — export the rendered preview as a self-contained HTML file
  (styles embedded, no scripts) or a PDF. Both default to the open file's name.

## Known limitations

- **PDF page size is US Letter** (18 mm margins). To use A4, change `size: Letter` in the
  `@page` rule in `app/src/shared/exportHtml.ts`.
- **The in-app preview and exports show `- [ ]` task items as literal `[ ]` text.** They
  become real OneNote checkboxes only via **Copy for OneNote**.
- **No LaTeX rendering in OneNote itself.** OneNote's HTML subset has no math support, so LaTeX
  isn't converted — write it as a fenced code block for now if you need to keep the source.
- **No automatic notebook browsing.** Since there's no sign-in, the app doesn't know which
  notebooks/pages exist — you paste manually into whichever page you have open in OneNote. If
  you'd rather have direct notebook browsing and one-click page creation via the Microsoft
  Graph API, that's a separate, sign-in-based mode that was deliberately left out for now — ask
  if you want it added back as an optional path.
- **Unsigned.** Windows will show a SmartScreen warning ("Windows protected your PC" →
  More info → Run anyway) the first time someone runs the `.exe`, since it isn't signed by a
  recognized publisher. A real code-signing cert is something only you can obtain — not
  something this build process can add.
- **Windows only.** OneNote for Mac has no add-in mechanism either, so the same "standalone
  app" approach would work there in principle, but this build isn't packaged or tested for it.

## Project layout

See [app/](app) for the Electron project; `src/main` (Node/Electron main process — file
dialogs & clipboard access), `src/preload` (the typed bridge exposed to the renderer),
`src/renderer` (the React UI), and `src/shared` (the two Markdown ⇄ OneNote-HTML converters,
used by both the renderer and the test suite).

## Development

```bash
cd app
npm install
npm run dev         # launch the app
npm run test         # unit tests for the Markdown <-> OneNote HTML converters
npm run typecheck
```

## Packaging

```bash
npm run build:win   # -> app/dist/win-unpacked (a real, working portable app)
```

`electron-builder.yml` targets `zip` rather than an NSIS installer: NSIS pulls a signing-tool
bundle (`winCodeSign`) that needs symlink-creation privilege, which isn't available on every
Windows account (needs admin, or Developer Mode enabled in Settings). If electron-builder's own
zip step also fails on your machine for the same reason, the `win-unpacked` folder it produces
first is already a complete, runnable app — zip it yourself:

```powershell
Compress-Archive -Path app\dist\win-unpacked\* -DestinationPath MarkNote-win-x64.zip
```

To distribute: unzip anywhere and run `MarkNote.exe` — no installer needed. If you
enable Developer Mode (or build on a machine/CI where you're an admin), switch the `win.target`
in `electron-builder.yml` back to `nsis` for a proper installer with a Start Menu shortcut and
uninstaller.
