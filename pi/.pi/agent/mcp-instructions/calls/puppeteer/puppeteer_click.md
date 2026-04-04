---
name: "calls-puppeteer-puppeteer_click"
description: "Click an element on the page"
---

# MCP Call Instructions: puppeteer.puppeteer_click

Generated: 2026-04-04T18:26:40.439Z

Description: Click an element on the page

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call puppeteer.puppeteer_click --args '{"k":"v"}'`
- pi command: `/mcp-call puppeteer.puppeteer_click {"k":"v"}`
- pi tool: `mcp_puppeteer_puppeteer_click` with `argsJson`

## Arguments
- Required: selector
- Optional: none

## Example
- `mcporter call puppeteer.puppeteer_click --args '{"selector":"..."}'`