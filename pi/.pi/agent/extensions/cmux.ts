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
    "- Instead, use `cmux new-split right` or `cmux new-split down` to create a new pane, then `cmux send` + `cmux send-key` to run the command there.",
    "- Use `cmux read-screen --surface <ref> --scrollback` to check output from other panes.",
    "- Run `cmux tree` to discover the current layout before creating new panes.",
    "- Use the cmux_notify tool to alert the user when background tasks complete.",
    "- Use the cmux_status tool to show what you're working on in the sidebar.",
    "- Use the cmux_progress tool to show progress on multi-step work.",
    "- Use the cmux_log tool to log notable events to the workspace sidebar.",
    "",
    "Run `cmux tree` first to see what panes already exist.",
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

  pi.on("agent_end", async () => {
    await cmux(["set-status", "pi", "Idle", "--icon", "pause.circle.fill", "--color", "#8E8E93"]);
    await cmux(["clear-progress"]);
    await cmux(["notify", "--title", "π", "--body", "Ready for input"]);
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
}
