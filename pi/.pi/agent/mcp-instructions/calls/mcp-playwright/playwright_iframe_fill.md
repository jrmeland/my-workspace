---
name: "calls-mcp-playwright-playwright_iframe_fill"
description: "Fill an element in an iframe on the page"
---

# MCP Call Instructions: mcp-playwright.playwright_iframe_fill

Generated: 2026-04-04T18:26:49.769Z

Description: Fill an element in an iframe on the page

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_iframe_fill --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_iframe_fill {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_iframe_fill` with `argsJson`

## Arguments
- Required: iframeSelector, selector, value
- Optional: none

## Example
- `mcporter call mcp-playwright.playwright_iframe_fill --args '{"iframeSelector":"...","selector":"...","value":"..."}'`