---
name: "calls-memory-create_entities"
description: "Create multiple new entities in the knowledge graph"
---

# MCP Call Instructions: memory.create_entities

Generated: 2026-04-04T18:26:36.643Z

Description: Create multiple new entities in the knowledge graph

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call memory.create_entities --args '{"k":"v"}'`
- pi command: `/mcp-call memory.create_entities {"k":"v"}`
- pi tool: `mcp_memory_create_entities` with `argsJson`

## Arguments
- Required: entities
- Optional: none

## Example
- `mcporter call memory.create_entities --args '{"entities":"..."}'`