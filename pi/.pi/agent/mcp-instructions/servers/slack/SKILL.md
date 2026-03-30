---
name: "slack"
description: MCP server usage instructions for slack, including auth and tool call patterns.
---

# MCP Server Instructions: slack

Generated: 2026-03-03T17:27:09.846Z
Description: Usage instructions for MCP server slack, including auth, tool discovery, and call patterns.
Server status at generation: error

## Auth
- Refresh auth when needed: `mcporter auth slack`

## How to call tools
- Raw CLI: `mcporter call slack.<tool> --args '{"key":"value"}'`
- pi command: `/mcp-call slack.<tool> {"key":"value"}`
- pi dynamic tool: `mcp_slack_<tool>` with `argsJson`

## Available tools

No tools discovered.

## Per-call instructions
- See files in: `mcp-instructions/calls/slack/`