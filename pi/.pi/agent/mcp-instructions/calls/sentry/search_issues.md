---
name: "calls-sentry-search_issues"
description: "Search for grouped issues/problems in Sentry - returns a LIST of issues, NOT counts or aggregations."
---

# MCP Call Instructions: sentry.search_issues

Generated: 2026-03-25T15:01:28.009Z

Description: Search for grouped issues/problems in Sentry - returns a LIST of issues, NOT counts or aggregations.

Uses AI to translate natural language queries into Sentry issue search syntax.
Returns grouped issues with metadata like title, status, and user count.

USE THIS TOOL WHEN USERS WANT:
- A LIST of issues: 'show me issues', 'what problems do we have'
- Filtered issue lists: 'unresolved issues', 'critical bugs'
- Issues by impact: 'errors affecting more than 100 users'
- Issues by assignment: 'issues assigned to me'
- User feedback: 'show me user feedback', 'feedback from last week'

DO NOT USE FOR COUNTS/AGGREGATIONS:
- 'how many errors' → use search_events
- 'count of issues' → use search_events
- 'total number of errors today' → use search_events
- 'sum/average/statistics' → use search_events

ALSO DO NOT USE FOR:
- Individual error events with timestamps → use search_events
- Details about a specific issue ID → use get_issue_details

REMEMBER: This tool returns a LIST of issues, not counts or statistics!

<examples>
search_issues(organizationSlug='my-org', naturalLanguageQuery='critical bugs from last week')
search_issues(organizationSlug='my-org', naturalLanguageQuery='unhandled errors affecting 100+ users')
search_issues(organizationSlug='my-org', naturalLanguageQuery='issues assigned to me')
search_issues(organizationSlug='my-org', naturalLanguageQuery='user feedback from production')
</examples>

<hints>
- If the user passes a parameter in the form of name/otherName, it's likely in the format of <organizationSlug>/<projectSlugOrId>.
- Parse org/project notation directly without calling find_organizations or find_projects.
- The projectSlugOrId parameter accepts both project slugs (e.g., 'my-project') and numeric IDs (e.g., '123456').
</hints>

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.search_issues --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.search_issues {"k":"v"}`
- pi tool: `mcp_sentry_search_issues` with `argsJson`

## Arguments
- Required: organizationSlug, naturalLanguageQuery
- Optional: projectSlugOrId, regionUrl, limit, includeExplanation

## Example
- `mcporter call sentry.search_issues --args '{"organizationSlug":"...","naturalLanguageQuery":"..."}'`