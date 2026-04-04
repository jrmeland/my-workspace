---
name: "calls-puppeteer-puppeteer_evaluate"
description: "Execute JavaScript in the browser console"
---

# MCP Call Instructions: puppeteer.puppeteer_evaluate

Generated: 2026-04-04T18:26:40.439Z

Description: Execute JavaScript in the browser console

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call puppeteer.puppeteer_evaluate --args '{"k":"v"}'`
- pi command: `/mcp-call puppeteer.puppeteer_evaluate {"k":"v"}`
- pi tool: `mcp_puppeteer_puppeteer_evaluate` with `argsJson`

## Arguments
- Required: script
- Optional: none

## Example
- `mcporter call puppeteer.puppeteer_evaluate --args '{"script":"..."}'`