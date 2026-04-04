---
name: "calls-mcp-playwright-playwright_get_visible_html"
description: "Get the HTML content of the current page. By default, all <script> tags are removed from the output unless removeScripts is explicitly set to false."
---

# MCP Call Instructions: mcp-playwright.playwright_get_visible_html

Generated: 2026-04-04T18:26:49.770Z

Description: Get the HTML content of the current page. By default, all <script> tags are removed from the output unless removeScripts is explicitly set to false.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.playwright_get_visible_html --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.playwright_get_visible_html {"k":"v"}`
- pi tool: `mcp_mcp-playwright_playwright_get_visible_html` with `argsJson`

## Arguments
- Required: none
- Optional: selector, removeScripts, removeComments, removeStyles, removeMeta, cleanHtml, minify, maxLength

## Example
- `mcporter call mcp-playwright.playwright_get_visible_html`