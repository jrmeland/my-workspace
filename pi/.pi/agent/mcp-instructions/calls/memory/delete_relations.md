---
name: "calls-memory-delete_relations"
description: "Delete multiple relations from the knowledge graph"
---

# MCP Call Instructions: memory.delete_relations

Generated: 2026-04-04T18:26:36.644Z

Description: Delete multiple relations from the knowledge graph

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call memory.delete_relations --args '{"k":"v"}'`
- pi command: `/mcp-call memory.delete_relations {"k":"v"}`
- pi tool: `mcp_memory_delete_relations` with `argsJson`

## Arguments
- Required: relations
- Optional: none

## Example
- `mcporter call memory.delete_relations --args '{"relations":"..."}'`