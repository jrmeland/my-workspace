---
name: "calls-linear-list_project_labels"
description: "List available project labels in the Linear workspace"
---

# MCP Call Instructions: linear.list_project_labels

Generated: 2026-05-01T23:03:04.772Z

Description: List available project labels in the Linear workspace

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.list_project_labels --args '{"k":"v"}'`
- pi command: `/mcp-call linear.list_project_labels {"k":"v"}`
- pi tool: `mcp_linear_list_project_labels` with `argsJson`

## Arguments
- Required: none
- Optional: limit, cursor, orderBy, name

## Example
- `mcporter call linear.list_project_labels`