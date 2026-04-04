---
name: "calls-mcp-playwright-playwright_get"
description: "Perform an HTTP GET request"
---

# MCP Call Instructions: mcp-playwright.playwright_get

Generated: 2026-04-04T18:26:49.769Z

Description: Perform an HTTP GET request

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_get --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_get {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_get` with `argsJson`

## Arguments
- Required: url
- Optional: token, headers

## Example
- `mcporter call mcp-playwright.playwright_get --args '{"url":"..."}'`