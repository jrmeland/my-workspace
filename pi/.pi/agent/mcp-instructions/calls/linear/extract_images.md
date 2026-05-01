---
name: "calls-linear-extract_images"
description: "Extract and fetch images from markdown content. Use this to view screenshots, diagrams, or other images embedded in Linear issues, comments, or documents. Pass the markdown content (e.g., issue description) and receive the images as viewable data."
---

# MCP Call Instructions: linear.extract_images

Generated: 2026-05-01T23:03:04.771Z

Description: Extract and fetch images from markdown content. Use this to view screenshots, diagrams, or other images embedded in Linear issues, comments, or documents. Pass the markdown content (e.g., issue description) and receive the images as viewable data.

## Preferred usage
- First use in a session: verify/refresh auth if prompted.
- Direct CLI: `mcporter call linear.extract_images --args '{"k":"v"}'`
- pi command: `/mcp-call linear.extract_images {"k":"v"}`
- pi tool: `mcp_linear_extract_images` with `argsJson`

## Arguments
- Required: markdown
- Optional: none

## Example
- `mcporter call linear.extract_images --args '{"markdown":"..."}'`