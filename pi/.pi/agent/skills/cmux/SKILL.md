---
name: cmux
description: Working inside cmux terminal multiplexer. Use when you need to run long-running processes, tests, servers, or log-tailing in separate panes instead of blocking the current session. Also covers discovering existing panes, reading their output, and managing workspaces.
---

# cmux Workspace Skill

You are running inside **cmux**, a native macOS terminal multiplexer with a CLI-based control API. Use it to run long-running commands (servers, tests, builds, log tails) in separate panes so this session stays responsive.

## Core Principle

**Never block this pane with long-running processes.** Instead, spawn them in a new split pane and read their output when needed.

## Hierarchy

```
Window
└── Workspace (sidebar entry)
    └── Pane (split region)
        └── Surface (tab within a pane)
```

- **Workspace**: A sidebar entry containing one or more panes. Each terminal has `CMUX_WORKSPACE_ID` set.
- **Pane**: A split region within a workspace. Created by splitting.
- **Surface**: A tab within a pane. Each has `CMUX_SURFACE_ID`.

## Addressing

Commands accept UUIDs or short refs:
- `workspace:1`, `pane:2`, `surface:3`, `window:1`
- The current workspace/surface is auto-detected from env vars (`CMUX_WORKSPACE_ID`, `CMUX_SURFACE_ID`).

## Essential Commands

### Discover Layout

```bash
# Full tree of all windows, workspaces, panes, surfaces
cmux tree --all

# Tree of current workspace only
cmux tree

# List workspaces
cmux list-workspaces

# List panes in current workspace
cmux list-panes

# Identify current context (which surface/pane/workspace you're in)
cmux identify
```

### Create Panes

```bash
# Split current pane to the right (new terminal beside this one)
cmux new-split right

# Split current pane downward
cmux new-split down

# Split a specific pane
cmux new-split right --pane pane:2

# Create a new surface (tab) in an existing pane
cmux new-surface --pane pane:1
```

### Send Commands to Other Panes

```bash
# Send text to a surface (does NOT press Enter)
cmux send --surface surface:3 "npm run dev"

# Press Enter to execute
cmux send-key --surface surface:3 "Return"

# Combined: send command + enter
cmux send --surface surface:3 "npm run dev" && cmux send-key --surface surface:3 "Return"
```

### Read Output from Other Panes

```bash
# Read current visible screen of a surface
cmux read-screen --surface surface:3

# Read with scrollback history
cmux read-screen --surface surface:3 --scrollback

# Read last N lines
cmux read-screen --surface surface:3 --lines 50

# tmux-compatible alias
cmux capture-pane --surface surface:3 --scrollback
```

### Manage Workspaces

```bash
# Create a new workspace (opens in a fresh directory)
cmux new-workspace --cwd /path/to/project

# Create workspace and run a command immediately
cmux new-workspace --cwd /path/to/project --command "npm run dev"

# Rename current workspace
cmux rename-workspace "My Server"

# Switch to a workspace
cmux select-workspace --workspace workspace:2

# Close a workspace
cmux close-workspace --workspace workspace:3
```

### Close Panes/Surfaces

```bash
# Close a surface (tab)
cmux close-surface --surface surface:3

# Focus a specific pane
cmux focus-pane --pane pane:2
```

### Send Signals / Interrupt

```bash
# Send Ctrl+C to stop a process in another pane
cmux send-key --surface surface:3 "C-c"

# Send Ctrl+D (EOF)
cmux send-key --surface surface:3 "C-d"
```

### Notifications

```bash
# Send a notification (visible in cmux sidebar + macOS notification)
cmux notify --title "Build Complete" --body "All tests passed"

# Notify on a specific workspace
cmux notify --title "Done" --workspace workspace:1
```

### Sidebar Status & Progress

```bash
# Set a status key in the sidebar
cmux set-status "task" "Running tests" --icon "⏳"

# Set progress bar (0.0 to 1.0)
cmux set-progress 0.75 --label "Testing..."

# Clear when done
cmux clear-status "task"
cmux clear-progress
```

