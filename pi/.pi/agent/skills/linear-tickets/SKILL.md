---
name: linear-tickets
description: Preferences and patterns for creating and managing Linear tickets. Covers review-before-save workflow, concise descriptions, evidence-grounded bugs, parent/sub-issue hierarchy, and push-to-ticket updates.
---

# Linear Ticket Skill

Instructions for creating and managing Linear tickets that match Josh's preferences, derived from patterns across 100+ agent sessions.

## Tool

Use Linear MCP via mcporter. For tool usage details (API patterns, linking external URLs, etc.), see the **linear** MCP instructions skill (`mcp-instructions/servers/linear/SKILL.md`). This skill covers **what** to put in tickets and **how** Josh likes them structured.

## Core Principles

### 1. Always let Josh review before saving

Unless explicitly told to go ahead, **draft the content first and present it for review** before calling `save_issue`. This applies especially to:
- Bug reports ("write a bug report please, once I review we will create a ticket")
- Descriptions with technical claims ("I need a clear signal... grounded in error observations")
- Any ticket with multiple sub-issues

The typical flow is:
1. Josh says "create a ticket for X"
2. You draft the title + description
3. Josh reviews, edits, confirms
4. You save it

Exceptions where you can save directly:
- Simple sub-issues where Josh gave an explicit title
- Adding a comment to an existing ticket
- Josh explicitly says "go ahead" or "please create"

### 2. Keep descriptions concise

Josh consistently asks for concise content:
- *"Keep it concise, focus on observations"*
- *"Keep the description concise"*
- *"This is too complicated to understand... can we make it more simple"*

**Good description structure:**
```markdown
## Context
1-2 sentences on what this is and why it matters.

## Details
Bullet points with specifics. Link to evidence (Sentry, Honeycomb, PRs).

## Next Steps / Fix Direction
Brief speculated fix if clear. Otherwise omit.
```

**Avoid:**
- Walls of text
- Restating obvious context from the title
- Over-explaining background the team already knows

### 3. Ground bug reports in observable evidence

For bugs and incidents, Josh wants descriptions grounded in **proof, not narrative**:
- *"focus on observations (the proof that grounds the bug)"*
- *"a clear signal grounded in error observations from honeycomb and/or GCP logs"*
- *"I would rather a clear signal... rather than a super clear bug narrative that is wrong"*

**Include:**
- Links to Honeycomb queries, Sentry issues, GCP logs
- Specific error messages and counts
- Timestamps showing when the issue started
- Screenshots from Slack threads if available

**Don't include:**
- Speculative root cause unless you're confident
- Over-certain narratives that could be wrong

### 4. Use parent/sub-issue hierarchy naturally

Josh uses a consistent pattern:
- **Parent ticket** = the initiative or incident
- **Sub-issues** = individual work items or investigation threads

Examples from sessions:
- Parent: "INC-134: Memory Extraction Outage" → Sub: "Investigation", Sub: "[SPIKE] Confirm if questionnaire events..."
- Parent: "Migrate to Valkey Cluster" → Sub: per-component migration tickets ("Migrate embeddings cache", "Migrate pubsub", etc.)
- Parent: "Live Demo Ready" → Sub: "Backend deployed to sandbox" (assigned BE), Sub: "FE talks to sandbox" (assigned FE)

**Important:** Make sure sub-issues are actually created as sub-issues (with `parentId`), not just related issues. Josh has flagged this: *"those issues are not actually sub issues, query for each of them and I think you will see"*

### 5. Assign to the right place

Josh always specifies **where** a ticket goes. Don't guess — ask if not provided. The typical signals:

| Signal | What to do |
|--------|-----------|
| Team URL: `linear.app/functionhealth/team/NAV/all` | Create in that team |
| Project URL: `linear.app/functionhealth/project/refer-a-specialist-eb666e28cc7f/...` | Create in that project |
| "in AIC team" / "to AI Infra team" | Find the team by name |
| Parent issue URL | Create as sub-issue of that parent |
| "assigned to this milestone" | Set the milestone |
| No location specified | **Ask Josh** where it should go |

### 6. Check for duplicates first

Before creating, search Linear to see if the issue already exists:
- *"search linear for the SRE/DEVOPS... first search to see if the issue already exists"*
- *"Can you examine the linear issues we have for this and suggest concise changes"*

### 7. Push updates, not just create

Common update operations:
- **Push to description**: `"push that to the description of AIC-2436"`, `"replace the description in..."`
- **Add as comment**: `"push this as a comment"`, `"post a comment"`, `"push this analysis to this ticket"` 
- **Status update with next steps**: `"push a status update... along with what is next please. In a comment"`
- **Close/resolve threads**: `"post a comment that they were covered with tests and close the thread"`

When pushing a large document to a description that might be too big, chunk it into comments.

### 8. Labels and metadata

Josh uses labels sparingly but intentionally:
- *"label it as needing additional investigation"*
- *"make sure they are labeled with milestone POC V2"*

Don't add labels unless asked or it's clearly appropriate (e.g., "bug" label for a bug ticket).

## Ticket Types (by pattern)

### Bug Report
```
Trigger: "create a bug ticket", "cut a bug", "file a bug"
Flow: Investigate → draft report → Josh reviews → save
Content: Observations + evidence links + speculated fix direction (if confident)
```

### Feature / Work Item
```
Trigger: "create a ticket for X", "cut tickets for the POC work"
Flow: Often comes after planning discussion → create with context from conversation
Content: What needs to happen + relevant links (TRD, Figma, docs)
```

### Investigation / Incident
```
Trigger: "create a high level ticket for this incident"
Flow: Create parent → sub-issues for investigation threads and spikes
Content: Timeline + evidence links + remaining questions
```

### Sub-Issue
```
Trigger: "add a sub issue to [URL]", "create a sub issue for..."
Flow: Usually direct creation with explicit title
Content: Brief — inherits context from parent
```

### Spike
```
Trigger: "create a spike for...", "[SPIKE] prefix"
Flow: Create with background context and specific question to answer
Content: Background + the specific gap/question + relevant data
```

## Common Mistakes to Avoid

1. **Don't create before Josh reviews** (unless told to proceed)
2. **Don't guess the team/project** — ask if not specified
3. **Don't write long descriptions** — bullet points over paragraphs
4. **Don't create related issues when sub-issues were requested** — verify with `parentId`
5. **Don't omit evidence links** for bug/incident tickets
6. **Don't create duplicates** — search first when Josh mentions an area broadly
7. **Don't label aggressively** — only label when asked or clearly appropriate
