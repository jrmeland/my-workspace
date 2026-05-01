---
name: "calls-linear-get_issue_status"
description: "Retrieve detailed information about an issue status in Linear by name or ID"
---

# MCP Call Instructions: linear.get_issue_status

Generated: 2026-05-01T23:03:04.772Z

Description: Retrieve detailed information about an issue status in Linear by name or ID

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.get_issue_status --args '{"k":"v"}'`
- pi command: `/mcp-call linear.get_issue_status {"k":"v"}`
- pi tool: `mcp_linear_get_issue_status` with `argsJson`

## Arguments
- Required: id, name, team
- Optional: none

## Example
- `mcporter call linear.get_issue_status --args '{"id":"...","name":"...","team":"..."}'`