---
name: "calls-honeycomb-list_boards"
description: "List Honeycomb boards in an environment or inspect a specific board."
---

# MCP Call Instructions: honeycomb.list_boards

Generated: 2026-03-13T12:35:00-05:00

## Preferred usage
- Direct CLI: `mcporter call honeycomb.list_boards --args '{...}'`
- pi command: `/mcp-call honeycomb.list_boards {...}`
- pi tool: `mcp_honeycomb_list_boards` with `argsJson`

## Arguments
- Required: `environment_slug`
- Optional: `board_id`, `items_per_page`, `page`, `tags`

## Examples
```bash
# list boards
mcporter call honeycomb.list_boards --args '{"environment_slug":"prod","items_per_page":20}'

# inspect one board
mcporter call honeycomb.list_boards --args '{"environment_slug":"prod","board_id":"<board_id>"}'
```
