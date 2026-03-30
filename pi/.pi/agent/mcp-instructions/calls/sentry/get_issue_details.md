---
name: "calls-sentry-get_issue_details"
description: "Get detailed information about a specific Sentry issue by ID."
---

# MCP Call Instructions: sentry.get_issue_details

Generated: 2026-03-25T15:01:28.008Z

Description: Get detailed information about a specific Sentry issue by ID.

USE THIS TOOL WHEN USERS:
- Provide a specific issue ID (e.g., 'CLOUDFLARE-MCP-41', 'PROJECT-123')
- Ask to 'explain [ISSUE-ID]', 'tell me about [ISSUE-ID]'
- Want details/stacktrace/analysis for a known issue
- Provide a Sentry issue URL

DO NOT USE for:
- General searching or listing issues (use search_issues)

TRIGGER PATTERNS:
- 'Explain ISSUE-123' → use get_issue_details
- 'Tell me about PROJECT-456' → use get_issue_details
- 'What happened in [issue URL]' → use get_issue_details

<examples>
### With Sentry URL (recommended - simplest approach)
```
get_issue_details(issueUrl='https://sentry.sentry.io/issues/6916805731/?project=4509062593708032&query=is%3Aunresolved')
```

### With issue ID and organization
```
get_issue_details(organizationSlug='my-organization', issueId='CLOUDFLARE-MCP-41')
```

### With event ID and organization
```
get_issue_details(organizationSlug='my-organization', eventId='c49541c747cb4d8aa3efb70ca5aba243')
```
</examples>

<hints>
- **IMPORTANT**: If user provides a Sentry URL, pass the ENTIRE URL to issueUrl parameter unchanged
- When using issueUrl, all other parameters are automatically extracted - don't provide them separately
- If using issueId (not URL), then organizationSlug is required
</hints>

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.get_issue_details --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.get_issue_details {"k":"v"}`
- pi tool: `mcp_sentry_get_issue_details` with `argsJson`

## Arguments
- Required: none
- Optional: organizationSlug, regionUrl, issueId, eventId, issueUrl

## Example
- `mcporter call sentry.get_issue_details`