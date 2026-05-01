---
name: "calls-linear-save_milestone"
description: "Create or update a milestone in a Linear project. If `id` is provided, updates the existing milestone; otherwise creates a new one. When creating, `name` is required."
---

# MCP Call Instructions: linear.save_milestone

Generated: 2026-05-01T23:03:04.772Z

Description: Create or update a milestone in a Linear project. If `id` is provided, updates the existing milestone; otherwise creates a new one. When creating, `name` is required.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.save_milestone --args '{"k":"v"}'`
- pi command: `/mcp-call linear.save_milestone {"k":"v"}`
- pi tool: `mcp_linear_save_milestone` with `argsJson`

## Arguments
- Required: project
- Optional: id, name, description, targetDate

## Example
- `mcporter call linear.save_milestone --args '{"project":"..."}'`