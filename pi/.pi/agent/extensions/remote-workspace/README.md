# Remote Workspace Extension

Transparently proxies pi's file and command tools to a remote machine via SSH.
Pi stays local (full cmux integration), but all operations execute remotely.

## Usage

```bash
# Full remote spec
pi --remote josh@JoshsMacStudio:~/source/Sage

# Saved alias (from hosts.json)
pi --remote shire

# Normal local mode (no flag)
pi
```

## What Gets Proxied

| Tool | Behavior in Remote Mode |
|------|------------------------|
| `read` | `ssh cat` on remote |
| `write` | Pipes content via `base64` to remote |
| `edit` | Reads remote, applies patch, writes back |
| `bash` | `ssh` exec on remote (with CWD mapping) |
| `!` commands | Execute on remote |
| `grep/find/ls` | **Disabled** — use `bash` with `rg`/`find`/`ls` |

## What Stays Local

- cmux tools: sidebar status, notifications, progress, browser, tmux
- web_search, subagent, and other non-filesystem tools
- The pi agent itself

## Host Configuration

Edit `~/.pi/agent/extensions/remote-workspace/hosts.json`:

```json
{
  "shire": {
    "host": "JoshsMacStudio",
    "user": "josh",
    "path": "~/source/Sage"
  },
  "dev-server": {
    "host": "dev.example.com",
    "user": "josh",
    "path": "/home/josh/project",
    "port": 22
  }
}
```

## Connection Resilience

- **SSH ControlMaster** keeps a persistent connection (no per-command handshake)
- **ControlPersist=3600** keeps the socket alive 1 hour after last use
- **Automatic retry** on transient connection failures
- **Pi stays alive** if SSH drops — tools error until reconnected
- `/remote-reconnect` command to re-establish the connection

## Remote Terminal (Persistent Processes)

For long-running processes, the `remote_terminal` tool creates a cmux pane
automatically connected to the remote machine via mosh + tmux:

```
# Agent calls:
remote_terminal(direction: "right", command: "make dev", persistent: true)

# Result: cmux surface:5 → mosh → remote tmux → running make dev
# Then interact with:
cmux send --surface surface:5 "new command"
cmux read-screen --surface surface:5
```

Processes in remote terminals survive network disconnects (tmux persistence)
and reconnect automatically (mosh resilience).

## Commands

- `/remote` — Show connection status
- `/remote-reconnect` — Re-establish SSH after a disconnect

## Architecture

```
cmux (local Mac)
├── pi agent (local — full cmux UI)
│   └── remote-workspace extension
│       ├── Read/Edit/Write → SSH ControlMaster → remote files
│       └── Bash → SSH exec → remote shell
│
├── cmux sidebar ← pi updates natively
│   ├── 🔗 Connection status
│   ├── 📊 Progress bars
│   └── 🔔 Notifications
│
└── mosh pane → remote tmux (for interactive/persistent processes)
```

## Requirements

- SSH key-based auth configured for the remote host
- `bash` available on the remote machine
- `base64` command available on the remote machine
