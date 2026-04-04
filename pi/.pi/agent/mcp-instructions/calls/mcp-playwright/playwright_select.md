---
name: "calls-mcp-playwright-playwright_select"
description: "Select an element on the page with Select tag"
---

# MCP Call Instructions: mcp-playwright.playwright_select

Generated: 2026-04-04T18:26:49.769Z

Description: Select an element on the page with Select tag

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_select --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_select {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_select` with `argsJson`

## Arguments
- Required: selector, value
- Optional: none

## Example
- `mcporter call mcp-playwright.playwright_select --args '{"selector":"...","value":"..."}'`