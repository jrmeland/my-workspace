---
name: "calls-memory-add_observations"
description: "Add new observations to existing entities in the knowledge graph"
---

# MCP Call Instructions: memory.add_observations

Generated: 2026-04-04T18:26:36.644Z

Description: Add new observations to existing entities in the knowledge graph

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call memory.add_observations --args '{"k":"v"}'`
- pi command: `/mcp-call memory.add_observations {"k":"v"}`
- pi tool: `mcp_memory_add_observations` with `argsJson`

## Arguments
- Required: observations
- Optional: none

## Example
- `mcporter call memory.add_observations --args '{"observations":"..."}'`