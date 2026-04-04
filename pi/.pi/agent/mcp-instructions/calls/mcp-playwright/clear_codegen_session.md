---
name: "calls-mcp-playwright-clear_codegen_session"
description: "Clear a code generation session without generating a test"
---

# MCP Call Instructions: mcp-playwright.clear_codegen_session

Generated: 2026-04-04T18:26:49.768Z

Description: Clear a code generation session without generating a test

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.clear_codegen_session --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.clear_codegen_session {"k":"v"}`
- pi tool: `mcp_mcp-playwright_clear_codegen_session` with `argsJson`

## Arguments
- Required: sessionId
- Optional: none

## Example
- `mcporter call mcp-playwright.clear_codegen_session --args '{"sessionId":"..."}'`