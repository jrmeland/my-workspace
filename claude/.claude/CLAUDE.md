# Global Claude Code Instructions

## cmux Detection

If the environment variable `CMUX_WORKSPACE_ID` is set, you are running inside cmux. Never block the current pane with long-running processes — use `cmux new-split` to spawn them in separate panes instead.

- If `CMUX_SOCKET_PATH` contains a `:` (TCP address like `127.0.0.1:64134`), this is a **remote** session. Load the **cmux-remote** skill. Use `cmux rpc system.tree` to see the layout.
- Otherwise, this is a **local** session. Load the **cmux** skill. Run `cmux tree` at the start to see the current layout.
