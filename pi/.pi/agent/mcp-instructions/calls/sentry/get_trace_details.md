---
name: "calls-sentry-get_trace_details"
description: "Get detailed information about a specific Sentry trace by ID."
---

# MCP Call Instructions: sentry.get_trace_details

Generated: 2026-03-25T15:01:28.008Z

Description: Get detailed information about a specific Sentry trace by ID.

USE THIS TOOL WHEN USERS:
- Provide a specific trace ID (e.g., 'a4d1aae7216b47ff8117cf4e09ce9d0a')
- Ask to 'show me trace [TRACE-ID]', 'explain trace [TRACE-ID]'
- Want high-level overview and link to view trace details in Sentry
- Need trace statistics and span breakdown

DO NOT USE for:
- General searching for traces (use search_events with trace queries)
- Individual span details (this shows trace overview)

TRIGGER PATTERNS:
- 'Show me trace abc123' → use get_trace_details
- 'Explain trace a4d1aae7216b47ff8117cf4e09ce9d0a' → use get_trace_details
- 'What is trace [trace-id]' → use get_trace_details

<examples>
### Get trace overview
```
get_trace_details(organizationSlug='my-organization', traceId='a4d1aae7216b47ff8117cf4e09ce9d0a')
```
</examples>

<hints>
- Trace IDs are 32-character hexadecimal strings
</hints>

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.get_trace_details --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.get_trace_details {"k":"v"}`
- pi tool: `mcp_sentry_get_trace_details` with `argsJson`

## Arguments
- Required: organizationSlug, traceId
- Optional: regionUrl

## Example
- `mcporter call sentry.get_trace_details --args '{"organizationSlug":"...","traceId":"..."}'`