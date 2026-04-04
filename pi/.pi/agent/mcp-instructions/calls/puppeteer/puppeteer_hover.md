---
name: "calls-puppeteer-puppeteer_hover"
description: "Hover an element on the page"
---

# MCP Call Instructions: puppeteer.puppeteer_hover

Generated: 2026-04-04T18:26:40.439Z

Description: Hover an element on the page

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call puppeteer.puppeteer_hover --args '{"k":"v"}'`
- pi command: `/mcp-call puppeteer.puppeteer_hover {"k":"v"}`
- pi tool: `mcp_puppeteer_puppeteer_hover` with `argsJson`

## Arguments
- Required: selector
- Optional: none

## Example
- `mcporter call puppeteer.puppeteer_hover --args '{"selector":"..."}'`