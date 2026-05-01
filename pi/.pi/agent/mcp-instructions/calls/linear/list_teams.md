---
name: "calls-linear-list_teams"
description: "List teams in the user's Linear workspace"
---

# MCP Call Instructions: linear.list_teams

Generated: 2026-05-01T23:03:04.772Z

Description: List teams in the user's Linear workspace

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.list_teams --args '{"k":"v"}'`
- pi command: `/mcp-call linear.list_teams {"k":"v"}`
- pi tool: `mcp_linear_list_teams` with `argsJson`

## Arguments
- Required: none
- Optional: limit, cursor, orderBy, query, includeArchived, createdAt, updatedAt

## Example
- `mcporter call linear.list_teams`