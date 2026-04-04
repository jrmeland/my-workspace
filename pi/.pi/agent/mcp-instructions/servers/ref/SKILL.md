---
name: "ref"
description: "MCP server usage instructions for Ref, including auth and tool call patterns."
---

# MCP Server Instructions: Ref

Generated: 2026-04-04T18:26:34.600Z
Description: Usage instructions for MCP server Ref, including auth, tool discovery, and call patterns.
Server status at generation: ok

## Auth
- Refresh auth when needed: `mcporter auth Ref`

## How to call tools
- Raw CLI: `mcporter call Ref.<tool> --args '{"key":"value"}'`
- pi command: `/mcp-call Ref.<tool> {"key":"value"}`
- pi dynamic tool: `mcp_ref_<tool>` with `argsJson`

## Available tools

- ref_search_documentation — Search for documentation on the web or github as well from private resources like repos and pdfs. Use Ref 'ref_read_url' to read the content of a url.
- ref_read_url — Read the content of a url as markdown. The EXACT url from a 'ref_search_documentation' result (including the #hash) should be passed to this tool.

## Per-call instructions
- See files in: `mcp-instructions/calls/ref/`