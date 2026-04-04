---
name: "calls-mcp-kroki-download_diagram"
description: "Download a diagram image to a local file. This tool converts diagram code (such as Mermaid) into an image file and saves it to the specified location. Useful for generating diagrams for presentations, documentation, or other offline use. Includes an option to scale SVG output."
---

# MCP Call Instructions: mcp-kroki.download_diagram

Generated: 2026-04-04T18:26:45.723Z

Description: Download a diagram image to a local file. This tool converts diagram code (such as Mermaid) into an image file and saves it to the specified location. Useful for generating diagrams for presentations, documentation, or other offline use. Includes an option to scale SVG output.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-kroki.download_diagram --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-kroki.download_diagram {"k":"v"}`
- pi tool: `mcp_mcp-kroki_download_diagram` with `argsJson`

## Arguments
- Required: type, content, outputPath
- Optional: outputFormat, scale

## Example
- `mcporter call mcp-kroki.download_diagram --args '{"type":"...","content":"...","outputPath":"..."}'`