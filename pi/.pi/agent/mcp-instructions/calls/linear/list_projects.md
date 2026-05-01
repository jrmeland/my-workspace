---
name: "calls-linear-list_projects"
description: "List projects in the user's Linear workspace"
---

# MCP Call Instructions: linear.list_projects

Generated: 2026-05-01T23:03:04.772Z

Description: List projects in the user's Linear workspace

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.list_projects --args '{"k":"v"}'`
- pi command: `/mcp-call linear.list_projects {"k":"v"}`
- pi tool: `mcp_linear_list_projects` with `argsJson`

## Arguments
- Required: none
- Optional: limit, cursor, orderBy, query, state, initiative, team, member, label, createdAt, updatedAt, includeMilestones, includeMembers, includeArchived

## Example
- `mcporter call linear.list_projects`