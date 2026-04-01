---
name: cmux-remote
description: "Working inside cmux over SSH/remote. Use when CMUX_SOCKET_PATH is a TCP address. Covers the remote daemon CLI which has a limited command set plus `cmux rpc` for full access to all cmux capabilities."
---

# cmux Remote Workspace Skill

You are running inside **cmux** via a remote/SSH connection. The remote daemon CLI has a limited set of top-level commands, but **`cmux rpc <method> [json-params]`** gives full access to all capabilities.

## Core Principle

**Never block this pane with long-running processes.** Spawn them in a new split pane and read their output when needed.

## Hierarchy

```
Window
└── Workspace (sidebar entry)
    └── Pane (split region)
        └── Surface (tab within a pane)
```

## Addressing

Commands accept UUIDs or short refs: `workspace:1`, `pane:2`, `surface:3`, `window:1`.
The current workspace/surface is auto-detected from `CMUX_WORKSPACE_ID` and `CMUX_SURFACE_ID`.

## Direct CLI Commands

These work as top-level commands in remote mode:

```bash
# Connectivity
cmux ping
cmux capabilities

# Workspaces
cmux list-workspaces
cmux new-workspace [--name <title>] [--cwd <path>]
cmux close-workspace --workspace <id|ref>
cmux select-workspace --workspace <id|ref>

# Panes & surfaces
cmux new-split <left|right|up|down> [--surface <id|ref>]
cmux new-surface [--pane <id|ref>]
cmux close-surface [--surface <id|ref>]

# Send text & keys
cmux send [--surface <id|ref>] "command text"
cmux send-key [--surface <id|ref>] "Return"
cmux send-key [--surface <id|ref>] "C-c"    # Ctrl+C
cmux send-key [--surface <id|ref>] "C-d"    # Ctrl+D / EOF

# Notifications
cmux notify --title "Done" --body "Task complete"

# Windows
cmux new-window

# Browser (subcommands)
cmux browser open <url>
cmux browser open-split <url>
```

### Combined: send command + execute

```bash
cmux send --surface surface:3 "npm run dev" && cmux send-key --surface surface:3 "Return"
```

## RPC Commands

For everything else, use `cmux rpc <method> [json-params]`. The JSON params argument is optional — omit it for parameterless calls.

### Layout & Discovery

```bash
# Full tree of all windows, workspaces, panes, surfaces
cmux rpc system.tree

# Tree of current workspace only
cmux rpc system.tree '{"workspace_id":"'$CMUX_WORKSPACE_ID'"}'

# Identify current context
cmux rpc system.identify

# List panes in current workspace
cmux rpc pane.list

# List surfaces in a pane
cmux rpc pane.surfaces '{"pane_ref":"pane:1"}'
```

### Reading Output from Other Panes

```bash
# Read current visible screen
cmux rpc surface.read_text '{"surface_ref":"surface:3"}'

# Read with scrollback
cmux rpc surface.read_text '{"surface_ref":"surface:3","scrollback":true}'

# Read last N lines
cmux rpc surface.read_text '{"surface_ref":"surface:3","lines":50}'
```

### Pane Management

```bash
# Focus a pane
cmux rpc pane.focus '{"pane_ref":"pane:2"}'

# Resize a pane
cmux rpc pane.resize '{"pane_ref":"pane:2","direction":"right","amount":20}'

# Swap panes
cmux rpc pane.swap '{"pane_ref":"pane:2","target_pane_ref":"pane:3"}'

# Break pane to new workspace
cmux rpc pane.break '{"pane_ref":"pane:2"}'
```

### Workspace Management

```bash
# Rename workspace
cmux rpc workspace.rename '{"name":"My Server"}'

# Current workspace info
cmux rpc workspace.current

# Navigate workspaces
cmux rpc workspace.next
cmux rpc workspace.previous
cmux rpc workspace.last
```

### Notifications

```bash
# Create notification
cmux rpc notification.create '{"title":"Build Done","body":"All tests passed"}'

# List/clear notifications
cmux rpc notification.list
cmux rpc notification.clear
```

### Markdown Viewer

```bash
cmux rpc markdown.open '{"path":"/absolute/path/to/README.md"}'
```

### Surface Management

```bash
# List all surfaces
cmux rpc surface.list

# Get current surface
cmux rpc surface.current

# Clear scrollback history
cmux rpc surface.clear_history '{"surface_ref":"surface:3"}'
```

### Find Window

```bash
# Search by name
cmux rpc -- find-window not available via rpc; use list-workspaces and filter
```

## Browser Automation (via RPC)

The direct `cmux browser` subcommand supports basic operations. For the full browser API, use RPC:

```bash
# Snapshot (accessibility tree) — primary way to "see" the page
cmux rpc browser.snapshot '{"surface_ref":"surface:5","interactive":true,"compact":true}'

# Navigate
cmux rpc browser.navigate '{"surface_ref":"surface:5","url":"https://example.com"}'

# Click
cmux rpc browser.click '{"surface_ref":"surface:5","selector":"button#submit"}'

# Fill form
cmux rpc browser.fill '{"surface_ref":"surface:5","selector":"input[name=email]","value":"user@example.com"}'

# Wait for condition
cmux rpc browser.wait '{"surface_ref":"surface:5","text":"Success"}'

# Screenshot
cmux rpc browser.screenshot '{"surface_ref":"surface:5","out":"/tmp/page.png"}'

# Evaluate JS
cmux rpc browser.eval '{"surface_ref":"surface:5","script":"document.title"}'

# Get page info
cmux rpc browser.get.title '{"surface_ref":"surface:5"}'
cmux rpc browser.get.text '{"surface_ref":"surface:5","selector":"h1"}'
cmux rpc browser.get.url '{"surface_ref":"surface:5"}'
```

## Workflows

### Run Tests in a Separate Pane

```bash
# 1. Create a split pane
cmux new-split right

# 2. Find the new surface ref
cmux rpc system.tree

# 3. Send the test command
cmux send --surface surface:NEW "pytest tests/ -v" && cmux send-key --surface surface:NEW "Return"

# 4. Later, check test output
cmux rpc surface.read_text '{"surface_ref":"surface:NEW","scrollback":true,"lines":100}'
```

### Start a Dev Server

```bash
cmux new-split down
cmux rpc system.tree
cmux send --surface surface:NEW "npm run dev" && cmux send-key --surface surface:NEW "Return"
cmux rpc surface.read_text '{"surface_ref":"surface:NEW","lines":20}'
```

### Stop a Running Process

```bash
cmux send-key --surface surface:3 "C-c"
cmux rpc surface.read_text '{"surface_ref":"surface:3","lines":5}'
```

### Build with Notification

```bash
cmux new-split down
cmux send --surface surface:NEW "npm run build && cmux notify --title 'Build Done' --body 'Success' || cmux notify --title 'Build Failed' --body 'Check output'" && cmux send-key --surface surface:NEW "Return"
```

## Practical Tips

1. **Always run `cmux rpc system.tree`** before creating new panes to see what exists.
2. **After `cmux new-split`**, run `cmux rpc system.tree` to find the new surface ref.
3. **Use `cmux rpc surface.read_text` with `"scrollback":true`** to see full output.
4. **Use `cmux notify`** to alert the user when long tasks complete.
5. **Send Ctrl+C** with `cmux send-key --surface <ref> "C-c"` before sending new commands to a busy pane.
6. **RPC returns JSON** — pipe through `python3 -m json.tool` for readability if needed.

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
