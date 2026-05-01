---
name: "calls-linear-get_milestone"
description: "Retrieve details of a specific milestone by ID or name"
---

# MCP Call Instructions: linear.get_milestone

Generated: 2026-05-01T23:03:04.772Z

Description: Retrieve details of a specific milestone by ID or name

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.get_milestone --args '{"k":"v"}'`
- pi command: `/mcp-call linear.get_milestone {"k":"v"}`
- pi tool: `mcp_linear_get_milestone` with `argsJson`

## Arguments
- Required: project, query
- Optional: none

## Example
- `mcporter call linear.get_milestone --args '{"project":"...","query":"..."}'`