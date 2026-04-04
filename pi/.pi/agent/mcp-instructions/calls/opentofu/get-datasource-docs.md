---
name: "calls-opentofu-get-datasource-docs"
description: "Get detailed documentation for a specific OpenTofu data source by provider namespace, provider name, and data source name."
---

# MCP Call Instructions: opentofu.get-datasource-docs

Generated: 2026-04-04T18:26:43.878Z

Description: Get detailed documentation for a specific OpenTofu data source by provider namespace, provider name, and data source name.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call opentofu.get-datasource-docs --args '{"k":"v"}'`
- pi command: `/mcp-call opentofu.get-datasource-docs {"k":"v"}`
- pi tool: `mcp_opentofu_get-datasource-docs` with `argsJson`

## Arguments
- Required: namespace, name, dataSource
- Optional: version

## Example
- `mcporter call opentofu.get-datasource-docs --args '{"namespace":"...","name":"...","dataSource":"..."}'`