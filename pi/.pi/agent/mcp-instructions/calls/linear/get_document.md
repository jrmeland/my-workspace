---
name: "calls-linear-get_document"
description: "Retrieve a Linear document by ID or slug"
---

# MCP Call Instructions: linear.get_document

Generated: 2026-05-01T23:03:04.770Z

Description: Retrieve a Linear document by ID or slug

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.get_document --args '{"k":"v"}'`
- pi command: `/mcp-call linear.get_document {"k":"v"}`
- pi tool: `mcp_linear_get_document` with `argsJson`

## Arguments
- Required: id
- Optional: none

## Example
- `mcporter call linear.get_document --args '{"id":"..."}'`