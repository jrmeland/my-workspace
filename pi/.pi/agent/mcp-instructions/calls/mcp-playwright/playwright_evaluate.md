---
name: "calls-mcp-playwright-playwright_evaluate"
description: "Execute JavaScript in the browser console"
---

# MCP Call Instructions: mcp-playwright.playwright_evaluate

Generated: 2026-04-04T18:26:49.769Z

Description: Execute JavaScript in the browser console

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_evaluate --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_evaluate {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_evaluate` with `argsJson`

## Arguments
- Required: script
- Optional: none

## Example
- `mcporter call mcp-playwright.playwright_evaluate --args '{"script":"..."}'`