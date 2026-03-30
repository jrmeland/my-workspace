---
name: "calls-sentry-search_issue_events"
description: "Search and filter events within a specific issue using natural language queries."
---

# MCP Call Instructions: sentry.search_issue_events

Generated: 2026-03-25T15:01:28.009Z

Description: Search and filter events within a specific issue using natural language queries.

Use this to filter events by time, environment, release, user, trace ID, or other tags. The tool automatically constrains results to the specified issue.

For cross-issue searches use search_issues, for single event details use get_issue_details.

<examples>
search_issue_events(issueId='MCP-41', organizationSlug='my-org', naturalLanguageQuery='from last hour')
search_issue_events(issueUrl='https://sentry.io/.../issues/123/', naturalLanguageQuery='production with release v1.0')
</examples>

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.search_issue_events --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.search_issue_events {"k":"v"}`
- pi tool: `mcp_sentry_search_issue_events` with `argsJson`

## Arguments
- Required: naturalLanguageQuery
- Optional: organizationSlug, issueId, issueUrl, projectSlug, regionUrl, limit, includeExplanation

## Example
- `mcporter call sentry.search_issue_events --args '{"naturalLanguageQuery":"..."}'`