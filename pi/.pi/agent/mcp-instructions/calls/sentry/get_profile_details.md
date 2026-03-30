---
name: "calls-sentry-get_profile_details"
description: "Retrieve raw profile chunk data to inspect individual function calls, threads, and stack traces."
---

# MCP Call Instructions: sentry.get_profile_details

Generated: 2026-03-27T16:10:47.606Z

Description: Retrieve raw profile chunk data to inspect individual function calls, threads, and stack traces.

USE THIS TOOL WHEN:
- User wants to inspect raw profiling samples for a specific profiler session
- User needs to see individual thread activity and stack traces
- User wants detailed frame-level data (function names, file locations, call counts)

RETURNS:
- Profile chunk metadata (platform, release, environment)
- Per-thread sample counts and names
- Top frames by occurrence with file locations
- User code vs library code breakdown

NOTE: This tool requires a `profilerId` which identifies a specific profiling session.
Use `get_profile` for aggregated flamegraph analysis by transaction name.

<examples>
### Inspect a profiler session
```
get_profile_details(
  organizationSlug='my-org',
  projectSlugOrId='backend',
  profilerId='041bde57b9844e36b8b7e5734efae5f7',
  start='2024-01-01T00:00:00',
  end='2024-01-01T01:00:00'
)
```
</examples>

<hints>
- Use `focusOnUserCode: true` (default) to filter out library/system frames
- The profilerId can be found in Sentry profile URLs or event data
</hints>

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.get_profile_details --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.get_profile_details {"k":"v"}`
- pi tool: `mcp_sentry_get_profile_details` with `argsJson`

## Arguments
- Required: organizationSlug, projectSlugOrId, profilerId, start, end
- Optional: regionUrl, focusOnUserCode

## Example
- `mcporter call sentry.get_profile_details --args '{"organizationSlug":"...","projectSlugOrId":"...","profilerId":"...","start":"...","end":"..."}'`