---
name: "sentry"
description: "MCP server usage instructions for sentry, including auth and tool call patterns."
---

# MCP Server Instructions: sentry

Generated: 2026-03-25T15:01:28.006Z
Description: Usage instructions for MCP server sentry, including auth, tool discovery, and call patterns.
Server status at generation: ok

## Auth
- Refresh auth when needed: `mcporter auth sentry`

## How to call tools
- Raw CLI: `mcporter call sentry.<tool> --args '{"key":"value"}'`
- pi command: `/mcp-call sentry.<tool> {"key":"value"}`
- pi dynamic tool: `mcp_sentry_<tool>` with `argsJson`

## Available tools

- whoami — Identify the authenticated user in Sentry.
- find_organizations — Find organizations that the user has access to in Sentry.
- find_teams — Find teams in an organization in Sentry.
- find_projects — Find projects in Sentry.
- find_releases — Find releases in Sentry.
- get_issue_details — Get detailed information about a specific Sentry issue by ID.
- get_issue_tag_values — Get tag value distribution for a specific Sentry issue.
- get_trace_details — Get detailed information about a specific Sentry trace by ID.
- get_event_attachment — Download attachments from a Sentry event.
- search_events — Search for events AND perform counts/aggregations - the ONLY tool for statistics and counts.
- analyze_issue_with_seer — Use Seer to analyze production errors and get detailed root cause analysis with specific code fixes.
- search_issues — Search for grouped issues/problems in Sentry - returns a LIST of issues, NOT counts or aggregations.
- search_issue_events — Search and filter events within a specific issue using natural language queries.

## Per-call instructions
- See files in: `mcp-instructions/calls/sentry/`