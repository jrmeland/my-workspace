---
name: "calls-linear-save_comment"
description: "Create or update a comment on a Linear issue. If `id` is provided, updates the existing comment; otherwise creates a new one. When creating, `issueId` and `body` are required."
---

# MCP Call Instructions: linear.save_comment

Generated: 2026-05-01T23:03:04.770Z

Description: Create or update a comment on a Linear issue. If `id` is provided, updates the existing comment; otherwise creates a new one. When creating, `issueId` and `body` are required.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.save_comment --args '{"k":"v"}'`
- pi command: `/mcp-call linear.save_comment {"k":"v"}`
- pi tool: `mcp_linear_save_comment` with `argsJson`

## Arguments
- Required: body
- Optional: id, issueId, parentId

## Example
- `mcporter call linear.save_comment --args '{"body":"..."}'`