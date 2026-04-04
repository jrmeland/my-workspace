---
name: "calls-mcp-playwright-playwright_screenshot"
description: "Take a screenshot of the current page or a specific element"
---

# MCP Call Instructions: mcp-playwright.playwright_screenshot

Generated: 2026-04-04T18:26:49.768Z

Description: Take a screenshot of the current page or a specific element

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_screenshot --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_screenshot {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_screenshot` with `argsJson`

## Arguments
- Required: name
- Optional: selector, width, height, storeBase64, fullPage, savePng, downloadsDir

## Example
- `mcporter call mcp-playwright.playwright_screenshot --args '{"name":"..."}'`