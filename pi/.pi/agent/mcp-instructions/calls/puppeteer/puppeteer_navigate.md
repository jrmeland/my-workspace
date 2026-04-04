---
name: "calls-puppeteer-puppeteer_navigate"
description: "Navigate to a URL"
---

# MCP Call Instructions: puppeteer.puppeteer_navigate

Generated: 2026-04-04T18:26:40.439Z

Description: Navigate to a URL

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call puppeteer.puppeteer_navigate --args '{"k":"v"}'`
- pi command: `/mcp-call puppeteer.puppeteer_navigate {"k":"v"}`
- pi tool: `mcp_puppeteer_puppeteer_navigate` with `argsJson`

## Arguments
- Required: url
- Optional: launchOptions, allowDangerous

## Example
- `mcporter call puppeteer.puppeteer_navigate --args '{"url":"..."}'`