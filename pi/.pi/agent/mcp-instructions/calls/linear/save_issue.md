---
name: "calls-linear-save_issue"
description: "Create or update a Linear issue. If `id` is provided, updates the existing issue; otherwise creates a new one. When creating, `title` and `team` are required. Note: use `assignee` (not `assigneeId`) to set the assignee — it accepts a user ID, name, email, or \"me\"."
---

# MCP Call Instructions: linear.save_issue

Generated: 2026-05-01T23:03:04.771Z

Description: Create or update a Linear issue. If `id` is provided, updates the existing issue; otherwise creates a new one. When creating, `title` and `team` are required. Note: use `assignee` (not `assigneeId`) to set the assignee — it accepts a user ID, name, email, or "me".

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.save_issue --args '{"k":"v"}'`
- pi command: `/mcp-call linear.save_issue {"k":"v"}`
- pi tool: `mcp_linear_save_issue` with `argsJson`

## Arguments
- Required: none
- Optional: id, title, description, team, cycle, milestone, priority, project, state, assignee, delegate, labels, dueDate, parentId, estimate, links, blocks, blockedBy, relatedTo, duplicateOf, removeBlocks, removeBlockedBy, removeRelatedTo

## Example
- `mcporter call linear.save_issue`