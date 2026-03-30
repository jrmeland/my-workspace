---
name: "calls-parallel-search-web_search_preview"
description: "Purpose: Perform web searches and return results in an LLM-friendly format and with parameters tuned for LLMs."
---

# MCP Call Instructions: parallel-search.web_search_preview

Generated: 2026-03-06T16:56:11.014Z

Description: Purpose: Perform web searches and return results in an LLM-friendly format and with parameters tuned for LLMs.


## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call parallel-search.web_search_preview --args '{"k":"v"}'`
- pi command: `/mcp-call parallel-search.web_search_preview {"k":"v"}`
- pi tool: `mcp_parallel-search_web_search_preview` with `argsJson`

## Arguments
- Required: objective, search_queries
- Optional: none

## Example
- `mcporter call parallel-search.web_search_preview --args '{"objective":"...","search_queries":"..."}'`