#!/usr/bin/env bash
# my-workspace bootstrap — interactive, idempotent CLI.
# Works on macOS and Linux.
#
# Usage:
#   ./install.sh                        # interactive (all sections)
#   ./install.sh --yes                  # auto-accept all prompts
#   ./install.sh --dry-run              # preview without changes
#   ./install.sh stow nvm claude        # run only these sections
#   ./install.sh --skip brew --skip cursor  # run all except these
#   ./install.sh --list                 # show available sections
#
# Sections:
#   preflight, brew, stow, omz, tpm, nvm, bun,
#   claude, pi, cursor, ssh, secrets, macos, sync

set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Temp file cleanup
TMPFILES=()
cleanup() {
  for f in "${TMPFILES[@]+"${TMPFILES[@]}"}"; do
    rm -f "$f"
  done
}
trap cleanup EXIT
OS="$(uname)"

# ── All available sections (in order) ────────────────────────────────────────

ALL_SECTIONS=(preflight brew stow omz tpm nvm bun claude pi cursor ssh secrets macos sync)

# ── Flag parsing ──────────────────────────────────────────────────────────────

DRY_RUN=false
AUTO_YES=false
ONLY_SECTIONS=()
SKIP_SECTIONS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --yes)     AUTO_YES=true; shift ;;
    --skip)
      [[ -z "${2:-}" ]] && { echo "Error: --skip requires a section name"; exit 1; }
      SKIP_SECTIONS+=("$2"); shift 2
      ;;
    --list)
      echo "Available sections:"
      for s in "${ALL_SECTIONS[@]}"; do
        printf "  %s\n" "$s"
      done
      exit 0
      ;;
    --help|-h)
      echo "Usage: ./install.sh [flags] [section ...]"
      echo ""
      echo "Flags:"
      echo "  --yes                Auto-accept all prompts"
      echo "  --dry-run            Show what would happen without making changes"
      echo "  --skip <section>     Skip a section (can be repeated)"
      echo "  --list               Show available sections"
      echo ""
      echo "Sections: ${ALL_SECTIONS[*]}"
      echo ""
      echo "Examples:"
      echo "  ./install.sh                          # interactive, all sections"
      echo "  ./install.sh stow nvm claude          # only these sections"
      echo "  ./install.sh --yes --skip brew        # all except brew, auto-accept"
      echo "  ./install.sh --yes --skip brew --skip cursor  # skip multiple"
      echo ""
      echo "Per-machine config: copy .local.conf.example to .local.conf"
      exit 0
      ;;
    -*)
      echo "Unknown flag: $1 (try --help)"
      exit 1
      ;;
    *)
      ONLY_SECTIONS+=("$1"); shift
      ;;
  esac
done

# Validate section names
for s in "${ONLY_SECTIONS[@]+"${ONLY_SECTIONS[@]}"}" "${SKIP_SECTIONS[@]+"${SKIP_SECTIONS[@]}"}"; do
  found=false
  for valid in "${ALL_SECTIONS[@]}"; do
    [[ "$s" == "$valid" ]] && found=true
  done
  if ! $found; then
    echo "Unknown section: $s"
    echo "Available: ${ALL_SECTIONS[*]}"
    exit 1
  fi
done

# ── Per-machine config (.local.conf) ─────────────────────────────────────────

# Initialize filter arrays (overridden by .local.conf if present)
skip_sections=()
only_sections=()
skip_brew=()
only_brew=()
skip_casks=()
only_casks=()
skip_taps=()
only_taps=()
skip_stow=()
only_stow=()
skip_cursor_extensions=()
only_cursor_extensions=()

