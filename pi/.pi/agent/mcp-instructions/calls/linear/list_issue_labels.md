---
name: "calls-linear-list_issue_labels"
description: "List available issue labels in a Linear workspace or team"
---

# MCP Call Instructions: linear.list_issue_labels

Generated: 2026-05-01T23:03:04.772Z

Description: List available issue labels in a Linear workspace or team

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.list_issue_labels --args '{"k":"v"}'`
- pi command: `/mcp-call linear.list_issue_labels {"k":"v"}`
- pi tool: `mcp_linear_list_issue_labels` with `argsJson`

## Arguments
- Required: none
- Optional: limit, cursor, orderBy, name, team

## Example
- `mcporter call linear.list_issue_labels`