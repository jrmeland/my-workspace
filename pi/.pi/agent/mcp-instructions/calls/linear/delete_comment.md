---
name: "calls-linear-delete_comment"
description: "Delete a comment from a Linear issue"
---

# MCP Call Instructions: linear.delete_comment

Generated: 2026-05-01T23:03:04.770Z

Description: Delete a comment from a Linear issue

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.delete_comment --args '{"k":"v"}'`
- pi command: `/mcp-call linear.delete_comment {"k":"v"}`
- pi tool: `mcp_linear_delete_comment` with `argsJson`

## Arguments
- Required: id
- Optional: none

## Example
- `mcporter call linear.delete_comment --args '{"id":"..."}'`