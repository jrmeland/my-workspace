---
name: "calls-mcp-playwright-playwright_post"
description: "Perform an HTTP POST request"
---

# MCP Call Instructions: mcp-playwright.playwright_post

Generated: 2026-04-04T18:26:49.769Z

Description: Perform an HTTP POST request

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_post --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_post {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_post` with `argsJson`

## Arguments
- Required: url, value
- Optional: token, headers

## Example
- `mcporter call mcp-playwright.playwright_post --args '{"url":"...","value":"..."}'`