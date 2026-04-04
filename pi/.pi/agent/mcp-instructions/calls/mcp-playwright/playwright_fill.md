---
name: "calls-mcp-playwright-playwright_fill"
description: "fill out an input field"
---

# MCP Call Instructions: mcp-playwright.playwright_fill

Generated: 2026-04-04T18:26:49.769Z

Description: fill out an input field

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_fill --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_fill {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_fill` with `argsJson`

## Arguments
- Required: selector, value
- Optional: none

## Example
- `mcporter call mcp-playwright.playwright_fill --args '{"selector":"...","value":"..."}'`