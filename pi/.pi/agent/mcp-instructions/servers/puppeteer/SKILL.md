---
name: "puppeteer"
description: "MCP server usage instructions for puppeteer, including auth and tool call patterns."
---

# MCP Server Instructions: puppeteer

Generated: 2026-04-04T18:26:40.438Z
Description: Usage instructions for MCP server puppeteer, including auth, tool discovery, and call patterns.
Server status at generation: ok

## Auth
- Refresh auth when needed: `mcporter auth puppeteer`

## How to call tools
- Raw CLI: `mcporter call puppeteer.<tool> --args '{"key":"value"}'`
- pi command: `/mcp-call puppeteer.<tool> {"key":"value"}`
- pi dynamic tool: `mcp_puppeteer_<tool>` with `argsJson`

## Available tools

- puppeteer_navigate — Navigate to a URL
- puppeteer_screenshot — Take a screenshot of the current page or a specific element
- puppeteer_click — Click an element on the page
- puppeteer_fill — Fill out an input field
- puppeteer_select — Select an element on the page with Select tag
- puppeteer_hover — Hover an element on the page
- puppeteer_evaluate — Execute JavaScript in the browser console

## Per-call instructions
- See files in: `mcp-instructions/calls/puppeteer/`