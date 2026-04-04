---
name: "calls-ref-ref_search_documentation"
description: "Search for documentation on the web or github as well from private resources like repos and pdfs. Use Ref 'ref_read_url' to read the content of a url."
---

# MCP Call Instructions: Ref.ref_search_documentation

Generated: 2026-04-04T18:26:34.600Z

Description: Search for documentation on the web or github as well from private resources like repos and pdfs. Use Ref 'ref_read_url' to read the content of a url.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call Ref.ref_search_documentation --args '{"k":"v"}'`
- pi command: `/mcp-call Ref.ref_search_documentation {"k":"v"}`
- pi tool: `mcp_ref_ref_search_documentation` with `argsJson`

## Arguments
- Required: query
- Optional: none

## Example
- `mcporter call Ref.ref_search_documentation --args '{"query":"..."}'`