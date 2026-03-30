---
name: "gcloud"
description: "MCP server usage instructions for gcloud, including auth and tool call patterns."
---

# MCP Server Instructions: gcloud

Generated: 2026-03-06T16:56:12.993Z
Description: Usage instructions for MCP server gcloud, including auth, tool discovery, and call patterns.
Server status at generation: ok

## Auth
- Refresh auth when needed: `mcporter auth gcloud`

## How to call tools
- Raw CLI: `mcporter call gcloud.<tool> --args '{"key":"value"}'`
- pi command: `/mcp-call gcloud.<tool> {"key":"value"}`
- pi dynamic tool: `mcp_gcloud_<tool>` with `argsJson`

## Common gotchas (read before first call)
- `run_gcloud_command` expects `args` as an **array**, not a command string.
- Do not include the `gcloud` binary in `args`; start directly with subcommands.
- Some commands require location scope (`--region` or `--location`). Redis commands commonly do.
- If auth errors appear in non-interactive runs, refresh auth (`mcporter auth gcloud`) before retrying.

## Available tools

- run_gcloud_command — Executes a gcloud command.

## Per-call instructions
- See files in: `mcp-instructions/calls/gcloud/`