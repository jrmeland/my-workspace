---
name: "calls-linear-get_project"
description: "Retrieve details of a specific project in Linear"
---

# MCP Call Instructions: linear.get_project

Generated: 2026-05-01T23:03:04.772Z

Description: Retrieve details of a specific project in Linear

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.get_project --args '{"k":"v"}'`
- pi command: `/mcp-call linear.get_project {"k":"v"}`
- pi tool: `mcp_linear_get_project` with `argsJson`

## Arguments
- Required: query
- Optional: includeMilestones, includeMembers, includeResources

## Example
- `mcporter call linear.get_project --args '{"query":"..."}'`