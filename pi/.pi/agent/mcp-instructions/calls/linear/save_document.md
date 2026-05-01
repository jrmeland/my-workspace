---
name: "calls-linear-save_document"
description: "Create or update a Linear document. If `id` is provided, updates the existing document; otherwise creates a new one. When creating, `title` is required and exactly one of `project` or `issue` must be specified. On update, passing `project` or `issue` reparents the document (at most one may be supplied)."
---

# MCP Call Instructions: linear.save_document

Generated: 2026-05-01T23:03:04.771Z

Description: Create or update a Linear document. If `id` is provided, updates the existing document; otherwise creates a new one. When creating, `title` is required and exactly one of `project` or `issue` must be specified. On update, passing `project` or `issue` reparents the document (at most one may be supplied).

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.save_document --args '{"k":"v"}'`
- pi command: `/mcp-call linear.save_document {"k":"v"}`
- pi tool: `mcp_linear_save_document` with `argsJson`

## Arguments
- Required: none
- Optional: id, title, content, project, issue, icon, color

## Example
- `mcporter call linear.save_document`