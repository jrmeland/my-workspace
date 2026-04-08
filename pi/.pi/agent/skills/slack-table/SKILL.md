---
name: "slack-table"
description: "Convert markdown tables or data into tab-separated format for Slack's native table rendering. Use when the user wants to share a table in Slack, format data for Slack, or asks for a 'Slack table'."
---

# Slack Table Formatter

Convert tables into TSV (tab-separated values) and copy to clipboard. When pasted into Slack, TSV data renders as a native formatted table.

## How to use

When the user asks to format a table for Slack, convert it to TSV and copy to clipboard:

```bash
printf "Col1\tCol2\tCol3\nval1\tval2\tval3\nval4\tval5\tval6" | pbcopy
```

## Rules

- Use `printf` with `\t` for tab characters — do NOT use literal spaces or markdown pipes
- Use `pbcopy` to put it on the clipboard automatically
- Strip any markdown formatting (`**bold**` → `bold`, etc.) — Slack applies its own styling
- First row should be column headers
- Tell the user it's on their clipboard and to paste directly into a Slack message
