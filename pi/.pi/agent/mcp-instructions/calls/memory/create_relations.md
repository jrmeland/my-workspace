---
name: "calls-memory-create_relations"
description: "Create multiple new relations between entities in the knowledge graph. Relations should be in active voice"
---

# MCP Call Instructions: memory.create_relations

Generated: 2026-04-04T18:26:36.644Z

Description: Create multiple new relations between entities in the knowledge graph. Relations should be in active voice

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call memory.create_relations --args '{"k":"v"}'`
- pi command: `/mcp-call memory.create_relations {"k":"v"}`
- pi tool: `mcp_memory_create_relations` with `argsJson`

## Arguments
- Required: relations
- Optional: none

## Example
- `mcporter call memory.create_relations --args '{"relations":"..."}'`