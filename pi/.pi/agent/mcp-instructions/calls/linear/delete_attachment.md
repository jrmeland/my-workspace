---
name: "calls-linear-delete_attachment"
description: "Delete an attachment by ID"
---

# MCP Call Instructions: linear.delete_attachment

Generated: 2026-05-01T23:03:04.770Z

Description: Delete an attachment by ID

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.delete_attachment --args '{"k":"v"}'`
- pi command: `/mcp-call linear.delete_attachment {"k":"v"}`
- pi tool: `mcp_linear_delete_attachment` with `argsJson`

## Arguments
- Required: id
- Optional: none

## Example
- `mcporter call linear.delete_attachment --args '{"id":"..."}'`