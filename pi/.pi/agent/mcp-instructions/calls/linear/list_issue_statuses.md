---
name: "calls-linear-list_issue_statuses"
description: "List available issue statuses in a Linear team"
---

# MCP Call Instructions: linear.list_issue_statuses

Generated: 2026-05-01T23:03:04.772Z

Description: List available issue statuses in a Linear team

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.list_issue_statuses --args '{"k":"v"}'`
- pi command: `/mcp-call linear.list_issue_statuses {"k":"v"}`
- pi tool: `mcp_linear_list_issue_statuses` with `argsJson`

## Arguments
- Required: team
- Optional: none

## Example
- `mcporter call linear.list_issue_statuses --args '{"team":"..."}'`