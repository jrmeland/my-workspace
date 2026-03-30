---
name: "calls-sentry-find_releases"
description: "Find releases in Sentry."
---

# MCP Call Instructions: sentry.find_releases

Generated: 2026-03-25T15:01:28.008Z

Description: Find releases in Sentry.

Use this tool when you need to:
- Find recent releases in a Sentry organization
- Find the most recent version released of a specific project
- Determine when a release was deployed to an environment

<examples>
### Find the most recent releases in the 'my-organization' organization

```
find_releases(organizationSlug='my-organization')
```

### Find releases matching '2ce6a27' in the 'my-organization' organization

```
find_releases(organizationSlug='my-organization', query='2ce6a27')
```
</examples>

<hints>
- If the user passes a parameter in the form of name/otherName, its likely in the format of <organizationSlug>/<projectSlug>.
</hints>

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.find_releases --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.find_releases {"k":"v"}`
- pi tool: `mcp_sentry_find_releases` with `argsJson`

## Arguments
- Required: organizationSlug
- Optional: regionUrl, projectSlug, query

## Example
- `mcporter call sentry.find_releases --args '{"organizationSlug":"..."}'`