### Log Messages

```bash
# Add a log entry (visible in workspace sidebar)
cmux log "Starting deployment"
cmux log --level warning "Disk usage at 85%"

# View recent logs
cmux list-log --limit 20
```

## Workflows

### Run Tests in a Separate Pane

```bash
# 1. Create a split pane
cmux new-split right
# Note the surface ref from tree output

# 2. Send the test command
cmux send --surface surface:NEW "pytest tests/ -v" && cmux send-key --surface surface:NEW "Return"

# 3. Continue working in this pane...

# 4. Later, check test output
cmux read-screen --surface surface:NEW --scrollback --lines 100
```

### Start a Dev Server

```bash
# 1. Split down for a server pane
cmux new-split down

# 2. Start the server
cmux send --surface surface:NEW "npm run dev" && cmux send-key --surface surface:NEW "Return"

# 3. Check if it's running
cmux read-screen --surface surface:NEW --lines 20
```

### Tail Logs

```bash
# 1. Create a pane for logs
cmux new-split right

# 2. Tail the log file
cmux send --surface surface:NEW "tail -f /var/log/app.log" && cmux send-key --surface surface:NEW "Return"

# 3. Check recent log output anytime
cmux read-screen --surface surface:NEW --lines 50
```

### Run a Build and Get Notified

```bash
# 1. Split for the build
cmux new-split down

# 2. Run build with notification on completion
cmux send --surface surface:NEW "npm run build && cmux notify --title 'Build Done' --body 'Success' || cmux notify --title 'Build Failed' --body 'Check output'" && cmux send-key --surface surface:NEW "Return"
```

### Stop a Running Process

```bash
# Send Ctrl+C to the process
cmux send-key --surface surface:3 "C-c"

# Verify it stopped
cmux read-screen --surface surface:3 --lines 5
```

## Practical Tips

1. **Always check `cmux tree`** before creating new panes to avoid duplicating existing ones.
2. **After `cmux new-split`**, run `cmux tree` to find the new surface ref.
3. **Use `cmux read-screen --scrollback`** to see full output including what scrolled off-screen.
4. **Use `cmux notify`** to alert the user when long tasks complete.
5. **Name workspaces** with `cmux rename-workspace` so `tree` output is readable.
6. **Use `cmux set-status`** to show what's happening in the sidebar.
7. **Send Ctrl+C** with `cmux send-key --surface <ref> "C-c"` before sending new commands to a pane that may have a running process.
8. **Use `cmux identify`** to confirm which surface/pane you're operating in.

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

## Browser Automation

