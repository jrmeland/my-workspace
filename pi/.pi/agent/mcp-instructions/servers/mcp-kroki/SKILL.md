---
name: "mcp-kroki"
description: "MCP server usage instructions for mcp-kroki, including auth and tool call patterns."
---

# MCP Server Instructions: mcp-kroki

Generated: 2026-04-04T18:26:45.722Z
Description: Usage instructions for MCP server mcp-kroki, including auth, tool discovery, and call patterns.
Server status at generation: ok

## Auth
- Refresh auth when needed: `mcporter auth mcp-kroki`

## How to call tools
- Raw CLI: `mcporter call mcp-kroki.<tool> --args '{"key":"value"}'`
- pi command: `/mcp-call mcp-kroki.<tool> {"key":"value"}`
- pi dynamic tool: `mcp_mcp-kroki_<tool>` with `argsJson`

## Available tools

- generate_diagram_url — Generate a URL for a diagram using Kroki.io. This tool takes Mermaid diagram code or other supported diagram formats and returns a URL to the rendered diagram. The URL can be used to display the diagram in web browsers or embedded in documents.
- download_diagram — Download a diagram image to a local file. This tool converts diagram code (such as Mermaid) into an image file and saves it to the specified location. Useful for generating diagrams for presentations, documentation, or other offline use. Includes an option to scale SVG output.

## Per-call instructions
- See files in: `mcp-instructions/calls/mcp-kroki/`