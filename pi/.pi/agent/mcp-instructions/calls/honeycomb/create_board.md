---
name: "calls-honeycomb-create_board"
description: "Create Honeycomb boards with query, slo, and text panels."
---

# MCP Call Instructions: honeycomb.create_board

Generated: 2026-03-13T12:35:00-05:00

## Preferred usage
- Use `--args '{...}'` (recommended for nested `panels` JSON).
- Direct CLI: `mcporter call honeycomb.create_board --args '{...}'`
- pi command: `/mcp-call honeycomb.create_board {...}`
- pi tool: `mcp_honeycomb_create_board` with `argsJson`

## Arguments
- Required: `environment_slug`, `name`, `panels`
- Optional: `description`, `private`, `tags`, `preset_filters`

## Panel schema quick reference
- `type` is required for every panel.
- Query panel:
  - `{"type":"query","id":"<query_run_pk>", ...}`
  - `id` should be a `query_run_pk` from `run_query`
- SLO panel:
  - `{"type":"slo","id":"<slo_pk>", ...}`
- Text panel:
  - `{"type":"text","content":"# Markdown ..."}`

## Common errors
- `at least one panel is required` -> provide non-empty `panels` array.
- `panel[n] (query): id is required` -> add `id` for query panel.
- Failures from shell quoting -> switch to `--args '{...}'` payload.

## Two-step board creation example
```bash
# 1) Run query
mcporter call honeycomb.run_query --args '{
  "environment_slug":"prod",
  "dataset_slug":"ai-chat",
  "query_spec":{"calculations":[{"op":"COUNT"}],"time_range":"1h"}
}'

# 2) Use returned query_run_pk as query panel id
mcporter call honeycomb.create_board --args '{
  "environment_slug":"prod",
  "name":"AI Chat - MCP Board",
  "description":"Created via MCP",
  "panels":[
    {"type":"text","content":"# AI Chat Overview"},
    {"type":"query","id":"<query_run_pk>","name":"Request Volume","display_style":"chart"}
  ],
  "tags":["team:ai"]
}'
```
