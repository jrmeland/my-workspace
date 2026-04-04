---
name: "calls-opentofu-get-resource-docs"
description: "Get detailed documentation for a specific OpenTofu resource by provider namespace, provider name, and resource name."
---

# MCP Call Instructions: opentofu.get-resource-docs

Generated: 2026-04-04T18:26:43.878Z

Description: Get detailed documentation for a specific OpenTofu resource by provider namespace, provider name, and resource name.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call opentofu.get-resource-docs --args '{"k":"v"}'`
- pi command: `/mcp-call opentofu.get-resource-docs {"k":"v"}`
- pi tool: `mcp_opentofu_get-resource-docs` with `argsJson`

## Arguments
- Required: namespace, name, resource
- Optional: version

## Example
- `mcporter call opentofu.get-resource-docs --args '{"namespace":"...","name":"...","resource":"..."}'`