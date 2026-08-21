# MarkNote

A cross-platform (Windows + macOS) Markdown writing tool for Microsoft OneNote, in the spirit
of [OneMark](https://onemark.neux.studio/).

## Why a standalone app, not an "add-in"?

Microsoft's OneNote add-in platform (`OneNote.run`, task panes) only runs inside **OneNote on
the web** — neither the Windows desktop app nor OneNote for Mac supports it, and Mac has no
OneNote add-in mechanism at all. So instead of an in-app plugin (which couldn't run on both
Windows and macOS), this is a small **Electron desktop app**.

## Why clipboard paste, not sign-in + direct push?

An earlier version of this app signed in with your Microsoft account and pushed pages straight
into your notebooks via the Graph API. In practice, getting a Microsoft Entra app registration
working turned out to be a genuine ordeal for a personal project — tenant provisioning,
work-account admin restrictions, deprecated flows — none of which is worth the hassle for what
is fundamentally a "format my Markdown nicely" tool. So the app dropped all of that: **no sign-in,
no Azure setup, no account of any kind.**

Instead, it uses the clipboard, which every version of OneNote (Windows, Mac, web) already
knows how to accept rich-formatted paste from:

1. Write Markdown in the app, see the live preview.
2. Click **Copy for OneNote** — this puts richly-formatted content on your system clipboard
   (not just plain text).
3. Switch to OneNote, click into a page, press **Ctrl+V** (**Cmd+V** on Mac) — it pastes in
   fully formatted: headings, bold/italic, lists, tables, checkboxes, etc.

It also works the other way — **Paste from OneNote** reads whatever rich content you last
copied from a OneNote page and converts it back into Markdown in the editor, so you can pull
existing notes in, edit them as Markdown, and copy them back out.

## Features

- Live-preview Markdown editor (GFM: headings, bold/italic, nested lists, tables, fenced code
  blocks, `- [ ]` task-list checkboxes, links, images).
- **Copy for OneNote** — copies richly-formatted content to the clipboard for pasting into any
  OneNote page, on any platform.
- **Paste from OneNote** — converts whatever's on the clipboard (copied from a OneNote page)
  back into Markdown.
- Open/save local `.md` files; copy the raw Markdown source to the clipboard.

## Known limitations

- **No LaTeX rendering in OneNote itself.** OneNote's HTML subset has no math support, so LaTeX
  isn't converted — write it as a fenced code block for now if you need to keep the source.
- **No automatic notebook browsing.** Since there's no sign-in, the app doesn't know which
  notebooks/pages exist — you paste manually into whichever page you have open in OneNote. If
  you'd rather have direct notebook browsing and one-click page creation via the Microsoft
  Graph API, that's a separate, sign-in-based mode that was deliberately left out for now — ask
  if you want it added back as an optional path.
- **Unsigned.** Windows will show a SmartScreen warning ("Windows protected your PC" →
  More info → Run anyway) the first time someone runs the `.exe`, since it isn't signed by a
  recognized publisher. Real code-signing certs (and, for macOS, notarization) are something
  only you can obtain — not something this build process can add.
- **macOS build can't be produced from this Windows machine.** A `.dmg`/mac `.app` genuinely
  needs to be built on macOS (or CI running macOS); `npm run build:mac` will not work here.

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
