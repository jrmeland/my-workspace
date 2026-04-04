---
name: "calls-puppeteer-puppeteer_fill"
description: "Fill out an input field"
---

# MCP Call Instructions: puppeteer.puppeteer_fill

Generated: 2026-04-04T18:26:40.439Z

Description: Fill out an input field

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call puppeteer.puppeteer_fill --args '{"k":"v"}'`
- pi command: `/mcp-call puppeteer.puppeteer_fill {"k":"v"}`
- pi tool: `mcp_puppeteer_puppeteer_fill` with `argsJson`

## Arguments
- Required: selector, value
- Optional: none

## Example
- `mcporter call puppeteer.puppeteer_fill --args '{"selector":"...","value":"..."}'`