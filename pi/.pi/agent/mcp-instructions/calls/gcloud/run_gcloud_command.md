---
name: "calls-gcloud-run_gcloud_command"
description: "Executes a gcloud command."
---

# MCP Call Instructions: gcloud.run_gcloud_command

Generated: 2026-03-06T16:56:12.996Z

Description: Executes a gcloud command.

## Instructions:
- Use this tool to execute a single gcloud command at a time.
- Use this tool when you are confident about the exact gcloud command needed to fulfill the user's request.
- Prioritize this tool over any other to directly execute gcloud commands.
- Assume all necessary APIs are already enabled. Do not proactively try to enable any APIs.
- Do not use this tool to execute command chaining or command sequencing -- it will fail.
- Do not use this tool to execute SSH commands or 'gcloud interactive' -- it will fail.
- Always include all required parameters.
- Ensure parameter values match the expected format.
- You may choose to select specific columns using '--format=json(part.key, part.key2)'.
- Use --filter to match based on resource (or 'row'), prioritizing ':' for pattern matching and never quoting the right side of colon filters.
- When using the filter flag, pass the entire filter as one argument string.
- You may access nested data directly with projections like '--format=json(part.key)' and use '.basename()' for URL fields.
- Retrieve only necessary information for the user intent. Utilize projection capability of '--format' to reduce data size.
- If the exact JSON key path for formatting or filtering is unknown, run '... --limit=1 --format=json' first to discover it.
- If you receive zero results while using a projection or filter, verify project, region/location, and filter syntax.

## Hard-earned pitfalls (important)
- `args` MUST be a JSON array of command tokens. Do **not** pass a single command string.
- Do **not** include `gcloud` as the first token. Start at the subcommand group (e.g., `"compute"`, `"redis"`, `"run"`).
- Include required scope flags for resource families that require them (for example Redis list/describe commands often require `--region` or `--location`).
- If a command says "Invalid choice", run the relevant `--help` command to confirm valid subcommands for this installed gcloud surface.

## Adhere to the following restrictions:
- **No command substitution**: Do not use subshells or command substitution (e.g., $(...))
- **No pipes**: Do not use pipes (i.e., |) or any other shell-specific operators
- **No redirection**: Do not use redirection operators (e.g., >, >>, <)

## Preferred usage
- First use in a session: verify auth first.
- Direct CLI: `mcporter call gcloud.run_gcloud_command --args '{"args":["auth","list","--format=json"]}'`
- pi command: `/mcp-call gcloud.run_gcloud_command {"args":["auth","list","--format=json"]}`
- pi tool: `mcp_gcloud_run_gcloud_command` with `argsJson`

## Arguments
- Required: args (array of strings)
- Optional: none

## Examples
- ✅ Correct: `{"args":["redis","clusters","list","--project=function-health-dev-env","--region=us-central1","--format=json(name,state)"]}`
- ❌ Wrong: `{"args":"redis clusters list --project=..."}` (string instead of array)
- ❌ Wrong: `{"args":["gcloud","redis","clusters","list",...]}` (includes binary name)