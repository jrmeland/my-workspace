---
name: linear
description: MCP server usage instructions for Linear, including issue management, linking external resources, and tool call patterns.
---

# Linear MCP Instructions

> **See also:** The **linear-tickets** skill (`~/.pi/agent/skills/linear-tickets/SKILL.md`) for content preferences — how Josh likes tickets structured, when to draft vs save, description style, etc.

## Linking External URLs to Issues (Sentry, Honeycomb, etc.)

The `create_attachment` tool is for **file uploads only** (requires base64Content, filename, contentType).

To link an external URL (e.g., a Sentry issue) to a Linear issue, use the **`save_issue`** tool with the `links` parameter:

```
save_issue(
  id: "TEAM-123",
  links: [{"url": "https://sentry.io/issues/ISSUE-ID", "title": "Sentry: ISSUE-ID — error description"}]
)
```

Key details:
- `links` is **append-only** — existing links are never removed when you add new ones
- Each link object has `url` (required) and `title` (optional but recommended)
- Works for any URL: Sentry, Honeycomb, GitHub, Slack, Notion, etc.
- If the workspace has a matching integration (e.g., Sentry), Linear will create a **rich attachment** with integration features (e.g., auto-resolve Sentry when Linear issue completes)
- The link appears in the issue's attachments section, not as a comment

### Example: Link a Sentry issue

```json
{
  "id": "NAV-47",
  "links": [
    {
      "url": "https://function-health.sentry.io/issues/AI-CHAT-FBB",
      "title": "Sentry: AI-CHAT-FBB — psycopg.errors.UntranslatableCharacter"
    }
  ]
}
```

### Example: Link multiple resources at once

```json
{
  "id": "NAV-47",
  "links": [
    {"url": "https://sentry.io/issues/PROJ-123", "title": "Sentry: PROJ-123"},
    {"url": "https://ui.honeycomb.io/team/environments/prod/datasets/service/result/abc", "title": "Honeycomb: error query"}
  ]
}
```

## Creating Issues

Use `save_issue` with `team` (team UUID) for new issues. Key fields:
- `team` (required for creation) — team UUID
- `title`, `description`, `priority` (1=Urgent, 2=High, 3=Medium, 4=Low)
- `project` — project name or UUID
- `projectMilestoneId` — milestone UUID (get milestones via `list_projects` with `includeMilestones=true`)
- `parentId` — parent issue ID for sub-issues
- `links` — attach external URLs at creation time

## Updating Issues

Use `save_issue` with `id` (issue identifier like "NAV-47") for updates.

## Tool Reference

| Tool | Use for |
|------|---------|
| `save_issue` | Create/update issues, **link external URLs** via `links` param |
| `get_issue` | Get issue details including attachments |
| `list_issues` | Search/filter issues |
| `save_comment` | Add comments to issues |
| `create_attachment` | Upload **files** (not URLs) to issues |
| `list_teams` | Discover team UUIDs for issue creation |
