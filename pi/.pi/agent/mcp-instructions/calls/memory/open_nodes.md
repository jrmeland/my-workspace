---
name: "calls-memory-open_nodes"
description: "Open specific nodes in the knowledge graph by their names"
---

# MCP Call Instructions: memory.open_nodes

Generated: 2026-04-04T18:26:36.644Z

Description: Open specific nodes in the knowledge graph by their names

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call memory.open_nodes --args '{"k":"v"}'`
- pi command: `/mcp-call memory.open_nodes {"k":"v"}`
- pi tool: `mcp_memory_open_nodes` with `argsJson`

## Arguments
- Required: names
- Optional: none

## Example
- `mcporter call memory.open_nodes --args '{"names":"..."}'`