---
name: "memory"
description: "MCP server usage instructions for memory, including auth and tool call patterns."
---

# MCP Server Instructions: memory

Generated: 2026-04-04T18:26:36.643Z
Description: Usage instructions for MCP server memory, including auth, tool discovery, and call patterns.
Server status at generation: ok

## Auth
- Refresh auth when needed: `mcporter auth memory`

## How to call tools
- Raw CLI: `mcporter call memory.<tool> --args '{"key":"value"}'`
- pi command: `/mcp-call memory.<tool> {"key":"value"}`
- pi dynamic tool: `mcp_memory_<tool>` with `argsJson`

## Available tools

- create_entities — Create multiple new entities in the knowledge graph
- create_relations — Create multiple new relations between entities in the knowledge graph. Relations should be in active voice
- add_observations — Add new observations to existing entities in the knowledge graph
- delete_entities — Delete multiple entities and their associated relations from the knowledge graph
- delete_observations — Delete specific observations from entities in the knowledge graph
- delete_relations — Delete multiple relations from the knowledge graph
- read_graph — Read the entire knowledge graph
- search_nodes — Search for nodes in the knowledge graph based on a query
- open_nodes — Open specific nodes in the knowledge graph by their names

## Per-call instructions
- See files in: `mcp-instructions/calls/memory/`