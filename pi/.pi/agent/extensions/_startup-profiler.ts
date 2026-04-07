/**
 * Startup Profiler Extension
 *
 * Shows a live loading timeline in a widget above the editor while pi starts up.
 * Times each phase: process bootstrap, extension loading, session resolution,
 * and MCP server connections (streamed live as each server responds).
 *
 * ## Per-extension timing
 *
 * Other extensions can opt in to per-extension timing by adding two lines:
 *
 *   export default function (pi: ExtensionAPI) {
 *     (globalThis as any).__piProfiler?.begin("my-extension");
 *     // ... extension body ...
 *     (globalThis as any).__piProfiler?.end("my-extension");
 *   }
 *
 * The profiler will display per-extension timing in the startup widget.
 * If the profiler isn't loaded, the calls are no-ops (optional chaining).
 *
 * Naming: starts with _ so it loads first alphabetically.
 * Auto-hides on first prompt. Toggle with /startup.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";

// ─── Timing state ────────────────────────────────────────────────────────────

interface TimingEntry {
  label: string;
  durationMs: number;
  status: "pending" | "done" | "warn" | "error" | "info";
  detail?: string;
  indent?: number;
}

interface ProfilerMark {
  start: number;
  end?: number;
}

const processStartMs = Date.now() - process.uptime() * 1000;
const factoryRunMs = Date.now();

// ─── Install global profiler API (before any other extension loads) ──────────

const profilerMarks = new Map<string, ProfilerMark>();

(globalThis as any).__piProfiler = {
  begin(name: string) {
    profilerMarks.set(name, { start: Date.now() });
  },
  end(name: string) {
    const m = profilerMarks.get(name);
    if (m) m.end = Date.now();
  },
};

// ─── Extension discovery (at factory time) ───────────────────────────────────

interface ExtInfo {
  name: string;
  sizeKB: number;
}

function discoverExtensions(): ExtInfo[] {
  const extDir = join(homedir(), ".pi/agent/extensions");
  const results: ExtInfo[] = [];

  try {
    for (const entry of readdirSync(extDir)) {
      const fullPath = join(extDir, entry);
      try {
        const st = statSync(fullPath);
        if (st.isFile() && entry.endsWith(".ts")) {
          if (entry === basename(__filename)) continue;
          results.push({ name: entry.replace(/\.ts$/, ""), sizeKB: Math.round(st.size / 1024) });
        } else if (st.isDirectory()) {
          try {
            let totalSize = 0;
            for (const f of readdirSync(fullPath)) {
              if (f.endsWith(".ts")) {
                try { totalSize += statSync(join(fullPath, f)).size; } catch {}
              }
            }
            if (totalSize > 0) {
              results.push({ name: entry, sizeKB: Math.round(totalSize / 1024) });
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}

  return results.sort((a, b) => b.sizeKB - a.sizeKB);
}

const extensions = discoverExtensions();

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
    case "info":    return theme.fg("dim", "·");
    default:        return " ";
  }
}

// ─── Extension ───────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  const timings: TimingEntry[] = [];
  let widgetVisible = true;
  let uiCtx: any = null;

  // Phase 1: Process start → our factory
  timings.push({
    label: "Process bootstrap",
    durationMs: factoryRunMs - processStartMs,
    status: "done",
  });

  function updateWidget() {
    if (!uiCtx || !widgetVisible) return;

    // Scale bars: p90 of timed entries (exclude info-only and aggregate MCP)
    const durations = timings
      .filter((t) => t.status !== "info" && t.durationMs > 0 && t.label !== "MCP servers")
      .map((t) => t.durationMs)
      .sort((a, b) => a - b);
    const p90idx = Math.max(0, Math.ceil(durations.length * 0.9) - 1);
    const maxMs = durations.length > 0 ? Math.max(durations[p90idx], 1) : 1;

    const totalElapsed = Date.now() - processStartMs;
    const allDone = timings.every((t) => t.status !== "pending");

    uiCtx.ui.setWidget("startup-profiler", (_tui: any, theme: any) => ({
      render(width: number) {
        const barW = Math.min(20, Math.max(8, width - 50));
        const lines: string[] = [];

        lines.push(
          theme.fg("dim", "  ┌─ ") +
          theme.fg("accent", theme.bold("Startup Profile")) +
          theme.fg("dim", " " + "─".repeat(Math.max(0, width - 24)))
        );

        for (const t of timings) {
          const indent = t.indent || 0;
          const ico = icon(t.status, theme);
          const maxLabel = 24 - indent * 2;
          const lbl = t.label.length > maxLabel
            ? t.label.slice(0, maxLabel - 1) + "…"
            : t.label.padEnd(maxLabel);
          const dur = fmtMs(t.durationMs).padStart(7);
          const b = t.status === "pending"
            ? theme.fg("dim", "░".repeat(barW))
            : t.status === "info"
              ? " ".repeat(barW)
              : bar(Math.min(t.durationMs / maxMs, 1), barW, theme);
          const det = t.detail ? theme.fg("dim", ` ${t.detail}`) : "";
          const durColored = t.status === "pending"
            ? theme.fg("warning", dur)
            : t.status === "error"
              ? theme.fg("error", dur)
              : t.status === "info"
                ? theme.fg("dim", dur)
                : theme.fg("muted", dur);
          const pad = "  ".repeat(indent);
          const lblColored = t.status === "info"
            ? theme.fg("dim", lbl)
            : theme.fg("text", lbl);

          lines.push(
            `  ${theme.fg("dim", "│")} ${ico} ${pad}${lblColored} ${durColored}  ${b}${det}`
          );
        }

        const totalStr = fmtMs(totalElapsed);
        const footer = allDone
          ? theme.fg("success", `Ready — ${totalStr} total`)
          : theme.fg("warning", `Loading — ${totalStr} elapsed`);
        lines.push(
          theme.fg("dim", "  └─ ") + footer +
          theme.fg("dim", " " + "─".repeat(Math.max(0, width - 14 - totalStr.length - (allDone ? 8 : 11))))
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
        buffer = lines.pop() || "";
        for (const line of lines) parseLine(line);
      });

      child.stderr.on("data", () => {});

      child.on("error", () => {
        const mcpEntry = timings.find((t) => t.label === "MCP servers");
        if (mcpEntry) {
          mcpEntry.status = "error";
          mcpEntry.detail = "mcporter not found";
          mcpEntry.durationMs = Date.now() - mcpStartMs;
        }
        updateWidget();
        resolve();
      });

      child.on("close", () => {
        if (buffer.trim()) parseLine(buffer);
        const mcpEntry = timings.find((t) => t.label === "MCP servers");
        if (mcpEntry) {
          mcpEntry.status = "done";
          mcpEntry.detail = `${serverCount} servers`;
          mcpEntry.durationMs = Date.now() - mcpStartMs;
        }
        updateWidget();
        resolve();
      });

      function parseLine(line: string) {
        const match = line.match(/^- (.+?)\s*\(([^)]+)\)/);
        if (!match) return;

        const name = match[1].trim();
        const info = match[2].trim();
        serverCount++;

        const timeMatch = info.match(/([\d.]+)s/);
        const ms = timeMatch ? parseFloat(timeMatch[1]) * 1000 : 0;

        let status: "done" | "warn" | "error" = "done";
        let detail = "";

        if (info.includes("offline")) {
          status = "error"; detail = "offline";
        } else if (info.includes("auth required")) {
          status = "warn"; detail = "needs auth";
        } else {
          const toolMatch = info.match(/(\d+) tools?/);
          if (toolMatch) detail = `${toolMatch[1]} tools`;
        }

        timings.push({ label: name, durationMs: ms, status, detail, indent: 1 });
        updateWidget();
      }
    });
  }

  // ── Lifecycle hooks ──

  pi.on("session_start", async (_event, ctx) => {
    uiCtx = ctx;
    const sessionReadyMs = Date.now();

    // Phase 2: Extensions + session
    const extLoadMs = sessionReadyMs - factoryRunMs;

    // Check for per-extension profiler marks
    const markedExts: { name: string; ms: number }[] = [];
    let unmarkedMs = extLoadMs;

    for (const [name, mark] of profilerMarks) {
      if (mark.end) {
        const ms = mark.end - mark.start;
        markedExts.push({ name, ms });
        unmarkedMs -= ms;
      }
    }
    markedExts.sort((a, b) => b.ms - a.ms);

    const markedCount = markedExts.length;
    const totalExts = extensions.length;

    timings.push({
      label: "Extensions + session",
      durationMs: extLoadMs,
      status: "done",
      detail: `${totalExts} extensions`,
    });

    if (markedExts.length > 0) {
      // Show timed extensions
      for (const ext of markedExts) {
        timings.push({
          label: ext.name,
          durationMs: ext.ms,
          status: "done",
          indent: 1,
        });
      }

      // Show remaining time as "other" if there are untimed extensions
      const untimedCount = totalExts - markedCount;
      if (untimedCount > 0 && unmarkedMs > 1) {
        timings.push({
          label: `${untimedCount} untimed`,
          durationMs: Math.max(0, unmarkedMs),
          status: "info",
          detail: "add __piProfiler",
          indent: 1,
        });
      }
    } else {
      // No marks — show extensions by size as a proxy
      for (const ext of extensions.slice(0, 8)) {
        timings.push({
          label: ext.name,
          durationMs: 0,
          status: "info",
          detail: `${ext.sizeKB}KB`,
          indent: 1,
        });
      }
      if (extensions.length > 8) {
        timings.push({
          label: `+${extensions.length - 8} more`,
          durationMs: 0,
          status: "info",
          indent: 1,
        });
      }
    }

    updateWidget();

    // Phase 3: MCP servers
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
