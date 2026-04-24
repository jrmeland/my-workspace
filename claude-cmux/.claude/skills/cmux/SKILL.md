---
name: cmux
description: "Detect and interact with cmux terminal multiplexer — pane management, progress reporting, browser automation, and multi-agent coordination."
---

# cmux Terminal Multiplexer — Agent Integration

Use when orchestrating terminal sessions, running parallel commands, monitoring output, or reporting progress inside cmux.

## Detection

Check for the `CMUX_WORKSPACE_ID` environment variable. If set, you are inside cmux and can use the `cmux` CLI. If unset, do NOT attempt any cmux commands.

Environment variables automatically set in cmux terminals:
- `CMUX_WORKSPACE_ID` — current workspace ref
- `CMUX_SURFACE_ID` — current surface ref
- `CMUX_SOCKET_PATH` — Unix socket path

## Hierarchy

Window > Workspace (sidebar tab) > Pane (split region) > Surface (terminal tab in pane).

Use short refs: `workspace:1`, `pane:1`, `surface:2`.

## Core Commands

### Orientation

```bash
cmux identify                         # get caller context (workspace/surface/pane refs)
cmux tree                             # full hierarchy of current workspace
cmux tree --all                       # all windows/workspaces
cmux list-workspaces                  # list all workspaces
cmux list-panes                       # list panes in current workspace
cmux list-pane-surfaces --pane <ref>  # list surfaces (tabs) in a pane
```

### Create Terminals

```bash
cmux new-workspace --command "cd /path && cmd"  # new workspace tab
cmux new-split <left|right|up|down>             # split current pane
cmux new-surface                                # new tab in current pane
cmux new-pane --direction <dir>                 # new pane
```

### Send Input / Read Output

```bash
cmux send --surface <ref> "text\n"              # send text (include \n for enter)
cmux send-key --surface <ref> <key>             # send key (enter, ctrl-c, etc.)
cmux read-screen --surface <ref> --lines <n>    # read terminal output (last n lines)
cmux capture-pane --surface <ref> --lines <n>   # tmux-compatible alias for read-screen
```

### Progress Reporting (shows in cmux sidebar)

```bash
cmux set-progress <0.0-1.0> --label "text"
cmux notify --title "Title" --body "Body"       # desktop notification
cmux clear-progress
```

### Workspace Management

```bash
cmux rename-workspace "name"
cmux rename-tab --surface <ref> "name"
cmux close-surface --surface <ref>
cmux close-workspace --workspace <ref>
```

## Browser Panel

cmux has a built-in browser engine. Open web pages in splits and interact programmatically.

All browser commands: `cmux browser <surface> <subcommand> [args...]`

**IMPORTANT:** `open-split --url` is unreliable. Always use two steps:

```bash
# 1. Create the split
cmux browser <your-surface> open-split --direction right
# 2. Navigate after surface is ready
sleep 1 && cmux browser <new-surface> navigate <url>
```

Key browser subcommands:
- `navigate <url>`, `back`, `forward`, `reload`, `url`
- `snapshot [--compact]` — get DOM snapshot
- `click <selector>`, `fill <selector> "text"`, `press <key>`
- `get text|html|value|title <selector>`
- `wait --selector|--text|--url|--load-state <arg>`
- `screenshot [--out <path>]`
- `eval "js expression"`
- `console list`, `errors list`

## Workflow Patterns

### Fan out into splits (parallel tasks)

```bash
cmux new-split right
cmux send --surface surface:2 "npm run dev\n"
cmux new-split down
cmux send --surface surface:3 "npm test -- --watch\n"
cmux read-screen --surface surface:3 --lines 20
```

### Report progress throughout a task

```bash
cmux set-progress 0.0 --label "Starting build"
# ... work ...
cmux set-progress 0.5 --label "Running tests"
# ... work ...
cmux set-progress 1.0 --label "Complete"
cmux clear-progress
cmux notify --title "Done" --body "All tests passed"
```

## Safety Rules

- **Never `cmux send` to surfaces you don't own** — the user may be typing in them
- **Always target surfaces you created** with `--surface <ref>`
- **Don't steal focus** — avoid `select-workspace`, `focus-pane` unless the user asked
- **Clean up when done** — close surfaces and workspaces you created
- **Use `cmux identify` or `cmux tree` first** to understand your context before creating terminals
