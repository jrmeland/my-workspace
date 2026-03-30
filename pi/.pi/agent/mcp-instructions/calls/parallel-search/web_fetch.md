---
name: "calls-parallel-search-web_fetch"
description: "Purpose: Fetch and extract relevant content from"
---

# MCP Call Instructions: parallel-search.web_fetch

Generated: 2026-03-06T16:56:11.014Z

Description: Purpose: Fetch and extract relevant content from
specific web URLs.

Ideal Use Cases:
- Extracting content from specific URLs you've already identified
- Exploring URLs returned by a web search in greater depth


## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call parallel-search.web_fetch --args '{"k":"v"}'`
- pi command: `/mcp-call parallel-search.web_fetch {"k":"v"}`
- pi tool: `mcp_parallel-search_web_fetch` with `argsJson`

## Arguments
- Required: urls
- Optional: objective

## Example
- `mcporter call parallel-search.web_fetch --args '{"urls":"..."}'`