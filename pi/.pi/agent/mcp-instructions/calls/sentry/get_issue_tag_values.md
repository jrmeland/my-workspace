---
name: "calls-sentry-get_issue_tag_values"
description: "Get tag value distribution for a specific Sentry issue."
---

# MCP Call Instructions: sentry.get_issue_tag_values

Generated: 2026-03-25T15:01:28.008Z

Description: Get tag value distribution for a specific Sentry issue.

Use this tool when you need to:
- Understand how an issue is distributed across different tag values
- Get aggregate counts of unique tag values (e.g., 'how many unique URLs are affected')
- Analyze which browsers, environments, or URLs are most impacted by an issue
- View the tag distributions page data programmatically

Common tag keys:
- `url`: Request URLs affected by the issue
- `browser`: Browser types and versions
- `browser.name`: Browser names only
- `os`: Operating systems
- `environment`: Deployment environments (production, staging, etc.)
- `release`: Software releases
- `device`: Device types
- `user`: Affected users

<examples>
### Get URL distribution for an issue
```
get_issue_tag_values(organizationSlug='my-organization', issueId='PROJECT-123', tagKey='url')
```

### Get browser distribution using issue URL
```
get_issue_tag_values(issueUrl='https://sentry.io/issues/PROJECT-123/', tagKey='browser')
```

### Get environment distribution
```
get_issue_tag_values(organizationSlug='my-organization', issueId='PROJECT-123', tagKey='environment')
```
</examples>

<hints>
- If user provides a Sentry URL, pass the ENTIRE URL to issueUrl parameter unchanged
- Common tag keys: url, browser, browser.name, os, environment, release, device, user
- Tag keys are case-sensitive
</hints>

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.get_issue_tag_values --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.get_issue_tag_values {"k":"v"}`
- pi tool: `mcp_sentry_get_issue_tag_values` with `argsJson`

## Arguments
- Required: tagKey
- Optional: organizationSlug, regionUrl, issueId, issueUrl

## Example
- `mcporter call sentry.get_issue_tag_values --args '{"tagKey":"..."}'`