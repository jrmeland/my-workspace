---
name: "calls-mcp-playwright-get_codegen_session"
description: "Get information about a code generation session"
---

# MCP Call Instructions: mcp-playwright.get_codegen_session

Generated: 2026-04-04T18:26:49.768Z

Description: Get information about a code generation session

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.get_codegen_session --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.get_codegen_session {"k":"v"}`
- pi tool: `mcp_mcp-playwright_get_codegen_session` with `argsJson`

## Arguments
- Required: sessionId
- Optional: none

## Example
- `mcporter call mcp-playwright.get_codegen_session --args '{"sessionId":"..."}'`