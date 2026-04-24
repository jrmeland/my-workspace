#!/usr/bin/env bash
# pub — publish an HTML file or directory to https://pub.joshmelander.com/<slug>
#
# Usage:
#   pub.sh <file-or-dir> [slug]
#
# If <slug> is omitted, a random 6-byte hex slug is generated.
# Last line of stdout is always the final URL — callers can tail -n1.

set -euo pipefail

SSH_TARGET="tower"
REMOTE_ROOT="/mnt/user/appdata/swag/www/pub"
BASE_URL="https://pub.joshmelander.com"

die() { echo "pub: $*" >&2; exit 1; }

[[ $# -ge 1 ]] || die "usage: pub.sh <file-or-dir> [slug]"

SRC="$1"
SLUG="${2:-$(openssl rand -hex 6)}"

[[ -e "$SRC" ]] || die "no such path: $SRC"

# Validate slug
[[ "$SLUG" =~ ^[a-z0-9-]+$ ]] || die "slug must match [a-z0-9-]+, got: $SLUG"

# Refuse to overwrite an existing slug — caller should pick a new one or explicitly remove first
if ssh "$SSH_TARGET" "test -e $REMOTE_ROOT/$SLUG -o -e $REMOTE_ROOT/$SLUG.html" 2>/dev/null; then
    die "slug '$SLUG' already exists on $SSH_TARGET — pick another or remove it first"
fi

if [[ -d "$SRC" ]]; then
    # Directory publish
    if [[ ! -f "$SRC/index.html" ]]; then
        echo "pub: warning — $SRC has no index.html; /$SLUG/ will 404 until one exists" >&2
    fi
    scp -q -r "$SRC" "$SSH_TARGET:$REMOTE_ROOT/$SLUG"
    ssh "$SSH_TARGET" "chmod -R a+rX $REMOTE_ROOT/$SLUG"
    URL="$BASE_URL/$SLUG/"
else
    # Single-file publish — force .html so nginx's try_files `$uri.html` fallback works
    scp -q "$SRC" "$SSH_TARGET:$REMOTE_ROOT/$SLUG.html"
    ssh "$SSH_TARGET" "chmod a+r $REMOTE_ROOT/$SLUG.html"
    URL="$BASE_URL/$SLUG"
fi

echo "$URL"
