---
name: "calls-sentry-get_event_attachment"
description: "Download attachments from a Sentry event."
---

# MCP Call Instructions: sentry.get_event_attachment

Generated: 2026-03-25T15:01:28.008Z

Description: Download attachments from a Sentry event.

Use this tool when you need to:
- Download files attached to a specific event
- Access screenshots, log files, or other attachments uploaded with an error report
- Retrieve attachment metadata and download URLs

<examples>
### Download a specific attachment by ID

```
get_event_attachment(organizationSlug='my-organization', projectSlug='my-project', eventId='c49541c747cb4d8aa3efb70ca5aba243', attachmentId='12345')
```

### List all attachments for an event

```
get_event_attachment(organizationSlug='my-organization', projectSlug='my-project', eventId='c49541c747cb4d8aa3efb70ca5aba243')
```

</examples>

<hints>
- If `attachmentId` is provided, the specific attachment will be downloaded as an embedded resource
- If `attachmentId` is omitted, all attachments for the event will be listed with download information
- The `projectSlug` is required to identify which project the event belongs to
</hints>

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.get_event_attachment --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.get_event_attachment {"k":"v"}`
- pi tool: `mcp_sentry_get_event_attachment` with `argsJson`

## Arguments
- Required: organizationSlug, projectSlug, eventId
- Optional: attachmentId, regionUrl

## Example
- `mcporter call sentry.get_event_attachment --args '{"organizationSlug":"...","projectSlug":"...","eventId":"..."}'`