---
name: "calls-sentry-find_organizations"
description: "Find organizations that the user has access to in Sentry."
---

# MCP Call Instructions: sentry.find_organizations

Generated: 2026-03-25T15:01:28.008Z

Description: Find organizations that the user has access to in Sentry.

Use this tool when you need to:
- View organizations in Sentry
- Find an organization's slug to aid other tool requests
- Search for specific organizations by name or slug

Returns up to 25 results. If you hit this limit, use the query parameter to narrow down results.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.find_organizations --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.find_organizations {"k":"v"}`
- pi tool: `mcp_sentry_find_organizations` with `argsJson`

## Arguments
- Required: none
- Optional: query

## Example
- `mcporter call sentry.find_organizations`