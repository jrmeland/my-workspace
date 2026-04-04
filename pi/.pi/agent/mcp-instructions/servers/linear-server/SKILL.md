---
name: "linear"
description: "MCP server usage instructions for Linear (linear-server), including reading/creating issues, setting labels, managing comments, and navigating the Enclaiva workspace."
---

# MCP Server Instructions: linear-server

## Auth
- Refresh auth when needed: `mcporter auth linear-server`

## How to call tools
- Raw CLI: `mcporter call linear-server.<tool> key=value`
- pi dynamic tool: There are **no** pi-registered dynamic tools for linear-server. Use `mcporter call` via bash instead.

## Workspace reference

### Team
| Name | Key | ID |
|------|-----|----|
| Enclaiva | ENC | `ecdd3bb6-2e2d-4ea7-a3b1-9755807dddcc` |

All issues use identifier prefix **ENC-** (e.g. `ENC-42`).

### Projects
| Name | ID | Status |
|------|----|--------|
| CRM Funnel | `4e022b28-7377-4684-a9a5-3dd7bb8e556b` | Backlog |
| Product | `625652ce-3f4f-444d-ae3d-03d3fd53be32` | In Progress |
| Internal | `13ed8dbd-dcc2-436a-bf7f-950eb2ec83a3` | Backlog |
| Air Force | `911a683e-d814-433b-a7f2-2673bf654e08` | In Progress |

You can pass either the project **name** or **ID** to the `project` field.

### Issue statuses
| Name | Type |
|------|------|
| Backlog | backlog |
| Prospect | backlog |
| Todo | unstarted |
| Discovery | unstarted |
| In Progress | started |
| In Review | started |
| POC/pilot | started |
| Proposal | started |
| Done | completed |
| Deployed / Live | completed |
| Closed / Won | completed |
| Canceled | canceled |
| Closed Lost | canceled |
| Duplicate | canceled |

### Labels
| Name | Color | ID |
|------|-------|----|
| Bug | 🔴 red | `68f6aeaf-0986-4bfe-b458-a85753e2c9eb` |
| Feature | 🟣 purple | `d358e8cb-34e7-4e5c-8879-37a5fe930951` |
| Improvement | 🔵 blue | `71d1ad83-5b42-4d3a-b072-4a835eca7688` |
| Quality Issue | 🟠 orange | `f2af83fe-92c7-46cf-8eae-dec730e9fc1a` |
| Forge | 🟠 orange | `0d4b096b-9fb9-42f5-b363-78cb66f1260d` |
| VLM | 🟣 purple | `6826c86f-2b0b-4156-a56f-2192331e0588` |
| Question-Answer | 🟠 orange | `cb2bb210-2100-48a9-90db-ac8b7eb04ec8` |
| Retrieval | 🔵 cyan | `cd16b22d-fe60-44b4-9791-30624f28c553` |
| Ingestion | 🟠 orange | `01782064-505f-443a-8094-144c9ea1ba6f` |
| Project Mgmt | 🩷 pink | `5bc69e51-3ab6-45a4-862b-dde0ae4b7837` |
| prod-deployment-artifact | 🟣 indigo | `1c4d9da5-14e1-46ae-b26f-f90eb39056a8` |

You can pass label **names** (not IDs) in the `labels` array.

### Team members
| Name | Display | Email | ID |
|------|---------|-------|----|
| Josh Melander | josh | josh@enclaiva.com | `4dc09456-e47a-49de-b53c-2d080534e167` |
| Sean Boedeker | sean | sean@enclaiva.com | `5dd24b7f-17f7-4f08-a92c-2a252834464b` |
| Philip Powell | philip | philip@enclaiva.com | `9951ed42-b87d-4bf3-8ced-91f017067cab` |
| ben | ben | ben@enclaiva.com | `468c3ae6-538b-4cb9-9fe3-9b414bf4ef98` |
| laryssa | laryssa | laryssa@enclaiva.com | `8044db8f-fb65-4352-a637-d4bf201526ab` |
| thaddeus | thaddeus | thaddeus@enclaiva.com | `7715fb16-1d67-4a9a-bfdd-0dd889660ef7` |
| kohl | kohl | kohl@enclaiva.com | `74b68f9c-8c8f-46b5-a2e1-442a2be38332` |

