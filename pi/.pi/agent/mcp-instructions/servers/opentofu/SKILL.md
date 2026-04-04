---
name: "opentofu"
description: "MCP server usage instructions for opentofu, including auth and tool call patterns."
---

# MCP Server Instructions: opentofu

Generated: 2026-04-04T18:26:43.877Z
Description: Usage instructions for MCP server opentofu, including auth, tool discovery, and call patterns.
Server status at generation: ok

## Auth
- Refresh auth when needed: `mcporter auth opentofu`

## How to call tools
- Raw CLI: `mcporter call opentofu.<tool> --args '{"key":"value"}'`
- pi command: `/mcp-call opentofu.<tool> {"key":"value"}`
- pi dynamic tool: `mcp_opentofu_<tool>` with `argsJson`

## Available tools

- search-opentofu-registry — Search the OpenTofu Registry to find providers, modules, resources, and data sources. Use simple terms without prefixes like 'terraform-provider-' or 'terraform-module-'.
- get-provider-details — Get detailed information about a specific OpenTofu provider by namespace and name. Do NOT include 'terraform-provider-' prefix in the name.
- get-module-details — Get detailed information about a specific OpenTofu module by namespace, name, and target. Use the simple module name, NOT the full repository name.
- get-resource-docs — Get detailed documentation for a specific OpenTofu resource by provider namespace, provider name, and resource name.
- get-datasource-docs — Get detailed documentation for a specific OpenTofu data source by provider namespace, provider name, and data source name.

## Per-call instructions
- See files in: `mcp-instructions/calls/opentofu/`