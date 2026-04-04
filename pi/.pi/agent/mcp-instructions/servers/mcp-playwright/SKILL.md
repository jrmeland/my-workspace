---
name: "mcp-playwright"
description: "MCP server usage instructions for mcp-playwright, including auth and tool call patterns."
---

# MCP Server Instructions: mcp-playwright

Generated: 2026-04-04T18:26:49.767Z
Description: Usage instructions for MCP server mcp-playwright, including auth, tool discovery, and call patterns.
Server status at generation: ok

## Auth
- Refresh auth when needed: `mcporter auth mcp-playwright`

## How to call tools
- Raw CLI: `mcporter call mcp-playwright.<tool> --args '{"key":"value"}'`
- pi command: `/mcp-call mcp-playwright.<tool> {"key":"value"}`
- pi dynamic tool: `mcp_mcp-playwright_<tool>` with `argsJson`

## Available tools

- start_codegen_session — Start a new code generation session to record Playwright actions
- end_codegen_session — End a code generation session and generate the test file
- get_codegen_session — Get information about a code generation session
- clear_codegen_session — Clear a code generation session without generating a test
- playwright_navigate — Navigate to a URL
- playwright_screenshot — Take a screenshot of the current page or a specific element
- playwright_click — Click an element on the page
- playwright_iframe_click — Click an element in an iframe on the page
- playwright_iframe_fill — Fill an element in an iframe on the page
- playwright_fill — fill out an input field
- playwright_select — Select an element on the page with Select tag
- playwright_hover — Hover an element on the page
- playwright_upload_file — Upload a file to an input[type='file'] element on the page
- playwright_evaluate — Execute JavaScript in the browser console
- playwright_console_logs — Retrieve console logs from the browser with filtering options
- playwright_resize — Resize the browser viewport using manual dimensions or device presets. Supports 143+ device presets including iPhone, iPad, Android devices, and desktop browsers with proper user-agent and touch emulation.
- playwright_close — Close the browser and release all resources
- playwright_get — Perform an HTTP GET request
- playwright_post — Perform an HTTP POST request
- playwright_put — Perform an HTTP PUT request
- playwright_patch — Perform an HTTP PATCH request
- playwright_delete — Perform an HTTP DELETE request
- playwright_expect_response — Ask Playwright to start waiting for a HTTP response. This tool initiates the wait operation but does not wait for its completion.
- playwright_assert_response — Wait for and validate a previously initiated HTTP response wait operation.
- playwright_custom_user_agent — Set a custom User Agent for the browser
- playwright_get_visible_text — Get the visible text content of the current page
- playwright_get_visible_html — Get the HTML content of the current page. By default, all <script> tags are removed from the output unless removeScripts is explicitly set to false.
- playwright_go_back — Navigate back in browser history
- playwright_go_forward — Navigate forward in browser history
- playwright_drag — Drag an element to a target location
- playwright_press_key — Press a keyboard key
- playwright_save_as_pdf — Save the current page as a PDF file
- playwright_click_and_switch_tab — Click a link and switch to the newly opened tab

## Per-call instructions
- See files in: `mcp-instructions/calls/mcp-playwright/`