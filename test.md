# MarkNote — test page

This file exercises headings, a table, code, and colored text, so you can check the
**Copy for OneNote** → paste round trip end to end.

## Heading level 2

### Heading level 3

#### Heading level 4

##### Heading level 5

###### Heading level 6

## Colored text

Markdown has no native color syntax, so this app supports inline HTML for it:
This sentence has <span style="color:#c0392b">red</span>,
<span style="color:#2980b9">blue</span>, and
<span style="color:#27ae60">green</span> words, plus a
<span style="background-color:#fff3b0">highlighted</span> phrase.

## Code

Inline code like `differentialPeakAnalysis.R` or a flag like `--input-type promoter`
should render as a small monospace box.

A fenced code block:

```r
run_diff_analysis <- function(counts, meta, input_type = "peak") {
  if (input_type == "promoter") {
    message("Skipping genome-based peak annotation")
  }
  edgeR::glmQLFit(counts, design = meta$design)
}
```

## Table

| Column        | Type      | Notes                          |
| ------------- | --------- | ------------------------------- |
| `geneID`      | string    | Used as the row key when unique |
| `geneSymbol`  | string    | Human-readable gene name        |
| `Strand`      | `+` / `-` | Optional                        |
| `region`      | string    | Fallback row key                |

## Other formatting

- **Bold**, *italic*, and ~~strikethrough~~ text
- A [link to OneNote](https://onenote.com)
- Task list:
  - [ ] Open this file with **Open .md**
  - [x] Click **Copy for OneNote**
  - [ ] Paste into a OneNote page and compare
