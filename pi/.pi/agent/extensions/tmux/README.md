# Tmux Extension for pi

Gives the LLM native access to tmux sessions — locally or over SSH. The agent can create sessions, run commands, monitor output, split panes, and manage windows, making it ideal for long-running processes, multi-terminal workflows, and remote server work.

## Usage

The extension is auto-discovered from `~/.pi/agent/extensions/tmux/`.

```bash
# Local tmux (auto-discovered, no flags needed)
pi

# Remote tmux via SSH
pi --tmux-ssh user@host
```

Or test it directly:

```bash
pi -e ~/.pi/agent/extensions/tmux
```

## Requirements

- **tmux** installed locally (or on the remote host)
- For SSH mode: key-based auth configured (no password prompts)

## Tools

| Tool | Description |
|------|-------------|
| `tmux_start` | Create a new tmux session (or report if it exists) |
| `tmux_send` | Send text and/or special keys to a pane |
| `tmux_read` | Capture pane content (visible or scrollback), with optional wait |
| `tmux_list` | List sessions, windows, or panes |
| `tmux_new_window` | Create a new window in a session |
| `tmux_split` | Split a pane horizontally or vertically |
| `tmux_kill` | Kill a session, window, or pane |
| `tmux_resize` | Resize a pane |
| `tmux_select` | Focus a window or pane |

## Target Format

Tmux tools use the standard tmux target format: `session:window.pane`

- `main` — session named "main"
- `main:0` — window 0 in session "main"
- `main:0.0` — pane 0 of window 0 in session "main"

Use `tmux_list` to discover available targets.

## Typical Workflow

The agent prefers **panes over windows** — splitting within a session so you can see everything at a glance, rather than creating separate windows you have to switch between.

```
1. tmux_start(session_name="dev")           → Creates the session (50k scrollback)
2. tmux_send(target="dev:0.0", text="npm run dev")  → Starts dev server
3. tmux_read(target="dev:0.0", wait_ms=2000)        → Wait 2s, then check output
4. tmux_split(target="dev:0.0", direction="horizontal")  → Side-by-side pane
5. tmux_send(target="dev:0.1", text="npm test")     → Run tests in new pane
6. tmux_read(target="dev:0.1", wait_ms=5000)        → Wait 5s for tests, then read
7. tmux_split(target="dev:0.1", direction="vertical")    → Stack another pane below
8. tmux_send(target="dev:0.2", text="tail -f app.log")  → Monitor logs in third pane
```

## Sending Keys

The `tmux_send` tool has two input modes:

- **`text`** — Sent literally (like typing). Enter is sent automatically by default.
- **`keys`** — Tmux key names (e.g. `C-c`, `Enter`, `Up`, `Escape`). Not literal.

Both can be combined in a single call (text first, then keys).

Examples:
```
# Run a command (enter=true by default)
tmux_send(target="main:0.0", text="ls -la")

# Interrupt a running process
tmux_send(target="main:0.0", keys="C-c")

# Type text without pressing Enter
tmux_send(target="main:0.0", text="partial", enter=false)

# Navigate shell history
tmux_send(target="main:0.0", keys="Up Up Enter")
```

**Design note:** Text and Enter are sent as separate tmux commands. This is a lesson learned from the community — combining them in a single `send-keys` call is unreliable.

## Reading Output

```
# Visible pane content only (default)
tmux_read(target="main:0.0")

# Wait for output to settle after a command
tmux_read(target="main:0.0", wait_ms=2000)

# Include scrollback history (last 500 lines)
tmux_read(target="main:0.0", start_line=-500)
```

Output is automatically truncated to 50KB / 2000 lines to stay within LLM context limits.

The `wait_ms` parameter is important — after `tmux_send`, output doesn't appear instantly. Typical values:
- Fast commands (ls, echo): 500ms
- Builds/tests: 3000-10000ms
- Server startup: 2000-5000ms

## Session Design

New sessions are created with a 50,000-line scrollback buffer so output history isn't lost.

**Name sessions descriptively** — e.g. `dev-server`, `test-runner`, `db-migrations`. This helps the LLM (and you) track what's running where.

## Command

`/tmux` — Show extension status and list active tmux sessions.

## SSH Mode

With `--tmux-ssh user@host`, all tmux commands are routed through SSH. The agent is instructed to create tmux sessions on the remote host — not locally. The extension verifies connectivity and tmux availability on startup. Requires passwordless SSH (key-based auth).

## Design Decisions & Community Patterns

This extension is informed by patterns from the AI+tmux community:

- **Separate text from Enter** — `send-keys -l` for literal text, then `send-keys Enter` separately. Combining them is a known reliability issue.
- **Wait before reading** — `wait_ms` parameter on `tmux_read` because output doesn't appear instantly after `send-keys`.
- **Large scrollback** — 50k lines on new sessions, matching recommendations from Claude Code users.
- **Truncation** — Output is capped at 50KB/2000 lines using pi's built-in truncation to avoid context overflow.
- **Descriptive naming** — System prompt guides the LLM to name sessions meaningfully.

See also: [TmuxAI](https://github.com/alvinunreal/tmuxai), [Agent Deck](https://github.com/asheshgoplani/agent-deck), [Corral](https://github.com/cdknorow/corral), [vaayne/agent-kit tmux skill](https://github.com/vaayne/agent-kit).
