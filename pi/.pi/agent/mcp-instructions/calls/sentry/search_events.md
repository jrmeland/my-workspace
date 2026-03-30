---
name: "calls-sentry-search_events"
description: "Search for events AND perform counts/aggregations - the ONLY tool for statistics and counts."
---

# MCP Call Instructions: sentry.search_events

Generated: 2026-03-25T15:01:28.009Z

Description: Search for events AND perform counts/aggregations - the ONLY tool for statistics and counts.

Supports TWO query types:
1. AGGREGATIONS (counts, sums, averages): 'how many errors', 'count of issues', 'total tokens'
2. Individual events with timestamps: 'show me error logs from last hour'

USE THIS FOR ALL COUNTS/STATISTICS:
- 'how many errors today' → returns count
- 'count of database failures' → returns count
- 'total number of issues' → returns count
- 'average response time' → returns avg()
- 'sum of tokens used' → returns sum()

ALSO USE FOR INDIVIDUAL EVENTS:
- 'error logs from last hour' → returns event list
- 'database errors with timestamps' → returns event list
- 'trace spans for slow API calls' → returns span list

Dataset Selection (AI automatically chooses):
- errors: Exception/crash events
- logs: Log entries
- spans: Performance data, AI/LLM calls, token usage

DO NOT USE for grouped issue lists → use search_issues

<examples>
search_events(organizationSlug='my-org', naturalLanguageQuery='how many errors today')
search_events(organizationSlug='my-org', naturalLanguageQuery='count of database failures this week')
search_events(organizationSlug='my-org', naturalLanguageQuery='total tokens used by model')
search_events(organizationSlug='my-org', naturalLanguageQuery='error logs from the last hour')
</examples>

<hints>
- If the user passes a parameter in the form of name/otherName, it's likely in the format of <organizationSlug>/<projectSlug>.
- Parse org/project notation directly without calling find_organizations or find_projects.
</hints>

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.search_events --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.search_events {"k":"v"}`
- pi tool: `mcp_sentry_search_events` with `argsJson`

## Arguments
- Required: organizationSlug, naturalLanguageQuery
- Optional: projectSlug, regionUrl, limit, includeExplanation

## Example
- `mcporter call sentry.search_events --args '{"organizationSlug":"...","naturalLanguageQuery":"..."}'`