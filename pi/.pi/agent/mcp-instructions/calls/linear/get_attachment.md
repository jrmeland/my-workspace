---
name: "calls-linear-get_attachment"
description: "Retrieve an attachment's content by ID."
---

# MCP Call Instructions: linear.get_attachment

Generated: 2026-05-01T23:03:04.769Z

Description: Retrieve an attachment's content by ID.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.get_attachment --args '{"k":"v"}'`
- pi command: `/mcp-call linear.get_attachment {"k":"v"}`
- pi tool: `mcp_linear_get_attachment` with `argsJson`

## Arguments
- Required: id
- Optional: none

## Example
- `mcporter call linear.get_attachment --args '{"id":"..."}'`