Use `"me"` for the current authenticated user, or pass name/email/ID.

### Priority values
| Value | Meaning |
|-------|---------|
| 0 | None |
| 1 | Urgent |
| 2 | High |
| 3 | Normal |
| 4 | Low |

---

## Common operations

### Read a ticket

```bash
mcporter call linear-server.get_issue id=ENC-42
```

Include relations and customer needs:
```bash
mcporter call linear-server.get_issue id=ENC-42 includeRelations=true includeCustomerNeeds=true
```

### Search / list issues

```bash
# Search by text query
mcporter call linear-server.list_issues query="auth bug" team=Enclaiva

# List recent issues for the team
mcporter call linear-server.list_issues team=Enclaiva limit=20 orderBy=updatedAt
```

### Create a new issue

Required fields: `title`, `team`. Everything else is optional.

```bash
mcporter call linear-server.save_issue \
  title="Fix login redirect loop" \
  team=Enclaiva \
  project=Product \
  state="Todo" \
  priority=2 \
  assignee=me \
  labels='["Bug"]' \
  description="Users are getting stuck in an infinite redirect after SSO login."
```

**Key points for creating issues:**
- Do NOT pass `id` — that's only for updates.
- `team` is required. Use `Enclaiva` (or the team ID).
- `project` accepts the project **name** (e.g. `Product`, `Internal`, `CRM Funnel`, `Air Force`).
- `state` accepts the status **name** (e.g. `Todo`, `In Progress`, `Backlog`).
- `labels` is a JSON array of label **names** (e.g. `'["Bug", "VLM"]'`).
- `assignee` accepts `"me"`, a display name, email, or user ID.
- `description` is Markdown. Use literal newlines, don't escape.

### Update an existing issue

Pass `id` to update. Only include fields you want to change.

```bash
# Change status and assignee
mcporter call linear-server.save_issue id=ENC-42 state="In Progress" assignee=sean

# Add labels (replaces current labels)
mcporter call linear-server.save_issue id=ENC-42 labels='["Bug", "VLM"]'

# Change priority
mcporter call linear-server.save_issue id=ENC-42 priority=1

# Move to a different project
mcporter call linear-server.save_issue id=ENC-42 project="Air Force"

# Set due date
mcporter call linear-server.save_issue id=ENC-42 dueDate="2026-04-15"

# Add blocking/related relations (append-only)
mcporter call linear-server.save_issue id=ENC-42 blocks='["ENC-10"]' relatedTo='["ENC-15"]'
```

### Set labels on an issue

```bash
mcporter call linear-server.save_issue id=ENC-42 labels='["Feature", "Retrieval"]'
```

> ⚠️ `labels` **replaces** the full label set. To add a label without removing existing ones, read the issue first, merge, then update.

### Add a comment

```bash
mcporter call linear-server.save_comment issueId=ENC-42 body="Investigated — root cause is a stale token cache."
```

Reply to an existing comment:
```bash
mcporter call linear-server.save_comment issueId=ENC-42 parentId=<comment-id> body="Good catch, I'll fix this."
```

Update an existing comment:
```bash
mcporter call linear-server.save_comment id=<comment-id> body="Updated analysis: the cache TTL was 0."
```

### List comments on an issue

```bash
mcporter call linear-server.list_comments issueId=ENC-42
```

### Create a label

```bash
mcporter call linear-server.create_issue_label name="Infrastructure" color="#27AE60" teamId=ecdd3bb6-2e2d-4ea7-a3b1-9755807dddcc
```

---

## Other useful tools

| Tool | Purpose |
|------|---------|
| `list_projects` | Browse projects (filter by state: `planned`, `started`, `paused`, `completed`, `canceled`) |
| `get_project` | Get project details, milestones, members |
| `list_cycles` | Get cycles for a team (current/previous/next) |
| `list_users` | List workspace members |
| `get_user` | Look up a user by name/email |
| `list_documents` | Search/list documents |
| `get_document` | Read a document |
| `create_document` | Create a doc (can attach to project or issue) |
| `create_attachment` | Upload a file to an issue (base64) |
| `search_documentation` | Search Linear's own docs |
| `research` | AI-assisted research via Linear |

## Per-call instructions
- See files in: `mcp-instructions/calls/linear-server/` (if any)
