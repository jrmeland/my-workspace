#!/usr/bin/env bash
# push-notification — send a push notification via Josh's self-hosted ntfy server.
#
# Reads credentials from the environment. The skill description (SKILL.md)
# documents what should be set and where.

set -euo pipefail

usage() {
  cat <<'EOF'
push-notification — push notification via ntfy.

Usage:
  push-notification.sh [opts] "message"
  echo "message" | push-notification.sh [opts]

Options:
  -t, --title TITLE        notification title
  -p, --priority PRIO      min | low | default | high | max  (or 1-5)
  -T, --tags TAGS          comma-separated emoji shortcodes (e.g. "rocket,warning")
  -c, --click URL          URL opened when the notification is tapped
  -m, --markdown           format body as Markdown
      --topic TOPIC        override $NTFY_TOPIC
  -h, --help               show this message

Required env:
  NTFY_URL        base URL of the ntfy server (https://ntfy.joshmelander.com)
  NTFY_TOPIC      default topic to publish to
  NTFY_USER       basic-auth username
  NTFY_PASSWORD   basic-auth password
EOF
}

die() { echo "push-notification: $*" >&2; exit 1; }

TITLE=""
PRIORITY=""
TAGS=""
CLICK=""
MARKDOWN=""
TOPIC="${NTFY_TOPIC:-}"

while (( $# )); do
  case "$1" in
    -t|--title)    TITLE="$2"; shift 2 ;;
    -p|--priority) PRIORITY="$2"; shift 2 ;;
    -T|--tags)     TAGS="$2"; shift 2 ;;
    -c|--click)    CLICK="$2"; shift 2 ;;
    -m|--markdown) MARKDOWN="yes"; shift ;;
        --topic)   TOPIC="$2"; shift 2 ;;
    -h|--help)     usage; exit 0 ;;
    --) shift; break ;;
    -*) die "unknown flag: $1 (try --help)" ;;
    *)  break ;;
  esac
done

if (( $# )); then
  BODY="$*"
elif ! [[ -t 0 ]]; then
  BODY="$(cat)"
else
  die "no message body (pass as positional arg or pipe via stdin)"
fi

[[ -n "${NTFY_URL:-}" ]]      || die "NTFY_URL not set in environment"
[[ -n "$TOPIC" ]]             || die "NTFY_TOPIC not set in environment (or pass --topic)"
[[ -n "${NTFY_USER:-}" ]]     || die "NTFY_USER not set in environment"
[[ -n "${NTFY_PASSWORD:-}" ]] || die "NTFY_PASSWORD not set in environment"

args=( -sS --fail-with-body
       -u "$NTFY_USER:$NTFY_PASSWORD"
       --data-binary "$BODY" )
[[ -n "$TITLE" ]]    && args+=( -H "Title: $TITLE" )
[[ -n "$PRIORITY" ]] && args+=( -H "Priority: $PRIORITY" )
[[ -n "$TAGS" ]]     && args+=( -H "Tags: $TAGS" )
[[ -n "$CLICK" ]]    && args+=( -H "Click: $CLICK" )
[[ -n "$MARKDOWN" ]] && args+=( -H "Markdown: yes" )

curl "${args[@]}" "${NTFY_URL%/}/$TOPIC"
echo
