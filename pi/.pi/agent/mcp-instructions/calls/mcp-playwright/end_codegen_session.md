---
name: "calls-mcp-playwright-end_codegen_session"
description: "End a code generation session and generate the test file"
---

# MCP Call Instructions: mcp-playwright.end_codegen_session

Generated: 2026-04-04T18:26:49.768Z

Description: End a code generation session and generate the test file

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-playwright.end_codegen_session --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-playwright.end_codegen_session {"k":"v"}`
- pi tool: `mcp_mcp-playwright_end_codegen_session` with `argsJson`

## Arguments
- Required: sessionId
- Optional: none

## Example
- `mcporter call mcp-playwright.end_codegen_session --args '{"sessionId":"..."}'`