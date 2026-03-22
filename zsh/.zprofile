

export PATH=$PATH:/System/Volumes/Data/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/
eval "$(/opt/homebrew/bin/brew shellenv)"
# Add .NET Core SDK tools
export PATH="$PATH:/Users/josh/.dotnet/tools"
export DOTNET_ROOT=$HOME/dotnet
export PATH=$PATH:$HOME/dotnet
export PATH=$PATH:/Users/josh/source/local_helpers
export PATH="/Users/josh/.local/bin:$PATH"
export AWS_DEFAULT_PROFILE=admin
alias glog="git log --oneline --decorate --all --graph"
alias itunes_downloads="cd ~/Music/Music/Media.localized/Music"

# Added by OrbStack: command-line tools and integration
# This won't be added again if you remove it.
source ~/.orbstack/shell/init.zsh 2>/dev/null || :

# Load secrets (API keys, tokens, etc.) — never commit this file
[ -f ~/.secrets ] && source ~/.secrets
