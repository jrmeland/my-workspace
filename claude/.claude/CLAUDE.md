# Global Claude Code Instructions

## cmux Detection

If the environment variable `CMUX_WORKSPACE_ID` is set, you are running inside cmux. Load the cmux skill and follow its instructions. Never block the current pane with long-running processes — use `cmux new-split` to spawn them in separate panes instead. Run `cmux tree` at the start to see the current layout.
