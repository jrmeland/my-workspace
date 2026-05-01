---
name: "calls-linear-get_issue"
description: "Retrieve detailed information about an issue by ID, including attachments and git branch name"
---

# MCP Call Instructions: linear.get_issue

Generated: 2026-05-01T23:03:04.771Z

Description: Retrieve detailed information about an issue by ID, including attachments and git branch name

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.get_issue --args '{"k":"v"}'`
- pi command: `/mcp-call linear.get_issue {"k":"v"}`
- pi tool: `mcp_linear_get_issue` with `argsJson`

## Arguments
- Required: id
- Optional: includeRelations, includeCustomerNeeds, includeReleases

## Example
- `mcporter call linear.get_issue --args '{"id":"..."}'`