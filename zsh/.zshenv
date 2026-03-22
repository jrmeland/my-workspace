# .zshenv — runs for ALL zsh sessions (login, interactive, scripts, SSH).
# Keep this to PATH setup and env vars only. No aliases or interactive stuff.

# Homebrew
if [[ -f /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -f /home/linuxbrew/.linuxbrew/bin/brew ]]; then
  eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
fi

# Core paths
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/source/local_helpers:$PATH"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# dotnet
export DOTNET_ROOT="$HOME/dotnet"
export PATH="$PATH:$HOME/dotnet"
export PATH="$PATH:$HOME/.dotnet/tools"

# LM Studio CLI
export PATH="$PATH:$HOME/.cache/lm-studio/bin"

# Load secrets (API keys, tokens, etc.) — never commit this file
[ -f ~/.secrets ] && source ~/.secrets
