# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Load secrets (API keys, tokens, etc.) — never commit this file
[ -f ~/.secrets ] && source ~/.secrets
