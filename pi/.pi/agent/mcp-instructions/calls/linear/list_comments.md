---
name: "calls-linear-list_comments"
description: "List comments for a specific Linear issue"
---

# MCP Call Instructions: linear.list_comments

Generated: 2026-05-01T23:03:04.770Z

Description: List comments for a specific Linear issue

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.list_comments --args '{"k":"v"}'`
- pi command: `/mcp-call linear.list_comments {"k":"v"}`
- pi tool: `mcp_linear_list_comments` with `argsJson`

## Arguments
- Required: issueId
- Optional: limit, cursor, orderBy

## Example
- `mcporter call linear.list_comments --args '{"issueId":"..."}'`