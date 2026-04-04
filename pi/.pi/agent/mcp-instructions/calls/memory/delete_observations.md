---
name: "calls-memory-delete_observations"
description: "Delete specific observations from entities in the knowledge graph"
---

# MCP Call Instructions: memory.delete_observations

Generated: 2026-04-04T18:26:36.644Z

Description: Delete specific observations from entities in the knowledge graph

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call memory.delete_observations --args '{"k":"v"}'`
- pi command: `/mcp-call memory.delete_observations {"k":"v"}`
- pi tool: `mcp_memory_delete_observations` with `argsJson`

## Arguments
- Required: deletions
- Optional: none

## Example
- `mcporter call memory.delete_observations --args '{"deletions":"..."}'`