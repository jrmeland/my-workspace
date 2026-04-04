---
name: "calls-mcp-playwright-playwright_press_key"
description: "Press a keyboard key"
---

# MCP Call Instructions: mcp-playwright.playwright_press_key

Generated: 2026-04-04T18:26:49.771Z

Description: Press a keyboard key

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_press_key --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_press_key {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_press_key` with `argsJson`

## Arguments
- Required: key
- Optional: selector

## Example
- `mcporter call mcp-playwright.playwright_press_key --args '{"key":"..."}'`