LOCAL_CONF="$DOTFILES_DIR/.local.conf"
if [[ -f "$LOCAL_CONF" ]]; then
  # shellcheck source=/dev/null
  source "$LOCAL_CONF"

  # Merge config skip_sections with CLI --skip flags
  for s in "${skip_sections[@]+"${skip_sections[@]}"}"; do
    SKIP_SECTIONS+=("$s")
  done

  # Merge config only_sections with CLI positional args
  # .local.conf only_sections is used when no CLI positional sections are given.
  if [[ ${#ONLY_SECTIONS[@]} -eq 0 && ${#only_sections[@]} -gt 0 ]]; then
    for s in "${only_sections[@]}"; do
      ONLY_SECTIONS+=("$s")
    done
  fi
fi

# Should this section run?
should_run() {
  local section="$1"
  # If --skip was used, skip it
  for s in "${SKIP_SECTIONS[@]+"${SKIP_SECTIONS[@]}"}"; do
    [[ "$s" == "$section" ]] && return 1
  done
  # If specific sections were requested, only run those
  if [[ ${#ONLY_SECTIONS[@]} -gt 0 ]]; then
    for s in "${ONLY_SECTIONS[@]}"; do
      [[ "$s" == "$section" ]] && return 0
    done
    return 1
  fi
  return 0
}

# ── Item filter helpers ──────────────────────────────────────────────────────

# Check if an item is in a list
_in_list() {
  local item="$1"; shift
  for i in "$@"; do
    [[ "$i" == "$item" ]] && return 0
  done
  return 1
}

# Check if an item should be included based on skip_*/only_* arrays.
# Usage: item_included <item> <category>
# Categories: brew, casks, taps, stow, cursor_extensions
item_included() {
  local item="$1"
  local category="$2"

  local only_var="only_${category}[@]"
  local skip_var="skip_${category}[@]"
  local only_items=("${!only_var+"${!only_var}"}")
  local skip_items=("${!skip_var+"${!skip_var}"}")

  # only_* takes precedence: item must be in the list
  if [[ ${#only_items[@]} -gt 0 ]]; then
    _in_list "$item" "${only_items[@]}" && return 0
    return 1
  fi

  # Otherwise check skip_* list
  if [[ ${#skip_items[@]} -gt 0 ]]; then
    _in_list "$item" "${skip_items[@]}" && return 1
  fi

  return 0
}

# Generate a filtered Brewfile, returns path to temp file.
generate_filtered_brewfile() {
  local src="$1"
  local tmpfile
  tmpfile="$(mktemp "${TMPDIR:-/tmp}/Brewfile.XXXXXX")"
  TMPFILES+=("$tmpfile")

  while IFS= read -r line; do
    # Pass through empty lines and comments
    if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
      echo "$line" >> "$tmpfile"
      continue
    fi

    if [[ "$line" =~ ^tap[[:space:]]+\"([^\"]+)\" ]]; then
      item_included "${BASH_REMATCH[1]}" "taps" && echo "$line" >> "$tmpfile"
    elif [[ "$line" =~ ^brew[[:space:]]+\"([^\"]+)\" ]]; then
      item_included "${BASH_REMATCH[1]}" "brew" && echo "$line" >> "$tmpfile"
    elif [[ "$line" =~ ^cask[[:space:]]+\"([^\"]+)\" ]]; then
      item_included "${BASH_REMATCH[1]}" "casks" && echo "$line" >> "$tmpfile"
    else
      echo "$line" >> "$tmpfile"
    fi
  done < "$src"

  echo "$tmpfile"
}

# ── UI helpers ────────────────────────────────────────────────────────────────

BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
RED='\033[31m'
CYAN='\033[36m'
MAGENTA='\033[35m'

info()  { printf "${BLUE}  ▸${RESET} %s\n" "$1"; }
ok()    { printf "${GREEN}  ✓${RESET} %s\n" "$1"; }
warn()  { printf "${YELLOW}  !${RESET} %s\n" "$1"; }
err()   { printf "${RED}  ✗${RESET} %s\n" "$1"; }
skip()  { printf "${DIM}  ○ %s (skipped)${RESET}\n" "$1"; }
dry()   { printf "${MAGENTA}  ~ %s (dry run)${RESET}\n" "$1"; }

header() {
  echo ""
  printf "${BOLD}${CYAN}━━ %s ${RESET}\n" "$1"
}

# Prompt yes/no — returns 0 for yes, 1 for no.
# --yes mode: always returns 0.
# --dry-run mode: always returns 0 (so we walk through all branches).
ask() {
  if $AUTO_YES || $DRY_RUN; then
    return 0
  fi
  local prompt="$1"
  local default="${2:-y}"
  local hint="[Y/n]"
  [[ "$default" == "n" ]] && hint="[y/N]"

  printf "${BOLD}  ? ${RESET}%s %s " "$prompt" "$hint"
  read -r answer
  answer="${answer:-$default}"
  [[ "$answer" == [yY] ]]
}

# Run a command, or print it in dry-run mode.
run() {
  if $DRY_RUN; then
    dry "would run: $*"
    return 0
  fi
  "$@"
}

# ── Conflict resolution ──────────────────────────────────────────────────────

# Back up a file to ~/.dotfiles-backup/<timestamp>/
BACKUP_DIR="$HOME/.dotfiles-backup/$(date +%Y%m%d-%H%M%S)"
backup_file() {
  local file="$1"
  if [[ -e "$file" || -L "$file" ]]; then
    if $DRY_RUN; then
      dry "would back up $file"
      return
    fi
    mkdir -p "$BACKUP_DIR"
    local rel="${file#$HOME/}"
    local dest="$BACKUP_DIR/$rel"
    mkdir -p "$(dirname "$dest")"
    mv "$file" "$dest"
    info "Backed up → ~/.dotfiles-backup/.../$rel"
  fi
}

# Resolve a stow conflict: ask user what to do, return 0 if we should proceed.
resolve_stow_conflict() {
  local pkg="$1"

  # Dry-run stow to detect conflicts (filter benign simulation warning)
  local stow_output
  stow_output="$(stow --dir="$DOTFILES_DIR" --target="$HOME" --no --restow "$pkg" 2>&1 || true)"
  stow_output="$(echo "$stow_output" | grep -v "^WARNING: in simulation mode" | grep -v "^$" || true)"

  if [[ -z "$stow_output" ]]; then
    return 0  # No conflicts
  fi

  # Find conflicting files by walking the package directory.
  # This is more reliable than parsing stow's varying output formats.
  local conflicting_files=()
  while IFS= read -r repo_file; do
    local rel="${repo_file#$DOTFILES_DIR/$pkg/}"
    local target="$HOME/$rel"
    # Conflict = target exists and is NOT already a stow-managed symlink for this package
    if [[ -e "$target" || -L "$target" ]]; then
      if [[ -L "$target" ]]; then
        local link_target
        link_target="$(readlink "$target")"
        # Already linked to our package — not a conflict
        [[ "$link_target" == *"$pkg/$rel"* ]] && continue
      fi
      conflicting_files+=("$target")
    fi
  done < <(find "$DOTFILES_DIR/$pkg" -type f -not -name '.DS_Store')

  if [[ ${#conflicting_files[@]} -eq 0 ]]; then
    # Stow reported something but we found no file-level conflicts
    warn "Stow conflict for '$pkg':"
    while IFS= read -r line; do
      [[ -n "$line" ]] && printf "    ${DIM}%s${RESET}\n" "$line"
    done <<< "$stow_output"

    if ask "Back up existing files and override?"; then
      if $DRY_RUN; then
        dry "would adopt + restow $pkg"
        return 0
      fi
      stow --dir="$DOTFILES_DIR" --target="$HOME" --adopt --restow "$pkg" 2>/dev/null
      cd "$DOTFILES_DIR" && git checkout -- "$pkg/" 2>/dev/null || true
      return 0
    fi
    return 1
  fi

  warn "Stow conflict for '$pkg' — these files already exist:"
  for f in "${conflicting_files[@]}"; do
    printf "    ${DIM}%s${RESET}\n" "$f"
  done

  # Interactive loop: diff / yes / no
  while true; do
    if $AUTO_YES || $DRY_RUN; then
      # In auto/dry-run mode, proceed without prompting
      break
    fi

    printf "${BOLD}  ? ${RESET}%s %s " "Back up and override?" "[y/n/d=diff]"
    read -r answer
    answer="${answer:-y}"

    case "$answer" in
      [dD])
        # Show diff for each conflicting file: existing (local) vs repo
        for f in "${conflicting_files[@]}"; do
          local rel="${f#$HOME/}"
          local repo_file="$DOTFILES_DIR/$pkg/$rel"
          echo ""
          printf "    ${BOLD}── %s ──${RESET}\n" "$rel"
          if [[ -f "$repo_file" && -f "$f" ]]; then
            diff --color=always -u "$f" "$repo_file" 2>/dev/null | while IFS= read -r diffline; do
              printf "    %s\n" "$diffline"
            done
            if [[ ${PIPESTATUS[0]} -eq 0 ]]; then
              printf "    ${DIM}(identical)${RESET}\n"
            fi
          elif [[ ! -f "$f" ]]; then
            printf "    ${GREEN}+ new file from repo${RESET}\n"
          else
            printf "    ${DIM}(cannot diff — repo file not found at %s)${RESET}\n" "$repo_file"
          fi
        done
        echo ""
        # Loop back to prompt again
        ;;
      [yY])
        break
        ;;
      [nN])
        return 1
        ;;
      *)
        printf "    ${DIM}Enter y, n, or d${RESET}\n"
        ;;
    esac
  done

  for f in "${conflicting_files[@]}"; do
    backup_file "$f"
  done
  return 0
}

# ── Secrets scanner ───────────────────────────────────────────────────────────

SECRET_PATTERNS=(
  'export \w*API_KEY='
  'export \w*TOKEN='
  'export \w*SECRET='
  'export GH_PAT='
)

scan_secrets() {
  local file="$1"
  local found=()
  for pattern in "${SECRET_PATTERNS[@]}"; do
    while IFS= read -r line; do
      [[ "$line" == *'=""' ]] && continue
      [[ "$line" =~ ^[[:space:]]*# ]] && continue
      found+=("$line")
    done < <(grep -E "$pattern" "$file" 2>/dev/null || true)
  done
  # Deduplicate (same key may match multiple patterns)
  if [[ ${#found[@]} -gt 0 ]]; then
    printf '%s\n' "${found[@]}" | sort -u
  fi
}

migrate_secrets() {
  local file="$1"
  local secrets
  secrets="$(scan_secrets "$file")"

  if [[ -z "$secrets" ]]; then
    return
  fi

  echo ""
  warn "Found API keys/tokens in $file:"
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    local key val masked
    key="$(echo "$line" | cut -d= -f1 | sed 's/export //')"
    val="$(echo "$line" | cut -d= -f2- | tr -d '"' | tr -d "'")"
    if [[ ${#val} -gt 8 ]]; then
      masked="${val:0:4}...${val: -4}"
    else
      masked="****"
    fi
    printf "    ${DIM}%s=%s${RESET}\n" "$key" "$masked"
  done <<< "$secrets"

  if ask "Move these to ~/.secrets? (they'll be removed from $file)"; then
    if $DRY_RUN; then
      dry "would move secrets from $file to ~/.secrets"
      return
    fi

    # Ensure ~/.secrets exists
    if [[ ! -f "$HOME/.secrets" ]]; then
      cp "$DOTFILES_DIR/secrets.template" "$HOME/.secrets"
      chmod 600 "$HOME/.secrets"
    fi

    # Write each secret to ~/.secrets (upsert)
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      local key
      key="$(echo "$line" | cut -d= -f1 | sed 's/export //')"
      if grep -q "^export ${key}=" "$HOME/.secrets" 2>/dev/null; then
        # Update in place — use | as sed delimiter to avoid conflicts with values
        local escaped_line
        escaped_line="$(printf '%s' "$line" | sed 's|[&\]|\\&|g')"
        sed -i.bak "s|^export ${key}=.*|${escaped_line}|" "$HOME/.secrets"
        rm -f "$HOME/.secrets.bak"
      else
        echo "$line" >> "$HOME/.secrets"
      fi
    done <<< "$secrets"

    # Remove secrets from the original file
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      local key
      key="$(echo "$line" | cut -d= -f1 | sed 's/export //')"
      local tmpfile
      tmpfile="$(mktemp)"
      grep -v "^export ${key}=" "$file" > "$tmpfile" || true
      cp "$tmpfile" "$file"
      rm -f "$tmpfile"
    done <<< "$secrets"

    ok "Secrets moved to ~/.secrets"

    # Add source line if not already present
    if ! grep -q 'source ~/.secrets' "$file" 2>/dev/null; then
      echo "" >> "$file"
      echo "# Load secrets (API keys, tokens, etc.) — never commit this file" >> "$file"
      echo '[ -f ~/.secrets ] && source ~/.secrets' >> "$file"
      ok "Added 'source ~/.secrets' to $file"
    fi
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
#  Main
# ══════════════════════════════════════════════════════════════════════════════

echo ""
printf "${BOLD}${CYAN}"
cat << 'BANNER'
  ┌─────────────────────────────────────┐
  │  my-workspace  ·  bootstrap setup   │
  └─────────────────────────────────────┘
BANNER
printf "${RESET}"
echo ""
printf "  ${DIM}Repo:   %s${RESET}\n" "$DOTFILES_DIR"
printf "  ${DIM}Target: %s${RESET}\n" "$HOME"
printf "  ${DIM}OS:     %s${RESET}\n" "$OS"
$DRY_RUN && printf "  ${MAGENTA}${BOLD}Mode:   DRY RUN (no changes will be made)${RESET}\n"
[[ -f "$LOCAL_CONF" ]] && printf "  ${DIM}Config: .local.conf loaded${RESET}\n"
echo ""

# ── Pre-flight: scan for secrets in existing shell configs ────────────────────

if should_run preflight; then
  header "Pre-flight checks"

  for rc_file in "$HOME/.zprofile" "$HOME/.zshenv" "$HOME/.bashrc" "$HOME/.bash_profile"; do
    if [[ -f "$rc_file" ]]; then
      migrate_secrets "$rc_file"
    fi
  done
  ok "Pre-flight complete"
fi

# ── Homebrew + Brewfile ───────────────────────────────────────────────────────

if should_run brew; then
  header "Homebrew"

  if command -v brew &>/dev/null; then
    ok "Already installed ($(brew --version | head -1))"
  else
    if ask "Install Homebrew?"; then
      if $DRY_RUN; then
        dry "would install Homebrew"
      else
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        if [[ "$OS" == "Darwin" ]]; then
          eval "$(/opt/homebrew/bin/brew shellenv)"
        else
          eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
        fi
        ok "Homebrew installed"
      fi
    else
      skip "Homebrew"
    fi
  fi

  header "Brew packages"

  if command -v brew &>/dev/null; then
    # Use filtered Brewfile when local config has brew overrides
    brewfile="$DOTFILES_DIR/Brewfile"
    if [[ ${#skip_brew[@]} -gt 0 || ${#only_brew[@]} -gt 0 || \
          ${#skip_casks[@]} -gt 0 || ${#only_casks[@]} -gt 0 || \
          ${#skip_taps[@]} -gt 0 || ${#only_taps[@]} -gt 0 ]]; then
      brewfile="$(generate_filtered_brewfile "$DOTFILES_DIR/Brewfile")"
      info "Using filtered Brewfile (per .local.conf)"
    fi

    # Show diff between Brewfile and current state
    brew_diff_shown=false
    if ! $AUTO_YES; then
      missing_taps=()
      missing_brew=()
      missing_casks=()

      installed_taps="$(brew tap 2>/dev/null)"
      installed_brew="$(brew list --formula 2>/dev/null)"
      installed_casks="$(brew list --cask 2>/dev/null)"

      while IFS= read -r line; do
        if [[ "$line" =~ ^tap[[:space:]]+\"([^\"]+)\" ]]; then
          echo "$installed_taps" | grep -q "^${BASH_REMATCH[1]}$" || missing_taps+=("${BASH_REMATCH[1]}")
        elif [[ "$line" =~ ^brew[[:space:]]+\"([^\"]+)\" ]]; then
          short="${BASH_REMATCH[1]##*/}"
          echo "$installed_brew" | grep -q "^${short}$" || missing_brew+=("${BASH_REMATCH[1]}")
        elif [[ "$line" =~ ^cask[[:space:]]+\"([^\"]+)\" ]]; then
          echo "$installed_casks" | grep -q "^${BASH_REMATCH[1]}$" || missing_casks+=("${BASH_REMATCH[1]}")
        fi
      done < "$brewfile"

      total_missing=$(( ${#missing_taps[@]} + ${#missing_brew[@]} + ${#missing_casks[@]} ))

      if [[ $total_missing -eq 0 ]]; then
        info "Brewfile vs local: everything already installed"
      else
        info "Brewfile vs local: ${total_missing} item(s) to install"
        for t in "${missing_taps[@]+"${missing_taps[@]}"}"; do
          printf "    ${GREEN}+ tap${RESET}  %s\n" "$t"
        done
        for f in "${missing_brew[@]+"${missing_brew[@]}"}"; do
          printf "    ${GREEN}+ brew${RESET} %s\n" "$f"
        done
        for c in "${missing_casks[@]+"${missing_casks[@]}"}"; do
          printf "    ${GREEN}+ cask${RESET} %s\n" "$c"
        done
      fi

      # Check for outdated packages (quick check, no network)
      outdated="$(brew outdated --formula --quiet 2>/dev/null | head -10)"
      if [[ -n "$outdated" ]]; then
        outdated_count="$(echo "$outdated" | wc -l | tr -d ' ')"
        info "brew outdated: ${outdated_count} formula(e) have newer versions"
        while IFS= read -r pkg; do
          [[ -n "$pkg" ]] && printf "    ${YELLOW}↑${RESET} %s\n" "$pkg"
        done <<< "$outdated"
      fi
      brew_diff_shown=true
    fi

    if ask "Install/update packages from Brewfile?"; then
      if $DRY_RUN; then
        if brew bundle check --file="$brewfile" --verbose 2>/dev/null; then
          ok "All packages already installed"
        else
          dry "would install/update packages from Brewfile"
        fi
      else
        info "Running brew bundle (this may take a while)..."
        if [[ "$OS" == "Linux" ]]; then
          brew bundle --file="$brewfile" 2>&1 | grep -v "^Skipping" || true
        else
          brew bundle --file="$brewfile"
        fi
        ok "Brew packages up to date"
      fi
    else
      skip "Brew packages"
    fi
  else
    skip "Brew packages (Homebrew not installed)"
  fi
fi

# ── GNU Stow ─────────────────────────────────────────────────────────────────

if should_run stow; then
header "Stow configs"

STOW_PACKAGES=(zsh git tmux ghostty sesh tmuxinator nvim claude pi claude-cmux claude-pdf-form-fill claude-pub claude-push-notification claude-technical-discovery claude-tmux)

if ! command -v stow &>/dev/null; then
  if $DRY_RUN; then
    warn "GNU Stow not installed yet (would be installed via Brewfile)"
    for pkg in "${STOW_PACKAGES[@]}"; do
      [[ -d "$DOTFILES_DIR/$pkg" ]] && dry "would stow $pkg"
    done
  else
    err "GNU Stow not found — install it first (brew install stow)"
  fi
else
  for pkg in "${STOW_PACKAGES[@]}"; do
    if [[ ! -d "$DOTFILES_DIR/$pkg" ]]; then
      continue
    fi

    if ! item_included "$pkg" "stow"; then
      skip "$pkg (excluded by .local.conf)"
      continue
    fi

    # Check if already fully stowed (dry-run stow produces no output when clean)
    stow_check="$(stow --dir="$DOTFILES_DIR" --target="$HOME" --no --restow "$pkg" 2>&1 || true)"

    if [[ -z "$stow_check" ]]; then
      if $DRY_RUN; then
        ok "$pkg (already linked)"
      else
        stow --dir="$DOTFILES_DIR" --target="$HOME" --restow "$pkg" 2>/dev/null
        ok "$pkg (already linked)"
      fi
    else
      # Has conflicts
      if resolve_stow_conflict "$pkg"; then
        if $DRY_RUN; then
          dry "would stow $pkg"
        else
          stow --dir="$DOTFILES_DIR" --target="$HOME" --restow "$pkg" 2>/dev/null && \
            ok "$pkg" || err "Failed to stow $pkg"
        fi
      else
        skip "$pkg"
      fi
    fi
  done
fi
fi # stow

# ── Oh My Zsh ────────────────────────────────────────────────────────────────

if should_run omz; then
header "Oh My Zsh"

if [[ -d "$HOME/.oh-my-zsh" ]]; then
  ok "Already installed"
else
  if ask "Install Oh My Zsh?"; then
    if $DRY_RUN; then
      dry "would install Oh My Zsh"
    else
      sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended --keep-zshrc
      ok "Oh My Zsh installed"
    fi
  else
    skip "Oh My Zsh"
  fi
fi
fi # omz

# ── TPM ───────────────────────────────────────────────────────────────────────

if should_run tpm; then
header "Tmux Plugin Manager"

if [[ -d "$HOME/.tmux/plugins/tpm" ]]; then
  ok "Already installed"
else
  if ask "Install TPM?"; then
    if $DRY_RUN; then
      dry "would clone tmux-plugins/tpm"
    else
      git clone https://github.com/tmux-plugins/tpm "$HOME/.tmux/plugins/tpm"
      ok "TPM installed — run prefix+I in tmux to install plugins"
    fi
  else
    skip "TPM"
  fi
fi
fi # tpm

# ── nvm ───────────────────────────────────────────────────────────────────────

if should_run nvm; then
header "Node (nvm)"

if [[ -d "$HOME/.nvm" ]]; then
  # Ensure nvm is loaded in this session
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  ok "nvm already installed"

  # Ensure latest LTS is installed and active
  nvm_current="$(node --version 2>/dev/null || echo 'none')"
  nvm_latest_lts="$(nvm version-remote --lts 2>/dev/null || echo 'unknown')"

  if [[ "$nvm_current" != "$nvm_latest_lts" && "$nvm_latest_lts" != "unknown" ]]; then
    info "Current Node: $nvm_current — latest LTS: $nvm_latest_lts"
    if ask "Install latest LTS Node ($nvm_latest_lts)?"; then
      if $DRY_RUN; then
        dry "would install Node $nvm_latest_lts and set as default"
      else
        nvm install --lts
        nvm alias default "$(nvm version lts/*)"
        ok "Node $(nvm version lts/*) installed and pinned as default"
      fi
    else
      skip "Node LTS upgrade"
    fi
  else
    ok "Node $nvm_current (latest LTS)"
  fi
else
  if ask "Install nvm + latest LTS Node?"; then
    if $DRY_RUN; then
      dry "would install nvm + latest LTS Node"
    else
      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
      nvm install --lts
      nvm alias default "$(nvm version lts/*)"
      ok "nvm + Node $(nvm version lts/*) installed and pinned as default"
    fi
  else
    skip "nvm"
  fi
fi

# Ensure npm is available for the rest of the script
if ! command -v npm &>/dev/null; then
  if [[ -d "$HOME/.nvm" ]]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi
fi
fi # nvm

# ── bun ───────────────────────────────────────────────────────────────────────

if should_run bun; then
header "Bun"

if command -v bun &>/dev/null; then
  ok "Already installed ($(bun --version 2>/dev/null))"
else
  if ask "Install bun?"; then
    if $DRY_RUN; then
      dry "would install bun"
    else
      curl -fsSL https://bun.sh/install | bash
      ok "bun installed"
    fi
  else
    skip "bun"
  fi
fi
fi # bun

# ── Claude Code ───────────────────────────────────────────────────────────────

if should_run claude; then
header "Claude Code"

if command -v claude &>/dev/null; then
  ok "Already installed ($(claude --version 2>/dev/null || echo 'unknown'))"
else
  if ask "Install Claude Code?"; then
    if $DRY_RUN; then
      dry "would run: npm install -g @anthropic-ai/claude-code"
    else
      npm install -g @anthropic-ai/claude-code
      ok "Claude Code installed"
    fi
  else
    skip "Claude Code"
  fi
fi
fi # claude

# ── pi ────────────────────────────────────────────────────────────────────────

if should_run pi; then
header "pi"

if command -v pi &>/dev/null; then
  ok "Already installed ($(pi --version 2>/dev/null || echo 'unknown'))"
else
  if ask "Install pi?"; then
    if $DRY_RUN; then
      dry "would run: npm install -g @mariozechner/pi-coding-agent"
    else
      npm install -g @mariozechner/pi-coding-agent 2>/dev/null && ok "pi installed" || {
        err "Could not install pi — check the correct package name"
      }
    fi
  else
    skip "pi"
  fi
fi
fi # pi

# ── Cursor ────────────────────────────────────────────────────────────────────

if should_run cursor; then
header "Cursor"

if [[ "$OS" == "Darwin" ]]; then
  CURSOR_USER_DIR="$HOME/Library/Application Support/Cursor/User"
else
  CURSOR_USER_DIR="$HOME/.config/Cursor/User"
fi

# Settings
CURSOR_SETTINGS="$CURSOR_USER_DIR/settings.json"
if [[ -f "$DOTFILES_DIR/cursor/settings.json" ]]; then
  if [[ -L "$CURSOR_SETTINGS" ]] && [[ "$(readlink "$CURSOR_SETTINGS")" == "$DOTFILES_DIR/cursor/settings.json" ]]; then
    ok "Settings already linked"
  elif [[ -f "$CURSOR_SETTINGS" ]]; then
    warn "Cursor settings.json already exists"
    if ask "Override with repo version? (existing will be backed up)"; then
      if $DRY_RUN; then
        dry "would back up and link Cursor settings"
      else
        backup_file "$CURSOR_SETTINGS"
        mkdir -p "$CURSOR_USER_DIR"
        ln -sf "$DOTFILES_DIR/cursor/settings.json" "$CURSOR_SETTINGS"
        ok "Cursor settings linked"
      fi
    else
      skip "Cursor settings"
    fi
  else
    if $DRY_RUN; then
      dry "would link Cursor settings"
    else
      mkdir -p "$CURSOR_USER_DIR"
      ln -sf "$DOTFILES_DIR/cursor/settings.json" "$CURSOR_SETTINGS"
      ok "Cursor settings linked"
    fi
  fi
fi

# Extensions
if command -v cursor &>/dev/null && [[ -f "$DOTFILES_DIR/cursor/extensions.txt" ]]; then
  # Build filtered extension list
  filtered_exts=()
  while IFS= read -r ext; do
    [[ -z "$ext" ]] && continue
    item_included "$ext" "cursor_extensions" && filtered_exts+=("$ext")
  done < "$DOTFILES_DIR/cursor/extensions.txt"
  ext_count="${#filtered_exts[@]}"

  if [[ $ext_count -gt 0 ]] && ask "Install Cursor extensions? ($ext_count extensions)"; then
    if $DRY_RUN; then
      dry "would install $ext_count Cursor extensions"
    else
      installed_count=0
      for ext in "${filtered_exts[@]}"; do
        cursor --install-extension "$ext" --force 2>/dev/null && ((installed_count++)) || true
      done
      ok "$installed_count Cursor extensions installed"
    fi
  else
    skip "Cursor extensions"
  fi
else
  if ! command -v cursor &>/dev/null; then
    info "Cursor CLI not found — to install extensions later:"
    printf "    ${DIM}cat cursor/extensions.txt | xargs -L1 cursor --install-extension${RESET}\n"
  fi
fi
fi # cursor

# ── SSH config ────────────────────────────────────────────────────────────────

if should_run ssh; then
header "SSH config"

if [[ -f "$HOME/.ssh/config" ]]; then
  ok "~/.ssh/config already exists"
  if grep -q '__.*__' "$HOME/.ssh/config" 2>/dev/null; then
    warn "Contains placeholder IPs — edit ~/.ssh/config to fill them in"
  fi
else
  if ask "Create ~/.ssh/config from template?"; then
    if $DRY_RUN; then
      dry "would copy ssh/config.template → ~/.ssh/config"
    else
      mkdir -p "$HOME/.ssh"
      cp "$DOTFILES_DIR/ssh/config.template" "$HOME/.ssh/config"
      chmod 600 "$HOME/.ssh/config"
      warn "Edit ~/.ssh/config and fill in the __PLACEHOLDER__ IPs"
      ok "SSH config created"
    fi
  else
    skip "SSH config"
  fi
fi
fi # ssh

# ── Secrets ───────────────────────────────────────────────────────────────────

if should_run secrets; then
header "Secrets"

if [[ -f "$HOME/.secrets" ]]; then
  ok "~/.secrets already exists"
  filled="$(grep -cE '^export \w+=".+"' "$HOME/.secrets" 2>/dev/null | tail -1 || echo 0)"
  empty="$(grep -cE '^export \w+=""' "$HOME/.secrets" 2>/dev/null | tail -1 || echo 0)"
  if [[ "$empty" =~ ^[0-9]+$ && "$empty" -gt 0 ]]; then
    warn "$empty keys still empty in ~/.secrets — fill them in"
  fi
else
  if ask "Create ~/.secrets from template?"; then
    if $DRY_RUN; then
      dry "would create ~/.secrets from template"
    else
      cp "$DOTFILES_DIR/secrets.template" "$HOME/.secrets"
      chmod 600 "$HOME/.secrets"
      warn "Edit ~/.secrets and add your API keys"
      ok "~/.secrets created"
    fi
  else
    skip "~/.secrets"
  fi
fi
fi # secrets

# ── macOS defaults ────────────────────────────────────────────────────────────

if should_run macos && [[ "$OS" == "Darwin" ]]; then
  header "macOS defaults"

  if ask "Apply macOS defaults? (Dock, Finder, Caps Lock → Ctrl, etc.)"; then
    if $DRY_RUN; then
      dry "would apply macOS defaults (Caps Lock → Ctrl, Dock, Finder, keyboard, etc.)"
    else
      bash "$DOTFILES_DIR/macos-defaults.sh"
      ok "macOS defaults applied"
    fi
  else
    skip "macOS defaults"
  fi
fi

# ── workspace-sync service ────────────────────────────────────────────────────

if should_run sync; then
header "Auto-sync service"

if ask "Install workspace-sync? (auto-commits and syncs every 15 min)"; then
  if $DRY_RUN; then
    if [[ "$OS" == "Darwin" ]]; then
      dry "would install launchd service com.workspace-sync"
    else
      dry "would install systemd timer workspace-sync.timer"
    fi
  else
    if [[ "$OS" == "Darwin" ]]; then
      # Unload first if already installed
      launchctl bootout "gui/$(id -u)/com.workspace-sync" 2>/dev/null || true
      # Expand $HOME in the plist and install
      sed "s|\$HOME|$HOME|g" "$DOTFILES_DIR/bin/com.workspace-sync.plist" \
        > "$HOME/Library/LaunchAgents/com.workspace-sync.plist"
      launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.workspace-sync.plist"
      ok "launchd service installed (runs every 15 min)"
    else
      mkdir -p "$HOME/.config/systemd/user"
      cp "$DOTFILES_DIR/bin/workspace-sync.service" "$HOME/.config/systemd/user/"
      cp "$DOTFILES_DIR/bin/workspace-sync.timer" "$HOME/.config/systemd/user/"
      systemctl --user daemon-reload
      systemctl --user enable --now workspace-sync.timer
      ok "systemd timer installed (runs every 15 min)"
    fi
    info "Check status: workspace-sync --status"
    info "View log: tail ~/.workspace-sync.log"
  fi
else
  skip "workspace-sync service"
fi
fi # sync

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
printf "${BOLD}${CYAN}"
cat << 'DONE'
  ┌─────────────────────────────────────┐
  │          Setup complete!            │
  └─────────────────────────────────────┘
DONE
printf "${RESET}"

if $DRY_RUN; then
  echo ""
  printf "  ${MAGENTA}${BOLD}This was a dry run — no changes were made.${RESET}\n"
  printf "  ${DIM}Run without --dry-run to apply changes.${RESET}\n"
fi

# Collect remaining action items
todos=()
if [[ -f "$HOME/.secrets" ]]; then
  empty="$(grep -cE '^export \w+=""' "$HOME/.secrets" 2>/dev/null | tail -1 || echo 0)"
  [[ "$empty" =~ ^[0-9]+$ && "$empty" -gt 0 ]] && todos+=("Fill in $empty empty keys in ~/.secrets")
fi
if [[ -f "$HOME/.ssh/config" ]] && grep -q '__.*__' "$HOME/.ssh/config" 2>/dev/null; then
  todos+=("Fill in placeholder IPs in ~/.ssh/config")
fi
if [[ -d "$HOME/.tmux/plugins/tpm" ]]; then
  todos+=("Open tmux and press prefix+I to install plugins")
fi
todos+=("Restart your terminal (or: exec zsh)")

if [[ -d "$BACKUP_DIR" ]] 2>/dev/null; then
  info "Backed-up files saved to: $BACKUP_DIR"
fi

if [[ ${#todos[@]} -gt 0 ]]; then
  echo ""
  printf "  ${BOLD}Next steps:${RESET}\n"
  step_i=1
  for todo in "${todos[@]}"; do
    printf "    ${CYAN}%d.${RESET} %s\n" "$step_i" "$todo"
    ((step_i++))
  done
fi
echo ""
