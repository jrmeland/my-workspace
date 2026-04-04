---
name: "calls-mcp-playwright-playwright_drag"
description: "Drag an element to a target location"
---

# MCP Call Instructions: mcp-playwright.playwright_drag

Generated: 2026-04-04T18:26:49.771Z

Description: Drag an element to a target location

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_drag --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_drag {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_drag` with `argsJson`

## Arguments
- Required: sourceSelector, targetSelector
- Optional: none

## Example
- `mcporter call mcp-playwright.playwright_drag --args '{"sourceSelector":"...","targetSelector":"..."}'`