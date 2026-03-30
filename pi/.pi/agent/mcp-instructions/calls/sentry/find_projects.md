---
name: "calls-sentry-find_projects"
description: "Find projects in Sentry."
---

# MCP Call Instructions: sentry.find_projects

Generated: 2026-03-25T15:01:28.008Z

Description: Find projects in Sentry.

Use this tool when you need to:
- View projects in a Sentry organization
- Find a project's slug to aid other tool requests
- Search for specific projects by name or slug

Returns up to 25 results. If you hit this limit, use the query parameter to narrow down results.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.find_projects --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.find_projects {"k":"v"}`
- pi tool: `mcp_sentry_find_projects` with `argsJson`

## Arguments
- Required: organizationSlug
- Optional: regionUrl, query

## Example
- `mcporter call sentry.find_projects --args '{"organizationSlug":"..."}'`