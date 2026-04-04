---
name: "calls-mcp-playwright-playwright_upload_file"
description: "Upload a file to an input[type='file'] element on the page"
---

# MCP Call Instructions: mcp-playwright.playwright_upload_file

Generated: 2026-04-04T18:26:49.769Z

Description: Upload a file to an input[type='file'] element on the page

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_upload_file --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_upload_file {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_upload_file` with `argsJson`

## Arguments
- Required: selector, filePath
- Optional: none

## Example
- `mcporter call mcp-playwright.playwright_upload_file --args '{"selector":"...","filePath":"..."}'`