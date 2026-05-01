---
name: "calls-linear-list_milestones"
description: "List all milestones in a Linear project"
---

# MCP Call Instructions: linear.list_milestones

Generated: 2026-05-01T23:03:04.772Z

Description: List all milestones in a Linear project

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.list_milestones --args '{"k":"v"}'`
- pi command: `/mcp-call linear.list_milestones {"k":"v"}`
- pi tool: `mcp_linear_list_milestones` with `argsJson`

## Arguments
- Required: project
- Optional: none

## Example
- `mcporter call linear.list_milestones --args '{"project":"..."}'`