---
name: "calls-opentofu-search-opentofu-registry"
description: "Search the OpenTofu Registry to find providers, modules, resources, and data sources. Use simple terms without prefixes like 'terraform-provider-' or 'terraform-module-'."
---

# MCP Call Instructions: opentofu.search-opentofu-registry

Generated: 2026-04-04T18:26:43.878Z

Description: Search the OpenTofu Registry to find providers, modules, resources, and data sources. Use simple terms without prefixes like 'terraform-provider-' or 'terraform-module-'.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call opentofu.search-opentofu-registry --args '{"k":"v"}'`
- pi command: `/mcp-call opentofu.search-opentofu-registry {"k":"v"}`
- pi tool: `mcp_opentofu_search-opentofu-registry` with `argsJson`

## Arguments
- Required: query
- Optional: type

## Example
- `mcporter call opentofu.search-opentofu-registry --args '{"query":"..."}'`