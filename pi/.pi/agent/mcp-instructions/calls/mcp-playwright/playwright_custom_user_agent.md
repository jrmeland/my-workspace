---
name: "calls-mcp-playwright-playwright_custom_user_agent"
description: "Set a custom User Agent for the browser"
---

# MCP Call Instructions: mcp-playwright.playwright_custom_user_agent

Generated: 2026-04-04T18:26:49.770Z

Description: Set a custom User Agent for the browser

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_custom_user_agent --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_custom_user_agent {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_custom_user_agent` with `argsJson`

## Arguments
- Required: userAgent
- Optional: none

## Example
- `mcporter call mcp-playwright.playwright_custom_user_agent --args '{"userAgent":"..."}'`