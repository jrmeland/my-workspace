---
name: "honeycomb"
description: "MCP server usage instructions for honeycomb, including auth, query execution, and board creation patterns."
---

# MCP Server Instructions: honeycomb

Generated: 2026-03-13T12:35:00-05:00
Description: Usage instructions for MCP server honeycomb, including auth, tool discovery, query workflows, and board creation patterns.

## Auth
- Refresh auth when needed: `mcporter auth honeycomb`
- If calls start failing unexpectedly, run auth refresh first.

## How to call tools
- Raw CLI: `mcporter call honeycomb.<tool> --args '{"key":"value"}'`
- pi command: `/mcp-call honeycomb.<tool> {"key":"value"}`
- pi dynamic tool: `mcp_honeycomb_<tool>` with `argsJson`

## Common gotchas (read before first call)
- Prefer `--args '{...}'` for complex payloads (especially `create_board`) to avoid shell escaping issues.
- `run_query` returns a `query_run_pk` in metadata; keep it if you plan to create a board panel.
- For `create_board` query panels, use panel `id` = `query_run_pk` from `run_query`.
- `create_board` requires at least one panel.
- Panel requirements:
  - `type: "query"` -> requires `id` (query run PK)
  - `type: "slo"` -> requires `id` (SLO PK)
  - `type: "text"` -> requires `content`

## Board creation pattern (recommended)
1. Run query with `honeycomb.run_query`
2. Capture `query_run_pk`
3. Create board with `honeycomb.create_board`, adding query panel(s) with `id=<query_run_pk>`
4. Verify via `honeycomb.list_boards`

## UI vs MCP note
- In UI, adding a query to a board goes through **Save query -> Board**.
- In MCP, you can create query panels directly from `run_query` output by using `query_run_pk` as panel `id`.

## Available tools (high-use)
- `get_workspace_context` — discover team/environments
- `get_environment` — list datasets per environment
- `run_query` — execute queries and return `query_run_pk`
- `get_query_results` — fetch results from prior query run/query id/url
- `find_columns` / `find_queries` — schema and prior-query discovery
- `create_board` — create board with query/slo/text panels
- `list_boards` — list boards or inspect board details
- `get_trace` / `get_service_map` / `get_slos` / `get_triggers` — observability workflows

## Per-call instructions
- See files in: `mcp-instructions/calls/honeycomb/`
