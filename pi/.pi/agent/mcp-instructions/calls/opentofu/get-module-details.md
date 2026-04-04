---
name: "calls-opentofu-get-module-details"
description: "Get detailed information about a specific OpenTofu module by namespace, name, and target. Use the simple module name, NOT the full repository name."
---

# MCP Call Instructions: opentofu.get-module-details

Generated: 2026-04-04T18:26:43.878Z

Description: Get detailed information about a specific OpenTofu module by namespace, name, and target. Use the simple module name, NOT the full repository name.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call opentofu.get-module-details --args '{"k":"v"}'`
- pi command: `/mcp-call opentofu.get-module-details {"k":"v"}`
- pi tool: `mcp_opentofu_get-module-details` with `argsJson`

## Arguments
- Required: namespace, name, target
- Optional: none

## Example
- `mcporter call opentofu.get-module-details --args '{"namespace":"...","name":"...","target":"..."}'`