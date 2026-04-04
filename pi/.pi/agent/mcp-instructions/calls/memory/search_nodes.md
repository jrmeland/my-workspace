---
name: "calls-memory-search_nodes"
description: "Search for nodes in the knowledge graph based on a query"
---

# MCP Call Instructions: memory.search_nodes

Generated: 2026-04-04T18:26:36.644Z

Description: Search for nodes in the knowledge graph based on a query

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call memory.search_nodes --args '{"k":"v"}'`
- pi command: `/mcp-call memory.search_nodes {"k":"v"}`
- pi tool: `mcp_memory_search_nodes` with `argsJson`

## Arguments
- Required: query
- Optional: none

## Example
- `mcporter call memory.search_nodes --args '{"query":"..."}'`