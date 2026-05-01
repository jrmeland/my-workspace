---
name: "calls-linear-list_issues"
description: "List issues in the user's Linear workspace. For my issues, use \"me\" as the assignee. Use \"null\" for no assignee."
---

# MCP Call Instructions: linear.list_issues

Generated: 2026-05-01T23:03:04.771Z

Description: List issues in the user's Linear workspace. For my issues, use "me" as the assignee. Use "null" for no assignee.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.list_issues --args '{"k":"v"}'`
- pi command: `/mcp-call linear.list_issues {"k":"v"}`
- pi tool: `mcp_linear_list_issues` with `argsJson`

## Arguments
- Required: none
- Optional: limit, cursor, orderBy, query, team, state, cycle, label, assignee, delegate, project, priority, parentId, createdAt, updatedAt, includeArchived

## Example
- `mcporter call linear.list_issues`