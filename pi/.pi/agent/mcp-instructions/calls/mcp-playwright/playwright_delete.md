---
name: "calls-mcp-playwright-playwright_delete"
description: "Perform an HTTP DELETE request"
---

# MCP Call Instructions: mcp-playwright.playwright_delete

Generated: 2026-04-04T18:26:49.770Z

Description: Perform an HTTP DELETE request

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_delete --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_delete {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_delete` with `argsJson`

## Arguments
- Required: url
- Optional: token, headers

## Example
- `mcporter call mcp-playwright.playwright_delete --args '{"url":"..."}'`