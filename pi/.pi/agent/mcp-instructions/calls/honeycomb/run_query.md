---
name: "calls-honeycomb-run_query"
description: "Execute a Honeycomb query and return results metadata including query_run_pk for downstream actions like board creation."
---

# MCP Call Instructions: honeycomb.run_query

Generated: 2026-03-13T12:35:00-05:00

## Preferred usage
- Direct CLI: `mcporter call honeycomb.run_query --args '{...}'`
- pi command: `/mcp-call honeycomb.run_query {...}`
- pi tool: `mcp_honeycomb_run_query` with `argsJson`

## Arguments
- Required: `environment_slug`, `query_spec`
- Optional (common): `dataset_slug`, `environment_wide_query`, `include_samples`, `results_limit`, `usage_mode`

## Important output
- Capture `query_run_pk` from metadata; this is used by `create_board` query panels (`id=<query_run_pk>`).

## Example
```bash
mcporter call honeycomb.run_query --args '{
  "environment_slug":"prod",
  "dataset_slug":"ai-chat",
  "query_spec":{"calculations":[{"op":"COUNT"}],"time_range":"1h"},
  "results_limit":1
}'
```
