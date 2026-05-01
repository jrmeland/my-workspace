---
name: "calls-linear-list_users"
description: "Retrieve users in the Linear workspace"
---

# MCP Call Instructions: linear.list_users

Generated: 2026-05-01T23:03:04.773Z

Description: Retrieve users in the Linear workspace

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.list_users --args '{"k":"v"}'`
- pi command: `/mcp-call linear.list_users {"k":"v"}`
- pi tool: `mcp_linear_list_users` with `argsJson`

## Arguments
- Required: none
- Optional: limit, cursor, orderBy, query, team

## Example
- `mcporter call linear.list_users`