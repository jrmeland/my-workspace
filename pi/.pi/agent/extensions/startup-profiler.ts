/**
 * Startup Profiler Extension
 *
 * Shows a live loading timeline in a widget above the editor while pi starts up.
 * Times each component: Node.js boot, extension loading, session resolution,
 * and MCP server connections (streamed live as each server responds).
 *
 * Auto-hides on first prompt. Toggle with /startup.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { spawn } from "node:child_process";

// ─── Timing state ────────────────────────────────────────────────────────────

interface TimingEntry {
  label: string;
  durationMs: number;
  status: "pending" | "done" | "warn" | "error";
  detail?: string;
}

const processStartMs = Date.now() - process.uptime() * 1000;
const extensionLoadMs = Date.now();

// ─── Rendering helpers ───────────────────────────────────────────────────────

function fmtMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function bar(fraction: number, width: number, theme: any): string {
  const filled = Math.min(Math.round(fraction * width), width);
  return theme.fg("accent", "█".repeat(filled)) + theme.fg("dim", "░".repeat(width - filled));
}

function icon(status: string, theme: any): string {
  switch (status) {
    case "pending": return theme.fg("warning", "◌");
    case "done":    return theme.fg("success", "✓");
    case "warn":    return theme.fg("warning", "!");
    case "error":   return theme.fg("error", "✗");
    default:        return " ";
  }
}

// ─── Extension ───────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  const timings: TimingEntry[] = [];
  let widgetVisible = true;
  let uiCtx: any = null;

  // ── Pre-recorded: Node.js boot ──
  timings.push({
    label: "Node.js boot",
    durationMs: extensionLoadMs - processStartMs,
    status: "done",
  });

  // ── Widget renderer ──

  function updateWidget() {
    if (!uiCtx || !widgetVisible) return;

    // Scale bars using p90 so outliers (e.g. 30s timeout) don't crush everything
    const durations = timings
      .filter((t) => t.label !== "MCP servers" && t.durationMs > 0)
      .map((t) => t.durationMs)
      .sort((a, b) => a - b);
    const p90idx = Math.max(0, Math.floor(durations.length * 0.9) - 1);
    const maxMs = durations.length > 0 ? Math.max(durations[p90idx], 1) : 1;

    const totalElapsed = Date.now() - processStartMs;
    const allDone = timings.every((t) => t.status !== "pending");

    uiCtx.ui.setWidget("startup-profiler", (_tui: any, theme: any) => ({
      render(width: number) {
        const barW = Math.min(20, Math.max(8, width - 48));
        const lines: string[] = [];

        // Header
        const hdrPad = Math.max(0, width - 24);
        lines.push(
          theme.fg("dim", "  ┌─ ") +
          theme.fg("accent", theme.bold("Startup Profile")) +
          theme.fg("dim", " " + "─".repeat(hdrPad))
        );

        for (const t of timings) {
          const ico = icon(t.status, theme);
          const lbl = t.label.length > 24 ? t.label.slice(0, 23) + "…" : t.label.padEnd(24);
          const dur = fmtMs(t.durationMs).padStart(7);
          const b = t.status === "pending"
            ? theme.fg("dim", "░".repeat(barW))
            : bar(t.durationMs / maxMs, barW, theme);
          const det = t.detail ? theme.fg("dim", ` ${t.detail}`) : "";
          const durColored = t.status === "pending"
            ? theme.fg("warning", dur)
            : t.status === "error"
              ? theme.fg("error", dur)
              : theme.fg("muted", dur);

          lines.push(`  ${theme.fg("dim", "│")} ${ico} ${theme.fg("text", lbl)} ${durColored}  ${b}${det}`);
        }

        // Footer
        const totalStr = fmtMs(totalElapsed);
        const footer = allDone
          ? theme.fg("success", `Ready — ${totalStr} total`)
          : theme.fg("warning", `Loading — ${totalStr} elapsed`);
        const ftrPad = Math.max(0, width - 14 - totalStr.length - (allDone ? 8 : 11));
        lines.push(
          theme.fg("dim", "  └─ ") + footer + theme.fg("dim", " " + "─".repeat(ftrPad))
        );

        return lines;
      },
      invalidate() {},
    }));
  }

  // ── Stream mcporter results ──

  function probeMcporterAsync(mcpStartMs: number): Promise<void> {
    return new Promise((resolve) => {
      const child = spawn("mcporter", ["list"], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      });

      let buffer = "";
      let serverCount = 0;

      child.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // keep incomplete last line

        for (const line of lines) {
          parseMcporterLine(line);
        }
      });

      child.stderr.on("data", () => {}); // ignore

      child.on("error", () => {
        // mcporter not found
        const idx = timings.findIndex((t) => t.label === "MCP servers");
        if (idx >= 0) {
          timings[idx].status = "error";
          timings[idx].detail = "mcporter not found";
          timings[idx].durationMs = Date.now() - (processStartMs + timings[idx].durationMs);
        }
        updateWidget();
        resolve();
      });

      child.on("close", () => {
        // parse any remaining buffer
        if (buffer.trim()) parseMcporterLine(buffer);

        // finalize the aggregate entry
        const mcpEntry = timings.find((t) => t.label === "MCP servers");
        if (mcpEntry) {
          mcpEntry.status = "done";
          mcpEntry.detail = `${serverCount} servers`;
          mcpEntry.durationMs = Date.now() - mcpStartMs;
        }
        updateWidget();
        resolve();
      });

      function parseMcporterLine(line: string) {
        // Format: "- ServerName (N tools, Xs) [source: ...]"
        //     or: "- ServerName (offline — ..., Xs) [source: ...]"
        //     or: "- ServerName (auth required — ..., Xs)"
        const match = line.match(/^- (.+?)\s*\(([^)]+)\)/);
        if (!match) return;

        const name = match[1].trim();
        const info = match[2].trim();
        serverCount++;

        // Parse timing
        const timeMatch = info.match(/([\d.]+)s/);
        const ms = timeMatch ? parseFloat(timeMatch[1]) * 1000 : 0;

        // Determine status and detail
        let status: "done" | "warn" | "error" = "done";
        let detail = "";

        if (info.includes("offline")) {
          status = "error";
          detail = "offline";
        } else if (info.includes("auth required")) {
          status = "warn";
          detail = "needs auth";
        } else {
          const toolMatch = info.match(/(\d+) tools?/);
          if (toolMatch) detail = `${toolMatch[1]} tools`;
        }

        timings.push({ label: `  ${name}`, durationMs: ms, status, detail });
        updateWidget();
      }
    });
  }

  // ── Lifecycle hooks ──

  pi.on("session_start", async (_event, ctx) => {
    uiCtx = ctx;
    const sessionDoneMs = Date.now();

    // Extension + session resolution (combined since we can't distinguish precisely)
    timings.push({
      label: "Extensions + session",
      durationMs: sessionDoneMs - extensionLoadMs,
      status: "done",
    });

    // Show initial widget immediately
    updateWidget();

    // Add pending MCP entry and start probing
    const mcpStartMs = Date.now();
    timings.push({
      label: "MCP servers",
      durationMs: 0,
      status: "pending",
    });
    updateWidget();

    await probeMcporterAsync(mcpStartMs);
  });

  // Auto-hide on first prompt
  pi.on("before_agent_start", async () => {
    if (widgetVisible) {
      widgetVisible = false;
      uiCtx?.ui?.setWidget("startup-profiler", undefined);
    }
  });

  // ── Toggle command ──

  pi.registerCommand("startup", {
    description: "Show/hide the startup profiler timing widget",
    handler: async (_args, ctx) => {
      widgetVisible = !widgetVisible;
      uiCtx = ctx;
      if (widgetVisible) {
        updateWidget();
      } else {
        ctx.ui.setWidget("startup-profiler", undefined);
      }
    },
  });
}
