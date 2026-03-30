---
name: "calls-sentry-analyze_issue_with_seer"
description: "Use Seer to analyze production errors and get detailed root cause analysis with specific code fixes."
---

# MCP Call Instructions: sentry.analyze_issue_with_seer

Generated: 2026-03-25T15:01:28.009Z

Description: Use Seer to analyze production errors and get detailed root cause analysis with specific code fixes.

Use this tool when:
- The user explicitly asks for root cause analysis, Seer analysis, or help fixing/debugging an issue
- You are unable to accurately determine the root cause from the issue details alone

Do NOT call this tool as an automatic follow-up to get_issue_details.

What this tool provides:
- Root cause analysis with code-level explanations
- Specific file locations and line numbers where errors occur
- Concrete code fixes you can apply
- Step-by-step implementation guidance

This tool automatically:
1. Checks if analysis already exists (instant results)
2. Starts new AI analysis if needed (~2-5 minutes)
3. Returns complete fix recommendations

<examples>
### User: "Run Seer on this issue"

```
analyze_issue_with_seer(issueUrl='https://my-org.sentry.io/issues/PROJECT-1Z43')
```

### User: "Analyze this issue and suggest a fix"

```
analyze_issue_with_seer(organizationSlug='my-organization', issueId='ERROR-456')
```
</examples>

<hints>
- Only use when the user explicitly requests analysis or you cannot determine the root cause from issue details alone
- If the user provides an issueUrl, extract it and use that parameter alone
- The analysis includes actual code snippets and fixes, not just error descriptions
- Results are cached - subsequent calls return instantly
</hints>

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call sentry.analyze_issue_with_seer --args '{"k":"v"}'`
- pi command: `/mcp-call sentry.analyze_issue_with_seer {"k":"v"}`
- pi tool: `mcp_sentry_analyze_issue_with_seer` with `argsJson`

## Arguments
- Required: none
- Optional: organizationSlug, regionUrl, issueId, issueUrl, instruction

## Example
- `mcporter call sentry.analyze_issue_with_seer`