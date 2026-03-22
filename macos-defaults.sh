#!/usr/bin/env bash
# macOS system preferences — run once on a fresh machine, then reboot.
# Usage: ./macos-defaults.sh

set -euo pipefail

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Skipping macOS defaults — not on macOS"
  exit 0
fi

echo "Applying macOS defaults..."

# ── Keyboard ──────────────────────────────────────────────────────────────────

# Caps Lock → Control (for all keyboards)
# This uses hidutil, which persists across reboots via a LaunchAgent.
# Mapping: 0x700000039 = Caps Lock, 0x7000000E0 = Left Control
# See: https://developer.apple.com/library/archive/technotes/tn2450/_index.html
hidutil property --set '{"UserKeyMapping":[{"HIDKeyboardModifierMappingSrc":0x700000039,"HIDKeyboardModifierMappingDst":0x7000000E0}]}' > /dev/null

# Create LaunchAgent to persist caps-lock-as-ctrl across reboots
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
LAUNCH_AGENT="$LAUNCH_AGENT_DIR/com.local.caps-lock-to-ctrl.plist"
mkdir -p "$LAUNCH_AGENT_DIR"
cat > "$LAUNCH_AGENT" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.local.caps-lock-to-ctrl</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/hidutil</string>
        <string>property</string>
        <string>--set</string>
        <string>{"UserKeyMapping":[{"HIDKeyboardModifierMappingSrc":0x700000039,"HIDKeyboardModifierMappingDst":0x7000000E0}]}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
PLIST
echo "  ✓ Caps Lock → Control (persistent via LaunchAgent)"

# Fast key repeat
defaults write NSGlobalDomain KeyRepeat -int 2
defaults write NSGlobalDomain InitialKeyRepeat -int 15
echo "  ✓ Fast key repeat"

# ── Finder ────────────────────────────────────────────────────────────────────

# Show hidden files
defaults write com.apple.finder AppleShowAllFiles -bool true

# Show all file extensions
defaults write NSGlobalDomain AppleShowAllExtensions -bool true

# Show path bar
defaults write com.apple.finder ShowPathbar -bool true

# Show status bar
defaults write com.apple.finder ShowStatusBar -bool true

# Default to list view
defaults write com.apple.finder FXPreferredViewStyle -string "Nlsv"

echo "  ✓ Finder preferences"

# ── Dock ──────────────────────────────────────────────────────────────────────

# Don't auto-hide the Dock
defaults write com.apple.dock autohide -bool false

# Remove auto-hide delay
defaults write com.apple.dock autohide-delay -float 0

# Minimize windows using scale effect
defaults write com.apple.dock mineffect -string "scale"

# Don't show recent applications in Dock
defaults write com.apple.dock show-recents -bool false

echo "  ✓ Dock preferences"

# ── Trackpad ──────────────────────────────────────────────────────────────────

# Tap to click
defaults write com.apple.driver.AppleBluetoothMultitouch.trackpad Clicking -bool true

# Enable three-finger drag
defaults write com.apple.AppleMultitouchTrackpad TrackpadThreeFingerDrag -bool true

echo "  ✓ Trackpad preferences"

# ── Screenshots ───────────────────────────────────────────────────────────────

# Save screenshots to ~/Screenshots
mkdir -p "$HOME/Screenshots"
defaults write com.apple.screencapture location -string "$HOME/Screenshots"

# Save screenshots as PNG
defaults write com.apple.screencapture type -string "png"

# Disable shadow in screenshots
defaults write com.apple.screencapture disable-shadow -bool true

echo "  ✓ Screenshot preferences"

# ── Misc ──────────────────────────────────────────────────────────────────────

# Disable press-and-hold for keys in favor of key repeat
defaults write NSGlobalDomain ApplePressAndHoldEnabled -bool false

# Disable auto-correct
defaults write NSGlobalDomain NSAutomaticSpellingCorrectionEnabled -bool false

# Expand save panel by default
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode -bool true
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode2 -bool true

echo "  ✓ Miscellaneous preferences"

# ── Restart affected apps ────────────────────────────────────────────────────

echo ""
echo "Restarting affected applications..."
for app in "Finder" "Dock" "SystemUIServer"; do
  killall "${app}" &>/dev/null || true
done

echo ""
echo "Done! Some changes require a logout/restart to take effect."
