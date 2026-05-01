---
name: "calls-linear-get_user"
description: "Retrieve details of a specific Linear user"
---

# MCP Call Instructions: linear.get_user

Generated: 2026-05-01T23:03:04.773Z

Description: Retrieve details of a specific Linear user

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.get_user --args '{"k":"v"}'`
- pi command: `/mcp-call linear.get_user {"k":"v"}`
- pi tool: `mcp_linear_get_user` with `argsJson`

## Arguments
- Required: query
- Optional: none

## Example
- `mcporter call linear.get_user --args '{"query":"..."}'`