---
name: "calls-linear-create_attachment"
description: "Create a new attachment on a specific Linear issue by uploading base64-encoded content."
---

# MCP Call Instructions: linear.create_attachment

Generated: 2026-05-01T23:03:04.769Z

Description: Create a new attachment on a specific Linear issue by uploading base64-encoded content.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.create_attachment --args '{"k":"v"}'`
- pi command: `/mcp-call linear.create_attachment {"k":"v"}`
- pi tool: `mcp_linear_create_attachment` with `argsJson`

## Arguments
- Required: issue, base64Content, filename, contentType
- Optional: title, subtitle

## Example
- `mcporter call linear.create_attachment --args '{"issue":"...","base64Content":"...","filename":"...","contentType":"..."}'`