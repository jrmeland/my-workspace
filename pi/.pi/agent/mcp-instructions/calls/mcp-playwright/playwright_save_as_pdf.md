---
name: "calls-mcp-playwright-playwright_save_as_pdf"
description: "Save the current page as a PDF file"
---

# MCP Call Instructions: mcp-playwright.playwright_save_as_pdf

Generated: 2026-04-04T18:26:49.771Z

Description: Save the current page as a PDF file

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_save_as_pdf --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_save_as_pdf {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_save_as_pdf` with `argsJson`

## Arguments
- Required: outputPath
- Optional: filename, format, printBackground, margin

## Example
- `mcporter call mcp-playwright.playwright_save_as_pdf --args '{"outputPath":"..."}'`