# CLAUDE.md

## What this repo is

Personal dotfiles and workspace configuration for macOS/Linux. Managed with GNU Stow — each top-level directory is a stow package that symlinks into `$HOME`.

## Key conventions

- **Stow packages** map 1:1 to config targets. The directory structure inside each package mirrors `$HOME`. For example, `ghostty/.config/ghostty/config` symlinks to `~/.config/ghostty/config`.
- **No secrets in the repo.** API keys and tokens go in `~/.secrets` (gitignored). Shell configs source it via `[ -f ~/.secrets ] && source ~/.secrets`.
- **`secrets.template`** is the committed version with empty values. `~/.secrets` is the local copy with real values.
- **`ssh/config.template`** uses `__PLACEHOLDER__` patterns for IPs. It's copied (not symlinked) to `~/.ssh/config`.
- **Cursor settings** are symlinked from `cursor/settings.json` into `~/Library/Application Support/Cursor/User/` by the install script (not stow, since the path has spaces).

## Shell config loading order

- `.zshenv` — runs for ALL zsh sessions (SSH, scripts, interactive). Contains PATH setup (brew, ~/.local/bin, bun, dotnet) and sources `~/.secrets`.
- `.zprofile` — login shells only. Aliases and light interactive setup.
- `.zshrc` — interactive shells. oh-my-zsh, plugins, completions, keybindings, functions.

## Auto-sync

`bin/workspace-sync` is a background service (launchd on macOS, systemd on Linux) that runs every 15 minutes. It auto-commits, pulls with rebase, and pushes. Conflicts trigger a macOS notification and a red terminal banner (via `.zshrc` hook checking `~/.workspace-sync-conflict`).

## install.sh

Interactive bootstrap script. Idempotent — safe to re-run. Supports `--dry-run` and `--yes` flags. Handles:
1. Secrets detection and migration from shell configs
2. Homebrew + Brewfile
3. Stow with conflict resolution (backs up to `~/.dotfiles-backup/`)
4. oh-my-zsh, tpm, nvm, bun
5. Claude Code, pi
6. Cursor settings + extensions
7. SSH config, secrets template
8. macOS defaults
9. workspace-sync service

## Per-machine config (.local.conf)

Copy `.local.conf.example` to `.local.conf` to customize what `install.sh` runs on this machine. The file is gitignored and won't sync. It uses bash arrays and is sourced automatically. Supports `skip_*` (exclude) and `only_*` (allowlist) for sections, brew formulae, casks, taps, stow packages, and cursor extensions. `only_*` takes precedence over `skip_*` when both are set. CLI `--skip` flags merge with `skip_sections`.

## When editing configs

Since stow creates symlinks, editing `~/.zshrc` (or any stowed file) directly edits the repo copy. The auto-sync service will commit and push the change within 15 minutes, or run `workspace-sync` manually.

## Adding a new config

1. Create a new directory: `mkdir -p newpkg/.config/tool/`
2. Add the config file inside it, mirroring the `$HOME` path
3. Run `stow newpkg` to create the symlink
4. Add the package name to `STOW_PACKAGES` in `install.sh`