cmux has a full **scriptable in-app browser** (ported from Vercel's agent-browser). Browser surfaces live alongside terminal surfaces in panes. All browser commands use the `browser` subcommand and target a surface.

### Opening a Browser

```bash
# Open a browser split next to the current terminal
cmux browser open http://localhost:3000

# Open as a split explicitly
cmux browser open-split https://github.com

# Open a browser pane via the generic pane command
cmux new-pane --type browser --url "http://localhost:3000"
```

After opening, note the surface ref (e.g. `surface:5`) from `cmux tree` output.

### Targeting a Browser Surface

Pass the surface positionally or with `--surface`:

```bash
# These are equivalent
cmux browser surface:5 url
cmux browser --surface surface:5 url

# Identify a browser surface (URL, title)
cmux browser surface:5 identify
```

### Navigation

```bash
cmux browser surface:5 navigate https://example.com
cmux browser surface:5 goto https://example.com --snapshot-after
cmux browser surface:5 back
cmux browser surface:5 forward
cmux browser surface:5 reload --snapshot-after
cmux browser surface:5 url            # get current URL
cmux browser surface:5 focus-webview  # give keyboard focus to the page
```

### Inspecting Page State (Snapshots)

The **snapshot** command returns the accessibility tree — the primary way for agents to "see" the page:

```bash
# Full accessibility tree
cmux browser surface:5 snapshot

# Interactive elements only (buttons, links, inputs) — best for agent use
cmux browser surface:5 snapshot --interactive

# Compact output, show focused element
cmux browser surface:5 snapshot --interactive --compact --cursor

# Scope to a section
cmux browser surface:5 snapshot --selector ".main-content" --max-depth 3
```

### Screenshots

```bash
cmux browser surface:5 screenshot --out /tmp/page.png
cmux browser surface:5 screenshot --json   # base64 output
```

### Waiting for Conditions

Block until a condition is met before proceeding:

```bash
cmux browser surface:5 wait --selector ".loaded"
cmux browser surface:5 wait --text "Success"
cmux browser surface:5 wait --url-contains "/dashboard"
cmux browser surface:5 wait --load-state networkidle
cmux browser surface:5 wait --function "() => document.readyState === 'complete'"
cmux browser surface:5 wait --selector ".content" --timeout 10
```

### Clicking / Hovering / Focusing

```bash
cmux browser surface:5 click "button#submit"
cmux browser surface:5 click ".load-more" --snapshot-after
cmux browser surface:5 dblclick ".editable"
cmux browser surface:5 hover "nav .dropdown"
cmux browser surface:5 focus "input#email"
cmux browser surface:5 scroll-into-view "#footer"
```

### Typing and Filling Forms

```bash
# type simulates keystrokes; fill replaces the value
cmux browser surface:5 type "input#search" "query text"
cmux browser surface:5 fill "input[name='email']" "user@example.com"
cmux browser surface:5 fill "input#name" ""   # clear field

# Press keys
cmux browser surface:5 press Enter
cmux browser surface:5 press Escape
```

### Checkboxes, Selects, Scrolling

```bash
cmux browser surface:5 check "input[type='checkbox']#terms"
cmux browser surface:5 uncheck "#newsletter"
cmux browser surface:5 select "select#country" "US"
cmux browser surface:5 scroll --dy 500
cmux browser surface:5 scroll --selector ".scrollable" --dy 200
```

### Extracting Data

```bash
cmux browser surface:5 get title
cmux browser surface:5 get url
cmux browser surface:5 get text "h1"
cmux browser surface:5 get html "#content"
cmux browser surface:5 get value "input[name='email']"
cmux browser surface:5 get attr "a.primary" --attr href
cmux browser surface:5 get count ".item"
cmux browser surface:5 get box ".element"
cmux browser surface:5 get styles ".button" --property color
```

### Element State Checks

```bash
cmux browser surface:5 is visible ".modal"
cmux browser surface:5 is enabled "button#submit"
cmux browser surface:5 is checked "input#terms"
```

### Finding Elements

```bash
cmux browser surface:5 find role button --name "Submit"
cmux browser surface:5 find text "Click here" --exact
cmux browser surface:5 find label "Email"
cmux browser surface:5 find placeholder "Enter your name"
cmux browser surface:5 find testid "save-btn"
cmux browser surface:5 find first ".item"
cmux browser surface:5 find last ".item"
cmux browser surface:5 find nth --index 2 --selector "li"
```

### JavaScript Evaluation

```bash
cmux browser surface:5 eval "document.title"
cmux browser surface:5 eval "Array.from(document.querySelectorAll('a')).map(a => a.href)"
cmux browser surface:5 eval --script "window.location.href"
```

### Script and Style Injection

```bash
cmux browser surface:5 addinitscript "window.__cmuxReady = true;"   # runs on every page load
cmux browser surface:5 addscript "document.querySelector('#ad')?.remove()"
cmux browser surface:5 addstyle "body { background: #f0f0f0; }"
```

### Iframes

```bash
cmux browser surface:5 frame "iframe#content"    # enter iframe context
cmux browser surface:5 frame main                # back to top-level document
```

### Dialogs

```bash
cmux browser surface:5 dialog accept
cmux browser surface:5 dialog accept "Confirmed"
cmux browser surface:5 dialog dismiss
```

### Downloads

```bash
cmux browser surface:5 download --path ~/Downloads/file.pdf --timeout 30
```

### Cookies and Storage

```bash
# Cookies
cmux browser surface:5 cookies get
cmux browser surface:5 cookies get --name session_id
cmux browser surface:5 cookies set session_id abc123 --domain example.com --path /
cmux browser surface:5 cookies clear --name session_id
cmux browser surface:5 cookies clear --all

# Local/session storage
cmux browser surface:5 storage local set theme dark
cmux browser surface:5 storage local get theme
cmux browser surface:5 storage session set flow onboarding
cmux browser surface:5 storage session get flow
```

### Browser State (Save/Restore)

```bash
cmux browser surface:5 state save /tmp/session.json
cmux browser surface:5 state load /tmp/session.json
```

### Browser Tabs

```bash
cmux browser surface:5 tab list
cmux browser surface:5 tab new https://example.com/pricing
cmux browser surface:5 tab switch 1
cmux browser surface:5 tab close
```

### Console and Errors

```bash
cmux browser surface:5 console list    # view console output
cmux browser surface:5 console clear
cmux browser surface:5 errors list     # view JS errors
cmux browser surface:5 errors clear
```

### Visual Debugging

```bash
cmux browser surface:5 highlight ".submit-button"
```

### Common Browser Workflows

#### Verify Dev Server UI

```bash
# 1. Start dev server in a split
cmux new-split down
cmux send --surface surface:NEW "npm run dev" && cmux send-key --surface surface:NEW "Return"

# 2. Open browser next to terminal
cmux browser open http://localhost:3000

# 3. Wait for it to load
cmux browser surface:BROWSER wait --load-state networkidle --timeout 15

# 4. Inspect the page
cmux browser surface:BROWSER snapshot --interactive --compact
cmux browser surface:BROWSER get title
cmux browser surface:BROWSER screenshot --out /tmp/homepage.png
```

#### Fill and Submit a Form

```bash
cmux browser surface:5 fill "input[name='email']" "test@example.com"
cmux browser surface:5 fill "input[name='password']" "secret123"
cmux browser surface:5 click "button[type='submit']" --snapshot-after
cmux browser surface:5 wait --text "Welcome"
```

## Markdown Viewer

cmux can open Markdown files in a **formatted viewer panel** with live file watching. The viewer automatically refreshes when the file changes on disk — useful for READMEs, notes, and docs.

```bash
# Open a markdown file in a formatted viewer panel
cmux markdown open README.md
cmux markdown open /path/to/notes.md

# Shorthand (open is the default subcommand)
cmux markdown README.md
```

The markdown panel:
- Renders Markdown with formatting (headings, code blocks, lists, etc.)
- **Live-reloads** when the file is saved/changed on disk
- Opens as a panel alongside your terminal, not a separate window

### Use Cases

- View project README while working
- Monitor a log/notes file that gets updated by a script
- Preview Obsidian-style daily notes while editing

## Tree (Layout Inspection)

The `tree` command shows a visual hierarchy of the entire cmux layout. **Always run this before creating new panes** to understand what already exists and get surface/pane refs.

```bash
# Tree of current workspace
cmux tree

# Tree of ALL workspaces across all windows
cmux tree --all

# Tree of a specific workspace
cmux tree --workspace workspace:2
```

Output shows the full hierarchy: Window → Workspace → Pane → Surface, with refs you can use in other commands.

## Find Window

Search across all windows and workspaces by content:

```bash
# Search for a window/workspace by name or content
cmux find-window "my-project"

# Search terminal content (scrollback) across all panes
cmux find-window --content "error: connection refused"

# Search and auto-select (focus) the matching workspace
cmux find-window --select "redis-migration"
```

This is useful when you have many workspaces open and need to quickly locate one by what's running in it or what's visible on screen.
