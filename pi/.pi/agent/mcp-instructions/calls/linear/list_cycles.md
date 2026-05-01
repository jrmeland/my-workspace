---
name: "calls-linear-list_cycles"
description: "Retrieve cycles for a specific Linear team"
---

# MCP Call Instructions: linear.list_cycles

Generated: 2026-05-01T23:03:04.770Z

Description: Retrieve cycles for a specific Linear team

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.list_cycles --args '{"k":"v"}'`
- pi command: `/mcp-call linear.list_cycles {"k":"v"}`
- pi tool: `mcp_linear_list_cycles` with `argsJson`

## Arguments
- Required: teamId
- Optional: type

## Example
- `mcporter call linear.list_cycles --args '{"teamId":"..."}'`