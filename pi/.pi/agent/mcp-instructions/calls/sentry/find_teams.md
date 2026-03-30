---
name: "calls-sentry-find_teams"
description: "Find teams in an organization in Sentry."
---

# MCP Call Instructions: sentry.find_teams

Generated: 2026-03-25T15:01:28.008Z

Description: Find teams in an organization in Sentry.

Use this tool when you need to:
- View teams in a Sentry organization
- Find a team's slug and numeric ID to aid other tool requests
- Search for specific teams by name or slug

Returns up to 25 results. If you hit this limit, use the query parameter to narrow down results.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.find_teams --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.find_teams {"k":"v"}`
- pi tool: `mcp_sentry_find_teams` with `argsJson`

## Arguments
- Required: organizationSlug
- Optional: regionUrl, query

## Example
- `mcporter call sentry.find_teams --args '{"organizationSlug":"..."}'`