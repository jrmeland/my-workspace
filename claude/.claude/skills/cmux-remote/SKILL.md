---
name: cmux-remote
description: "Working inside cmux over SSH/remote. Use when CMUX_SOCKET_PATH is a TCP address. Covers the remote daemon CLI which has a limited command set plus `cmux rpc` for full access to all cmux capabilities."
---

# cmux Remote Workspace Skill

You are running inside **cmux** via a remote/SSH connection. The remote daemon CLI has a limited set of top-level commands, but `cmux rpc <method> [json-params]` gives full access to all capabilities.

## Core Principle

**Never block this pane with long-running processes.** Spawn them in a new split pane and read their output when needed.

## cmux-helper

This skill includes a helper script at `SKILL_DIR/cmux-helper` that wraps common operations and **resolves short refs (surface:N) to UUIDs automatically** — which is required in remote mode since ref-based RPC params don't work reliably over the TCP relay.

Set up the helper path at the start of a session:

```bash
CMUX="$HOME/.claude/skills/cmux-remote/cmux-helper"
```

### Helper Commands

```bash
# Layout
$CMUX tree                    # Pretty-print current workspace
$CMUX tree --all              # All workspaces
$CMUX surfaces                # Tab-separated list: ref, uuid, pane, type, title

# Read surface content
$CMUX read surface:3                       # Current screen
$CMUX read surface:3 --lines 50           # Last N lines
$CMUX read surface:3 --scrollback         # Full scrollback history

# Send text / keys / commands
$CMUX send surface:3 "some text"          # Send text (no Enter)
$CMUX send-key surface:3 "Return"         # Press Enter
$CMUX send-key surface:3 "C-c"           # Ctrl+C
$CMUX exec surface:3 "npm run dev"        # Send command + Enter

# Resolve ref to UUID (for direct rpc calls)
$CMUX resolve surface:3
```

All commands accept short refs (`surface:N`, `pane:N`) or full UUIDs.

## Direct CLI Commands

These top-level commands work in remote mode without the helper:

```bash
# Panes & surfaces
cmux new-split <left|right|up|down> [--surface <id|ref>]
cmux new-surface [--pane <id|ref>]
cmux close-surface [--surface <id|ref>]

# Send text & keys (these accept short refs directly)
cmux send [--surface <id|ref>] "command text"
cmux send-key [--surface <id|ref>] "Return"
cmux send-key [--surface <id|ref>] "C-c"

# Workspaces
cmux list-workspaces
cmux new-workspace [--name <title>] [--cwd <path>]
cmux close-workspace --workspace <id|ref>
cmux select-workspace --workspace <id|ref>

# Notifications
cmux notify --title "Done" --body "Task complete"

# Browser
cmux browser open <url>
cmux browser open-split <url>
```

## RPC Commands

For operations not covered by the helper or direct CLI, use `cmux rpc <method> [json-params]`.

**Important:** In remote mode, RPC params that take surface/pane/workspace references must use `surface_id` (full UUID), not `surface_ref` (short ref). Use `$CMUX resolve surface:N` to get the UUID.

### Workspace Management

```bash
cmux rpc workspace.rename '{"name":"My Server"}'
cmux rpc workspace.current
cmux rpc workspace.next
cmux rpc workspace.previous
```

### Pane Management

```bash
# Use resolve for pane UUIDs
PANE_UUID=$($CMUX resolve pane:2)
cmux rpc pane.focus "{\"pane_id\":\"$PANE_UUID\"}"
cmux rpc pane.resize "{\"pane_id\":\"$PANE_UUID\",\"direction\":\"right\",\"amount\":20}"
```

### Notifications (via RPC)

```bash
cmux rpc notification.create '{"title":"Build Done","body":"All tests passed"}'
cmux rpc notification.list
cmux rpc notification.clear
```

### Markdown Viewer

