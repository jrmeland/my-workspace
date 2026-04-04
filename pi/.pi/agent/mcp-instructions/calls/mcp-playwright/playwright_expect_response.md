---
name: "calls-mcp-playwright-playwright_expect_response"
description: "Ask Playwright to start waiting for a HTTP response. This tool initiates the wait operation but does not wait for its completion."
---

# MCP Call Instructions: mcp-playwright.playwright_expect_response

Generated: 2026-04-04T18:26:49.770Z

Description: Ask Playwright to start waiting for a HTTP response. This tool initiates the wait operation but does not wait for its completion.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_expect_response --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_expect_response {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_expect_response` with `argsJson`

## Arguments
- Required: id, url
- Optional: none

## Example
- `mcporter call mcp-playwright.playwright_expect_response --args '{"id":"...","url":"..."}'`