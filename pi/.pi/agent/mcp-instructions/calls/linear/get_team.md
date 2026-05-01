---
name: "calls-linear-get_team"
description: "Retrieve details of a specific Linear team"
---

# MCP Call Instructions: linear.get_team

Generated: 2026-05-01T23:03:04.773Z

Description: Retrieve details of a specific Linear team

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.get_team --args '{"k":"v"}'`
- pi command: `/mcp-call linear.get_team {"k":"v"}`
- pi tool: `mcp_linear_get_team` with `argsJson`

## Arguments
- Required: query
- Optional: none

## Example
- `mcporter call linear.get_team --args '{"query":"..."}'`