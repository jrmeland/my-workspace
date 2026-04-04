---
name: "calls-mcp-kroki-generate_diagram_url"
description: "Generate a URL for a diagram using Kroki.io. This tool takes Mermaid diagram code or other supported diagram formats and returns a URL to the rendered diagram. The URL can be used to display the diagram in web browsers or embedded in documents."
---

# MCP Call Instructions: mcp-kroki.generate_diagram_url

Generated: 2026-04-04T18:26:45.722Z

Description: Generate a URL for a diagram using Kroki.io. This tool takes Mermaid diagram code or other supported diagram formats and returns a URL to the rendered diagram. The URL can be used to display the diagram in web browsers or embedded in documents.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call mcp-kroki.generate_diagram_url --args '{"k":"v"}'`
- pi command: `/mcp-call mcp-kroki.generate_diagram_url {"k":"v"}`
- pi tool: `mcp_mcp-kroki_generate_diagram_url` with `argsJson`

## Arguments
- Required: type, content
- Optional: outputFormat

## Example
- `mcporter call mcp-kroki.generate_diagram_url --args '{"type":"...","content":"..."}'`