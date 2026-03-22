# my-workspace

Dotfiles and workspace configuration managed with [GNU Stow](https://www.gnu.org/software/stow/). Clone on any Mac or Linux machine, run the bootstrap script, and everything is symlinked and ready.

## Quick start

```bash
# Clone
gh repo clone jrmeland/my-workspace ~/source/my-workspace

# Bootstrap (interactive — prompts before each step)
cd ~/source/my-workspace
./install.sh

# Or preview what it would do
./install.sh --dry-run

# Or accept everything
./install.sh --yes
```

## What's included

### Stow packages

Each directory is a [stow package](https://www.gnu.org/software/stow/) that symlinks into `$HOME`:

| Package | What it links |
|---------|--------------|
| `zsh/` | `.zshrc`, `.zprofile`, `.zshenv` |
| `git/` | `.gitconfig` |
| `tmux/` | `.tmux.conf` (prefix=C-a, tpm, resurrect, extended-keys) |
| `ghostty/` | `.config/ghostty/config` |
| `nvim/` | `.config/nvim/` (LazyVim) |
| `sesh/` | `.config/sesh/sesh.toml` |
| `tmuxinator/` | `.config/tmuxinator/` |
| `claude/` | `.claude/` settings, agents, commands, skills |
| `pi/` | `.pi/agent/` settings and extensions |

### Other configs

| Path | Purpose |
|------|---------|
| `cursor/` | Cursor settings.json + extensions list (symlinked by install script) |
| `ssh/config.template` | SSH config with placeholder IPs (copied, not symlinked) |
| `secrets.template` | Template for `~/.secrets` (API keys — never committed) |
| `Brewfile` | Declarative Homebrew installs |
| `macos-defaults.sh` | macOS system prefs (Caps Lock→Ctrl, Dock, Finder, keyboard) |

## Auto-sync

The repo includes a background sync service that runs every 15 minutes:

```bash
# Install the service
~/source/my-workspace/bin/workspace-sync --install

# Check status
~/source/my-workspace/bin/workspace-sync --status

# Run manually
~/source/my-workspace/bin/workspace-sync

# Remove the service
~/source/my-workspace/bin/workspace-sync --uninstall
```

The sync service auto-commits local changes, pulls with rebase, and pushes. On conflict, it sends a macOS/Linux notification and shows a red banner on your next terminal open.

## Secrets

API keys live in `~/.secrets` (gitignored, never committed). The install script detects keys in shell configs and offers to migrate them automatically.

```bash
# Create from template
cp secrets.template ~/.secrets
chmod 600 ~/.secrets
# Fill in your keys
```

## Manual stow usage

```bash
cd ~/source/my-workspace

# Link a single package
stow zsh

# Re-link (idempotent)
stow --restow zsh

# Unlink
stow -D zsh
```
