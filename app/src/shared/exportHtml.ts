// Wraps already-rendered (and already-sanitized) preview HTML into a
// self-contained document, used for both "Export HTML" and as the source the
// main process prints to PDF. Styles are embedded and light-only so the file
// looks the same wherever it's opened, independent of the app's own theme.

const EXPORT_CSS = `
:root { color-scheme: light; }
body {
  font-family: -apple-system, 'Segoe UI', Calibri, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #1b1d22;
  background: #ffffff;
  max-width: 820px;
  margin: 0 auto;
  padding: 32px 24px;
}
h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.4em 0 0.5em; }
h1 { font-size: 1.9em; border-bottom: 1px solid #e1e3e8; padding-bottom: 0.25em; }
h2 { font-size: 1.5em; border-bottom: 1px solid #e1e3e8; padding-bottom: 0.2em; }
h3 { font-size: 1.25em; }
h4 { font-size: 1.1em; }
h5, h6 { font-size: 1em; }
p, ul, ol, table, pre, blockquote { margin: 0 0 1em; }
code {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 0.92em;
  background: #f0f0f0;
  padding: 0.1em 0.35em;
  border-radius: 3px;
}
pre {
  background: #f4f4f4;
  padding: 12px 14px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
}
pre code { background: none; padding: 0; font-size: 0.9em; }
table { border-collapse: collapse; }
th, td { border: 1px solid #d0d0d0; padding: 5px 10px; }
th { background: #f4f4f4; }
blockquote { margin-left: 0; padding: 0.2em 1em; border-left: 4px solid #c8c8c8; color: #595959; }
img { max-width: 100%; }
a { color: #2f6feb; }
hr { border: 0; border-top: 1px solid #d0d0d0; margin: 1.5em 0; }
@page { size: Letter; margin: 18mm; }
@media print {
  body { max-width: none; padding: 0; }
  h1, h2, h3, h4, h5, h6 { break-after: avoid; }
  tr, img { break-inside: avoid; }
}
`

// The body is sanitized upstream; this CSP is a second layer so that nothing in
// the saved file (or the hidden window used for PDF printing) can run script.
const CSP =
  "default-src 'none'; img-src data: https: http: file:; style-src 'unsafe-inline'"

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function buildStandaloneHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${escapeHtml(title)}</title>
<style>${EXPORT_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`
}
