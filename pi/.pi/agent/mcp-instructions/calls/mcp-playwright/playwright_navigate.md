---
name: "calls-mcp-playwright-playwright_navigate"
description: "Navigate to a URL"
---

# MCP Call Instructions: mcp-playwright.playwright_navigate

Generated: 2026-04-04T18:26:49.768Z

Description: Navigate to a URL

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_navigate --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_navigate {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_navigate` with `argsJson`

## Arguments
- Required: url
- Optional: browserType, width, height, timeout, waitUntil, headless

## Example
- `mcporter call mcp-playwright.playwright_navigate --args '{"url":"..."}'`