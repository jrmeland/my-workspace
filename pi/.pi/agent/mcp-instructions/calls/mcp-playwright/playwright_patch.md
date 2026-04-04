---
name: "calls-mcp-playwright-playwright_patch"
description: "Perform an HTTP PATCH request"
---

# MCP Call Instructions: mcp-playwright.playwright_patch

Generated: 2026-04-04T18:26:49.770Z

Description: Perform an HTTP PATCH request

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_patch --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_patch {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_patch` with `argsJson`

## Arguments
- Required: url, value
- Optional: token, headers

## Example
- `mcporter call mcp-playwright.playwright_patch --args '{"url":"...","value":"..."}'`