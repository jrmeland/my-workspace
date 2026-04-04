---
name: "calls-puppeteer-puppeteer_screenshot"
description: "Take a screenshot of the current page or a specific element"
---

# MCP Call Instructions: puppeteer.puppeteer_screenshot

Generated: 2026-04-04T18:26:40.439Z

Description: Take a screenshot of the current page or a specific element

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call puppeteer.puppeteer_screenshot --args '{"k":"v"}'`
- pi command: `/mcp-call puppeteer.puppeteer_screenshot {"k":"v"}`
- pi tool: `mcp_puppeteer_puppeteer_screenshot` with `argsJson`

## Arguments
- Required: name
- Optional: selector, width, height, encoded

## Example
- `mcporter call puppeteer.puppeteer_screenshot --args '{"name":"..."}'`