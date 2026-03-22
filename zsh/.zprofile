# .zprofile — runs for login shells only. Aliases and interactive setup.

export AWS_DEFAULT_PROFILE=admin

alias glog="git log --oneline --decorate --all --graph"
alias itunes_downloads="cd ~/Music/Music/Media.localized/Music"

# OrbStack
source ~/.orbstack/shell/init.zsh 2>/dev/null || :