```bash
cmux rpc markdown.open '{"path":"/absolute/path/to/README.md"}'
```

## Browser Automation

Basic operations via direct CLI:

```bash
cmux browser open http://localhost:3000
cmux browser open-split https://github.com
```

Full browser API via RPC (use UUIDs):

```bash
SURF=$($CMUX resolve surface:5)
WS="$CMUX_WORKSPACE_ID"

# Snapshot (accessibility tree) — primary way to "see" the page
cmux rpc browser.snapshot "{\"surface_id\":\"$SURF\",\"interactive\":true,\"compact\":true}"

# Navigate
cmux rpc browser.navigate "{\"surface_id\":\"$SURF\",\"url\":\"https://example.com\"}"

# Click
cmux rpc browser.click "{\"surface_id\":\"$SURF\",\"selector\":\"button#submit\"}"

# Fill form
cmux rpc browser.fill "{\"surface_id\":\"$SURF\",\"selector\":\"input[name=email]\",\"value\":\"user@example.com\"}"

# Wait for condition
cmux rpc browser.wait "{\"surface_id\":\"$SURF\",\"text\":\"Success\"}"

# Screenshot
cmux rpc browser.screenshot "{\"surface_id\":\"$SURF\",\"out\":\"/tmp/page.png\"}"

# Evaluate JS
cmux rpc browser.eval "{\"surface_id\":\"$SURF\",\"script\":\"document.title\"}"
```

## Workflows

### Run Tests in a Separate Pane

```bash
CMUX="$HOME/.claude/skills/cmux-remote/cmux-helper"

# 1. Check existing layout
$CMUX tree

# 2. Create a split pane
cmux new-split right

# 3. Find the new surface
$CMUX surfaces

# 4. Run tests
$CMUX exec surface:NEW "pytest tests/ -v"

# 5. Check output later
$CMUX read surface:NEW --scrollback --lines 100
```

### Start a Dev Server

```bash
cmux new-split down
$CMUX surfaces
$CMUX exec surface:NEW "npm run dev"
$CMUX read surface:NEW --lines 20
```

### Stop a Running Process

```bash
$CMUX send-key surface:3 "C-c"
$CMUX read surface:3 --lines 5
```

### Build with Notification

```bash
cmux new-split down
$CMUX surfaces
$CMUX exec surface:NEW "npm run build && cmux notify --title 'Build Done' --body 'Success' || cmux notify --title 'Build Failed' --body 'Check output'"
```

## Practical Tips

1. **Set `CMUX` var at session start**: `CMUX="$HOME/.claude/skills/cmux-remote/cmux-helper"`
2. **Always run `$CMUX tree`** before creating panes to see what exists.
3. **After `cmux new-split`**, run `$CMUX surfaces` to find the new surface ref.
4. **Use `$CMUX read <ref> --scrollback`** to see full output including what scrolled off-screen.
5. **Use `cmux notify`** to alert the user when long tasks complete.
6. **Send Ctrl+C** with `$CMUX send-key <ref> "C-c"` before sending new commands to a busy pane.

## Known Limitations (Remote Mode)

- **Ref-based RPC params fail silently** — always use UUIDs via `$CMUX resolve` or use the helper commands which handle this automatically.
- The direct CLI commands (`cmux send`, `cmux send-key`, `cmux new-split`) accept short refs and work fine.
- `cmux rpc` calls require full UUIDs for surface/pane/workspace targeting.

## Key Bindings Reference (for the user)

| Action | Shortcut |
|--------|----------|
| New workspace | `⌘N` |
| Split right | `⌘D` |
| Split down | `⌘⇧D` |
| Focus pane (directional) | `⌥⌘ + Arrow` |
| New surface (tab) | `⌘T` |
| Close surface | `⌘W` |
| Jump to workspace 1-9 | `⌘1-9` |
| Jump to surface 1-9 | `⌃1-9` |
| Notifications panel | `⌘⇧I` |
