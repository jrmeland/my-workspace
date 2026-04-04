---
name: "sequential-thinking"
description: "MCP server usage instructions for sequential-thinking, including auth and tool call patterns."
---

# MCP Server Instructions: sequential-thinking

Generated: 2026-04-04T18:26:38.472Z
Description: Usage instructions for MCP server sequential-thinking, including auth, tool discovery, and call patterns.
Server status at generation: ok

## Auth
- Refresh auth when needed: `mcporter auth sequential-thinking`

## How to call tools
- Raw CLI: `mcporter call sequential-thinking.<tool> --args '{"key":"value"}'`
- pi command: `/mcp-call sequential-thinking.<tool> {"key":"value"}`
- pi dynamic tool: `mcp_sequential-thinking_<tool>` with `argsJson`

## Available tools

- sequentialthinking — A detailed tool for dynamic and reflective problem-solving through thoughts.

## Per-call instructions
- See files in: `mcp-instructions/calls/sequential-thinking/`