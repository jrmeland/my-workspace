---
name: "calls-linear-save_project"
description: "Create or update a Linear project. If `id` is provided, updates the existing project; otherwise creates a new one. When creating, `name` and at least one team (via `addTeams` or `setTeams`) are required."
---

# MCP Call Instructions: linear.save_project

Generated: 2026-05-01T23:03:04.772Z

Description: Create or update a Linear project. If `id` is provided, updates the existing project; otherwise creates a new one. When creating, `name` and at least one team (via `addTeams` or `setTeams`) are required.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.save_project --args '{"k":"v"}'`
- pi command: `/mcp-call linear.save_project {"k":"v"}`
- pi tool: `mcp_linear_save_project` with `argsJson`

## Arguments
- Required: none
- Optional: id, name, icon, color, summary, description, state, startDate, startDateResolution, targetDate, targetDateResolution, priority, addTeams, removeTeams, setTeams, labels, lead, addInitiatives, removeInitiatives, setInitiatives

## Example
- `mcporter call linear.save_project`