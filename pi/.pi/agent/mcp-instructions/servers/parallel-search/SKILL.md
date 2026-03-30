---
name: "parallel-search"
description: "MCP server usage instructions for parallel-search, including auth and tool call patterns."
---

# MCP Server Instructions: parallel-search

Generated: 2026-03-06T16:56:11.012Z
Description: Usage instructions for MCP server parallel-search, including auth, tool discovery, and call patterns.
Server status at generation: ok

## Auth
- Refresh auth when needed: `mcporter auth parallel-search`

## How to call tools
- Raw CLI: `mcporter call parallel-search.<tool> --args '{"key":"value"}'`
- pi command: `/mcp-call parallel-search.<tool> {"key":"value"}`
- pi dynamic tool: `mcp_parallel-search_<tool>` with `argsJson`

## Available tools

- web_search_preview — Purpose: Perform web searches and return results in an LLM-friendly format and with parameters tuned for LLMs.
- web_fetch — Purpose: Fetch and extract relevant content from

## Per-call instructions
- See files in: `mcp-instructions/calls/parallel-search/`