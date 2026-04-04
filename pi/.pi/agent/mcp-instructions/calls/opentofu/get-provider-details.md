---
name: "calls-opentofu-get-provider-details"
description: "Get detailed information about a specific OpenTofu provider by namespace and name. Do NOT include 'terraform-provider-' prefix in the name."
---

# MCP Call Instructions: opentofu.get-provider-details

Generated: 2026-04-04T18:26:43.878Z

Description: Get detailed information about a specific OpenTofu provider by namespace and name. Do NOT include 'terraform-provider-' prefix in the name.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call opentofu.get-provider-details --args '{"k":"v"}'`
- pi command: `/mcp-call opentofu.get-provider-details {"k":"v"}`
- pi tool: `mcp_opentofu_get-provider-details` with `argsJson`

## Arguments
- Required: namespace, name
- Optional: none

## Example
- `mcporter call opentofu.get-provider-details --args '{"namespace":"...","name":"..."}'`