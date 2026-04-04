---
name: "calls-memory-delete_entities"
description: "Delete multiple entities and their associated relations from the knowledge graph"
---

# MCP Call Instructions: memory.delete_entities

Generated: 2026-04-04T18:26:36.644Z

Description: Delete multiple entities and their associated relations from the knowledge graph

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call memory.delete_entities --args '{"k":"v"}'`
- pi command: `/mcp-call memory.delete_entities {"k":"v"}`
- pi tool: `mcp_memory_delete_entities` with `argsJson`

## Arguments
- Required: entityNames
- Optional: none

## Example
- `mcporter call memory.delete_entities --args '{"entityNames":"..."}'`