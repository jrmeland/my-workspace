---
name: "calls-sentry-whoami"
description: "Identify the authenticated user in Sentry."
---

# MCP Call Instructions: sentry.whoami

Generated: 2026-03-25T15:01:28.008Z

Description: Identify the authenticated user in Sentry.

Use this tool when you need to:
- Get the user's name and email address.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.whoami --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.whoami {"k":"v"}`
- pi tool: `mcp_sentry_whoami` with `argsJson`

## Arguments
- Required: none
- Optional: none

## Example
- `mcporter call sentry.whoami`