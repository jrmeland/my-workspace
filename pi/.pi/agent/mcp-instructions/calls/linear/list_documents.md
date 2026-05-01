---
name: "calls-linear-list_documents"
description: "List documents in the user's Linear workspace"
---

# MCP Call Instructions: linear.list_documents

Generated: 2026-05-01T23:03:04.770Z

Description: List documents in the user's Linear workspace

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.list_documents --args '{"k":"v"}'`
- pi command: `/mcp-call linear.list_documents {"k":"v"}`
- pi tool: `mcp_linear_list_documents` with `argsJson`

## Arguments
- Required: none
- Optional: limit, cursor, orderBy, query, projectId, initiativeId, creatorId, createdAt, updatedAt, includeArchived

## Example
- `mcporter call linear.list_documents`