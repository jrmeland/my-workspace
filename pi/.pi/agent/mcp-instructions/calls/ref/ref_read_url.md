---
name: "calls-ref-ref_read_url"
description: "Read the content of a url as markdown. The EXACT url from a 'ref_search_documentation' result (including the #hash) should be passed to this tool."
---

# MCP Call Instructions: Ref.ref_read_url

Generated: 2026-04-04T18:26:34.600Z

Description: Read the content of a url as markdown. The EXACT url from a 'ref_search_documentation' result (including the #hash) should be passed to this tool.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call Ref.ref_read_url --args '{"k":"v"}'`
- pi command: `/mcp-call Ref.ref_read_url {"k":"v"}`
- pi tool: `mcp_ref_ref_read_url` with `argsJson`

## Arguments
- Required: url
- Optional: none

## Example
- `mcporter call Ref.ref_read_url --args '{"url":"..."}'`