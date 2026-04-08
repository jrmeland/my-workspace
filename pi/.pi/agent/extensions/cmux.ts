/**
 * cmux integration extension
 *
 * Detects when pi is running inside cmux and:
 * 1. Injects cmux skill instructions into the system prompt
 * 2. Manages sidebar lifecycle (Running/Idle status, notifications)
 * 3. Registers tools the LLM can call to notify, set status/progress, and log
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

const CMUX_ENV_MARKER = "CMUX_WORKSPACE_ID";

function isInsideCmux(): boolean {
  return !!process.env[CMUX_ENV_MARKER];
}

function getCmuxContext(): string {
  const workspaceId = process.env.CMUX_WORKSPACE_ID ?? "unknown";
  const surfaceId = process.env.CMUX_SURFACE_ID ?? "unknown";
  return `workspace=${workspaceId}, surface=${surfaceId}`;
}

const SKILLS_DIR = resolve(__dirname, "..", "skills");

export default function (pi: ExtensionAPI) {
  (globalThis as any).__piProfiler?.begin("cmux");
  // Always register the skill directory so pi discovers it regardless of cmux
  pi.on("resources_discover", () => {
    const skillPaths = [SKILLS_DIR].filter((p) => existsSync(p));
    return { skillPaths };
  });

  if (!isInsideCmux()) return;

  // ---------------------------------------------------------------------------
  // System prompt injection
  // ---------------------------------------------------------------------------

  const cmuxPrompt = [
    "",
    "# cmux Terminal Multiplexer (Active)",
    "",
    `You are running inside cmux. Current context: ${getCmuxContext()}.`,
    "",
    "**Key rules:**",
    "- NEVER run long-running processes (servers, test suites, builds, log tails, watchers) in this pane.",
    "- Instead, use the cmux_new_split tool to create a new pane, then cmux_exec to run the command there.",
    "- Use cmux_read_screen to check output from other panes.",
    "- Run cmux_tree to discover the current layout before creating new panes.",
    "- Use cmux_notify to alert the user when background tasks complete.",
    "- Use cmux_status to show what you're working on in the sidebar.",
    "- Use cmux_progress to show progress on multi-step work.",
    "- Use cmux_log to log notable events to the workspace sidebar.",
    "",
    "Run cmux_tree first to see what panes already exist.",
    "",
  ].join("\n");

  pi.on("before_agent_start", async (event, _ctx) => {
    return { systemPrompt: event.systemPrompt + cmuxPrompt };
  });

  // ---------------------------------------------------------------------------
  // Helper: run cmux CLI
  // ---------------------------------------------------------------------------

  async function cmux(args: string[], signal?: AbortSignal): Promise<string> {
    const result = await pi.exec("cmux", args, { signal, timeout: 5000 });
    return result.stdout.trim();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — sidebar status & notifications
  // ---------------------------------------------------------------------------

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setStatus("cmux", "cmux ✓");
    await cmux(["set-status", "pi", "Running", "--icon", "bolt.fill", "--color", "#10B981"]);
  });

  pi.on("agent_start", async () => {
    await cmux(["set-status", "pi", "Running", "--icon", "bolt.fill", "--color", "#10B981"]);
  });

  pi.on("agent_end", async (event) => {
    await cmux(["set-status", "pi", "Idle", "--icon", "pause.circle.fill", "--color", "#8E8E93"]);
    await cmux(["clear-progress"]);

    // Build a contextual notification from the last assistant message
    let body = "Ready for input";
    if (event.messages?.length) {
      // Walk backwards to find the last assistant text
      for (let i = event.messages.length - 1; i >= 0; i--) {
        const msg = event.messages[i];
        if (msg.role === "assistant" && Array.isArray(msg.content)) {
          const textBlock = msg.content.find(
            (b: any) => b.type === "text" && b.text?.trim()
          ) as { type: "text"; text: string } | undefined;
          if (textBlock) {
            // Take the first meaningful line, truncate for notification
            const firstLine = textBlock.text
              .split("\n")
              .map((l: string) => l.trim())
              .find((l: string) => l.length > 0 && !l.startsWith("#") && !l.startsWith("```"));
            if (firstLine) {
              body = firstLine.length > 120 ? firstLine.slice(0, 117) + "…" : firstLine;
            }
            break;
          }
        }
      }
    }

    await cmux(["notify", "--title", "π", "--body", body]);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    ctx.ui.setStatus("cmux", undefined);
    await cmux(["clear-status", "pi"]);
    await cmux(["clear-progress"]);
  });

  // ---------------------------------------------------------------------------
  // Tool: cmux_notify
  // ---------------------------------------------------------------------------

  pi.registerTool({
    name: "cmux_notify",
    label: "cmux Notify",
    description:
      "Send a desktop notification via cmux. Use to alert the user about completed tasks, important events, or when you need their attention.",
    promptSnippet: "Send a cmux desktop notification with title and body",
    parameters: Type.Object({
      title: Type.String({ description: "Notification title" }),
      body: Type.String({ description: "Notification body text" }),
      subtitle: Type.Optional(Type.String({ description: "Optional subtitle" })),
    }),
    async execute(_toolCallId, params, signal) {
      const args = ["notify", "--title", params.title, "--body", params.body];
      if (params.subtitle) args.push("--subtitle", params.subtitle);
      await cmux(args, signal);
      return {
        content: [{ type: "text", text: `Notification sent: ${params.title}` }],
        details: { title: params.title, body: params.body },
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: cmux_status
  // ---------------------------------------------------------------------------

  pi.registerTool({
    name: "cmux_status",
    label: "cmux Status",
    description:
      "Set or clear a status entry in the cmux workspace sidebar. Use to show what you're currently working on.",
    promptSnippet: "Set or clear a cmux sidebar status entry with key, value, icon, and color",
    parameters: Type.Object({
      action: StringEnum(["set", "clear"] as const, {
        description: "'set' to create/update a status entry, 'clear' to remove it",
      }),
      key: Type.String({
        description: "Status key identifier (e.g. 'task', 'build', 'deploy')",
      }),
      value: Type.Optional(
        Type.String({ description: "Status text to display (required for 'set')" })
      ),
      icon: Type.Optional(
        Type.String({
          description:
            "SF Symbol icon name (e.g. 'bolt.fill', 'checkmark.circle.fill', 'wrench.fill', 'arrow.triangle.2.circlepath', 'exclamationmark.triangle.fill')",
        })
      ),
      color: Type.Optional(
        Type.String({
          description: "Hex color for the status (e.g. '#10B981' green, '#F59E0B' amber, '#EF4444' red, '#3B82F6' blue)",
        })
      ),
    }),
    async execute(_toolCallId, params, signal) {
      if (params.action === "clear") {
        await cmux(["clear-status", params.key], signal);
        return {
          content: [{ type: "text", text: `Status '${params.key}' cleared` }],
          details: { action: "clear", key: params.key },
        };
      }
      const value = params.value ?? "Active";
      const args = ["set-status", params.key, value];
      if (params.icon) args.push("--icon", params.icon);
      if (params.color) args.push("--color", params.color);
      await cmux(args, signal);
      return {
        content: [{ type: "text", text: `Status '${params.key}' set to '${value}'` }],
        details: { action: "set", key: params.key, value },
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: cmux_progress
  // ---------------------------------------------------------------------------

  pi.registerTool({
    name: "cmux_progress",
    label: "cmux Progress",
    description:
      "Set or clear a progress bar in the cmux workspace sidebar. Use during multi-step operations to show how far along you are.",
    promptSnippet: "Set or clear a cmux sidebar progress bar (0.0–1.0)",
    parameters: Type.Object({
      action: StringEnum(["set", "clear"] as const, {
        description: "'set' to show/update the progress bar, 'clear' to remove it",
      }),
      value: Type.Optional(
        Type.Number({
          description: "Progress value from 0.0 to 1.0 (required for 'set')",
          minimum: 0,
          maximum: 1,
        })
      ),
      label: Type.Optional(
        Type.String({ description: "Label to display alongside the progress bar" })
      ),
    }),
    async execute(_toolCallId, params, signal) {
      if (params.action === "clear") {
        await cmux(["clear-progress"], signal);
        return {
          content: [{ type: "text", text: "Progress bar cleared" }],
          details: { action: "clear" },
        };
      }
      const value = params.value ?? 0;
      const args = ["set-progress", String(value)];
      if (params.label) args.push("--label", params.label);
      await cmux(args, signal);
      return {
        content: [{ type: "text", text: `Progress set to ${Math.round(value * 100)}%` }],
        details: { action: "set", value, label: params.label },
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: cmux_log
  // ---------------------------------------------------------------------------

  pi.registerTool({
    name: "cmux_log",
    label: "cmux Log",
    description:
      "Add a log entry to the cmux workspace sidebar. Use for notable events, milestones, or diagnostic messages during work.",
    promptSnippet: "Add a log entry to the cmux workspace sidebar",
    parameters: Type.Object({
      message: Type.String({ description: "Log message text" }),
      level: Type.Optional(
        StringEnum(["info", "warning", "error", "debug"] as const, {
          description: "Log level (default: info)",
        })
      ),
      source: Type.Optional(
        Type.String({ description: "Source label (e.g. 'build', 'test', 'deploy')" })
      ),
    }),
    async execute(_toolCallId, params, signal) {
      const args = ["log"];
      if (params.level) args.push("--level", params.level);
      if (params.source) args.push("--source", params.source);
      args.push("--", params.message);
      await cmux(args, signal);
      return {
        content: [{ type: "text", text: `Logged: ${params.message}` }],
        details: { message: params.message, level: params.level ?? "info" },
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: cmux_tree
  // ---------------------------------------------------------------------------

  pi.registerTool({
    name: "cmux_tree",
    label: "cmux Tree",
    description:
      "Show the cmux workspace layout: windows, workspaces, panes, and surfaces. Use to discover surface refs before sending commands or reading output.",
    promptSnippet: "Show cmux workspace layout tree to discover panes and surfaces",
    parameters: Type.Object({
      all: Type.Optional(
        Type.Boolean({ description: "Include all windows, not just current (default: false)" })
      ),
    }),
    async execute(_toolCallId, params, signal) {
      const args = ["tree"];
      if (params.all) args.push("--all");
      const output = await cmux(args, signal);
      return {
        content: [{ type: "text", text: output }],
        details: {},
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: cmux_read_screen
  // ---------------------------------------------------------------------------

  pi.registerTool({
    name: "cmux_read_screen",
    label: "cmux Read Screen",
    description:
      "Read terminal text from a cmux surface. Returns the visible viewport by default, or include scrollback history.",
    promptSnippet: "Read terminal output from a cmux surface (visible or scrollback)",
    parameters: Type.Object({
      surface: Type.String({ description: "Target surface ref (e.g. 'surface:3')" }),
      lines: Type.Optional(
        Type.Number({ description: "Limit to the last N lines (implies scrollback)" })
      ),
      scrollback: Type.Optional(
        Type.Boolean({ description: "Include scrollback history, not just visible viewport" })
      ),
    }),
    async execute(_toolCallId, params, signal) {
      const args = ["read-screen", "--surface", params.surface];
      if (params.lines) {
        args.push("--lines", String(params.lines));
      } else if (params.scrollback) {
        args.push("--scrollback");
      }
      const output = await cmux(args, signal);
      return {
        content: [{ type: "text", text: output || "(empty)" }],
        details: {},
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: cmux_send
  // ---------------------------------------------------------------------------

  pi.registerTool({
    name: "cmux_send",
    label: "cmux Send",
    description:
      "Send text to a cmux terminal surface. The text is typed literally. Use cmux_send_key to press Enter or other special keys afterwards.",
    promptSnippet: "Send text to a cmux terminal surface",
    parameters: Type.Object({
      surface: Type.String({ description: "Target surface ref (e.g. 'surface:3')" }),
      text: Type.String({ description: "Text to send (typed literally into the terminal)" }),
    }),
    async execute(_toolCallId, params, signal) {
      await cmux(["send", "--surface", params.surface, "--", params.text], signal);
      return {
        content: [{ type: "text", text: `Sent to ${params.surface}` }],
        details: { surface: params.surface },
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: cmux_send_key
  // ---------------------------------------------------------------------------

  pi.registerTool({
    name: "cmux_send_key",
    label: "cmux Send Key",
    description:
      "Send a special key to a cmux terminal surface. Common keys: 'enter' (Return), 'ctrl+c' (interrupt), 'ctrl+d' (EOF), 'escape', 'tab', 'up', 'down'.",
    promptSnippet: "Send a special key (enter, ctrl+c, etc.) to a cmux terminal surface",
    parameters: Type.Object({
      surface: Type.String({ description: "Target surface ref (e.g. 'surface:3')" }),
      key: Type.String({ description: "Key to send (e.g. 'enter', 'ctrl+c', 'escape', 'tab', 'up', 'down')" }),
    }),
    async execute(_toolCallId, params, signal) {
      await cmux(["send-key", "--surface", params.surface, "--", params.key], signal);
      return {
        content: [{ type: "text", text: `Sent key '${params.key}' to ${params.surface}` }],
        details: { surface: params.surface, key: params.key },
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: cmux_exec
  // ---------------------------------------------------------------------------

  pi.registerTool({
    name: "cmux_exec",
    label: "cmux Exec",
    description:
      "Send a command to a cmux terminal surface and press Enter. Convenience wrapper around cmux_send + cmux_send_key enter.",
    promptSnippet: "Run a command in a cmux terminal surface (send text + Enter)",
    parameters: Type.Object({
      surface: Type.String({ description: "Target surface ref (e.g. 'surface:3')" }),
      command: Type.String({ description: "Command to execute" }),
    }),
    async execute(_toolCallId, params, signal) {
      await cmux(["send", "--surface", params.surface, "--", params.command + "\n"], signal);
      return {
        content: [{ type: "text", text: `Executed on ${params.surface}: ${params.command}` }],
        details: { surface: params.surface, command: params.command },
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: cmux_new_split
  // ---------------------------------------------------------------------------

  pi.registerTool({
    name: "cmux_new_split",
    label: "cmux New Split",
    description:
      "Create a new pane by splitting the current pane. Returns the new surface ref. Use cmux_exec to run a command in the new pane.",
    promptSnippet: "Split a cmux pane to create a new terminal surface",
    parameters: Type.Object({
      direction: StringEnum(["right", "down", "left", "up"] as const, {
        description: "Split direction relative to current pane",
      }),
    }),
    async execute(_toolCallId, params, signal) {
      const output = await cmux(["new-split", params.direction], signal);
      return {
        content: [{ type: "text", text: output || `Split ${params.direction}` }],
        details: { direction: params.direction },
      };
    },
  });
  (globalThis as any).__piProfiler?.end("cmux");
}
