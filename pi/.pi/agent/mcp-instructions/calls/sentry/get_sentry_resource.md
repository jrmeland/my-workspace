---
name: "calls-sentry-get_sentry_resource"
description: "Fetch a Sentry resource by URL or by type and ID."
---

# MCP Call Instructions: sentry.get_sentry_resource

Generated: 2026-03-26T16:48:51.044Z

Description: Fetch a Sentry resource by URL or by type and ID.

<examples>
### From a Sentry URL
get_sentry_resource(url='https://sentry.io/issues/PROJECT-123/')

### Breadcrumbs from a Sentry URL
get_sentry_resource(url='https://sentry.io/issues/PROJECT-123/', resourceType='breadcrumbs')

### By type and ID
get_sentry_resource(resourceType='issue', organizationSlug='my-org', resourceId='PROJECT-123')
</examples>

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.get_sentry_resource --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.get_sentry_resource {"k":"v"}`
- pi tool: `mcp_sentry_get_sentry_resource` with `argsJson`

## Arguments
- Required: none
- Optional: url, resourceType, resourceId, organizationSlug

## Example
- `mcporter call sentry.get_sentry_resource`