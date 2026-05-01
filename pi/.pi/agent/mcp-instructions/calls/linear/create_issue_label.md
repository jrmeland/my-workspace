---
name: "calls-linear-create_issue_label"
description: "Create a new Linear issue label"
---

# MCP Call Instructions: linear.create_issue_label

Generated: 2026-05-01T23:03:04.772Z

Description: Create a new Linear issue label

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.create_issue_label --args '{"k":"v"}'`
- pi command: `/mcp-call linear.create_issue_label {"k":"v"}`
- pi tool: `mcp_linear_create_issue_label` with `argsJson`

## Arguments
- Required: name
- Optional: description, color, teamId, parent, isGroup

## Example
- `mcporter call linear.create_issue_label --args '{"name":"..."}'`