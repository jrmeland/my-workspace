---
name: "calls-puppeteer-puppeteer_select"
description: "Select an element on the page with Select tag"
---

# MCP Call Instructions: puppeteer.puppeteer_select

Generated: 2026-04-04T18:26:40.439Z

Description: Select an element on the page with Select tag

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call puppeteer.puppeteer_select --args '{"k":"v"}'`
- pi command: `/mcp-call puppeteer.puppeteer_select {"k":"v"}`
- pi tool: `mcp_puppeteer_puppeteer_select` with `argsJson`

## Arguments
- Required: selector, value
- Optional: none

## Example
- `mcporter call puppeteer.puppeteer_select --args '{"selector":"...","value":"..."}'`