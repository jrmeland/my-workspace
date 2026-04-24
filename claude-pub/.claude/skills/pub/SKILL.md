---
name: pub
description: Publish HTML (single file or multi-file site) to Josh's link-only static host at https://pub.joshmelander.com. Use whenever the user wants to share a generated report, dashboard, one-off webpage, or site with someone via a link — e.g. "put this HTML somewhere I can send", "host this", "give me a URL for this page", "publish this". Files are scp'd to Tower (his Unraid box) into the directory SWAG serves for `pub.joshmelander.com`. URL is an unguessable random slug; anyone with the link can view. Don't use for sensitive content (slug is the only barrier).
---

# pub

Publishes HTML to `https://pub.joshmelander.com/<slug>`. Under the hood: `scp` into `/mnt/user/appdata/swag/www/pub/` on `tower` (Unraid), served by SWAG nginx over the Cloudflare Zero Trust tunnel.

Full infra context: `~/source/knowbase/reference/homelab/pub.joshmelander.com.md`.

## When to use

- User has an HTML artifact (report, dashboard, analysis, one-off page, small site) and wants a shareable URL
- User says "publish", "host this", "give me a link for this", "upload this HTML"
- An earlier step in the conversation produced HTML and the next natural step is to surface it to the user in a browser

## When NOT to use

- Content contains secrets, PII, or anything the user wouldn't want accessible to anyone with the URL — warn first
- User wants a "real" app with routing/auth/DB — that's a Coolify job, not pub
- User wants the URL to be memorable or branded — pub URLs are random slugs, not pretty paths

## Usage

Always use the helper script rather than hand-rolling scp, so slug generation and URL echo stay consistent:

```bash
# single page — file becomes pub.joshmelander.com/<slug>
~/.claude/skills/pub/scripts/pub.sh ./report.html

# multi-file site — directory becomes pub.joshmelander.com/<slug>/
~/.claude/skills/pub/scripts/pub.sh ./site-dir/

# choose your own slug (must be [a-z0-9-]+ and unique)
~/.claude/skills/pub/scripts/pub.sh ./report.html my-slug
```

The script prints the final URL on its last line. Always surface that URL to the user verbatim.

## URL shape

- `~/.claude/skills/pub/scripts/pub.sh file.html`  → `https://pub.joshmelander.com/<slug>` (serves `file.html` — extension stripped from URL)
- `~/.claude/skills/pub/scripts/pub.sh dir/`       → `https://pub.joshmelander.com/<slug>/` (serves `dir/index.html` by default)
  - If the directory has no `index.html`, pick one and either rename it or warn the user that `/<slug>/` will 404.

## Listing / unpublishing

```bash
# list what's currently published
ssh tower 'ls /mnt/user/appdata/swag/www/pub/'

# unpublish a slug (both single-file and dir variants)
ssh tower 'rm -rf /mnt/user/appdata/swag/www/pub/<slug> /mnt/user/appdata/swag/www/pub/<slug>.html'
```

Always confirm with the user before deleting anything you didn't just publish in this session.

## Notes / gotchas

- Root `https://pub.joshmelander.com/` returns 404 on purpose — "link-only"; don't report this as broken.
- Files land owned by `josh` via scp. SWAG runs nginx able to read world-readable files; the skill's script sets `chmod a+rX` after upload to be safe.
- There's no HTTPS cert work to do — `*.joshmelander.com` wildcard cert already covers this.
- Slugs should stay short-ish (6 bytes hex = 12 chars) — long enough to be unguessable, short enough to paste.
