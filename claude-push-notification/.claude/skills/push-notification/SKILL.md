---
name: push-notification
description: Send a push notification to Josh's iPhone via his self-hosted ntfy server. Use whenever the user asks to be notified, alerted, or pinged about something that happens outside the active chat — e.g. "let me know when the build finishes", "notify me when this is done", "ping me when ready", "send me a push", "tell me when X completes". Also use proactively at the end of a long-running task the user started and walked away from, when NTFY_URL/NTFY_TOPIC/NTFY_USER/NTFY_PASSWORD are in the environment. Do NOT use for in-chat status updates the user will see by reading the conversation.
---

# push-notification

Publishes a notification to the ntfy server at `$NTFY_URL`. Lands on Josh's iPhone (and any other device subscribed to the topic) via APNs through ntfy.sh.

Full infra context: `~/.claude/projects/-Users-josh-source-my-workspace/memory/ntfy_tower.md`.

## When to use

- The user has explicitly asked to be notified about something — long-running task, deploy outcome, build status, scheduled event.
- An agent has just finished a task that took long enough that the user likely tabbed away.
- A background job needs to surface a result (failure or success) outside the active conversation.

## When NOT to use

- Routine in-conversation status updates — the user is reading the chat, they don't need a push.
- High-frequency events that would spam the user's phone. Coalesce or rate-limit at the call site.
- Anything sensitive in the message body. ntfy.sh sees a small relay payload but the *body* is fetched directly from `$NTFY_URL` by the device. Treat messages as if they could be logged by any proxy on the path; don't put secrets, tokens, or PII in them.

## Environment contract

The script fails fast if any of these are missing:

```
NTFY_URL        e.g. https://ntfy.joshmelander.com
NTFY_TOPIC      e.g. agents
NTFY_USER       basic-auth username
NTFY_PASSWORD   basic-auth password
```

For agent contexts: put these in the project's `.env` (or whatever env-injection mechanism the agent runner uses). For interactive use on Josh's machines they should already be exported via `~/.secrets`. If they're missing, relay the error to the user verbatim — don't try to invent values or work around it.

## Usage

Always invoke the helper rather than hand-rolling curl, so flags, headers, and error handling stay consistent:

```bash
# minimal — body as positional arg
~/.claude/skills/push-notification/scripts/push-notification.sh "build finished"

# with title and click-through URL (tap opens it in the browser)
~/.claude/skills/push-notification/scripts/push-notification.sh \
  -t "Build done" \
  -c "https://github.com/me/repo/actions/runs/123" \
  "all green"

# priority + emoji tags
~/.claude/skills/push-notification/scripts/push-notification.sh \
  -t "Deploy failed" -p high -T "warning,fire" \
  "rollback needed on api.example.com"

# Markdown body
~/.claude/skills/push-notification/scripts/push-notification.sh -t "Weekly report" -m -c "https://pub.joshmelander.com/x" \
  "**Top movers**: ACME +12%, BETA -4%. [Open report](https://pub.joshmelander.com/x)"

# body from stdin (useful for long messages or piped output)
make 2>&1 | tail -n 20 | ~/.claude/skills/push-notification/scripts/push-notification.sh -t "make output"

# override the default topic
~/.claude/skills/push-notification/scripts/push-notification.sh --topic deploys "shipped v1.2.3"
```

## Header reference

| Flag                | ntfy header | Notes                                                          |
|---------------------|-------------|----------------------------------------------------------------|
| `-t, --title`       | `Title`     | Bold line shown above the body.                                |
| `-p, --priority`    | `Priority`  | `min`/`low`/`default`/`high`/`max` or `1`–`5`. Default 3.      |
| `-T, --tags`        | `Tags`      | Comma-sep emoji shortcodes — `rocket,warning,white_check_mark`.|
| `-c, --click`       | `Click`     | Tap-to-open URL.                                               |
| `-m, --markdown`    | `Markdown`  | Body rendered as Markdown (mobile + web UI; not email).        |
| `--topic`           | (URL path)  | Override `$NTFY_TOPIC` for this call.                          |

## Output

- Success: ntfy's JSON response on stdout (includes `id`, `time`, `expires`). Caller can `jq -r .id` if it needs the message ID.
- Failure: exits non-zero. HTTP body is printed to stderr (via `curl --fail-with-body`).

## Notes / gotchas

- Topic names are public if guessed — auth is what protects publishing, not the topic name. Don't lean on obscurity.
- Default `NTFY_TOPIC` of `agents` is configured with a dedicated write-only user. If you publish to a different topic, the user/password may not have access and you'll get a 403.
- iOS push has a few-second delay on the first message to a given topic (ntfy.sh has to register the device). Steady state is sub-second.
- Don't add `push-notification.sh` calls inside tight loops or hooks. Each call is a network round-trip; a flood will be both annoying and likely rate-limited.
