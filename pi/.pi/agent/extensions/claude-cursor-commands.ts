import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const TARGET_DIR_NAMES = new Set([".claude", ".cursor"]);
const COMMAND_SUBDIR_CANDIDATES = ["commands", "prompts"];

// Keep recursion practical in large monorepos.
const SKIP_DIR_NAMES = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  ".next",
  ".turbo",
  ".cache",
  "dist",
  "build",
  "coverage",
  "venv",
  ".venv",
  "__pycache__",
]);

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function discoverCommandPaths(rootCwd: string): string[] {
  const root = resolve(rootCwd);
  const discovered = new Set<string>();

  const walk = (dir: string): void => {
    let entries: ReturnType<typeof readdirSync>;

    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const childPath = join(dir, entry.name);

      if (SKIP_DIR_NAMES.has(entry.name)) {
        continue;
      }

      if (TARGET_DIR_NAMES.has(entry.name)) {
        // Prefer known subdirectories that commonly hold Claude/Cursor command templates.
        for (const subdir of COMMAND_SUBDIR_CANDIDATES) {
          const candidate = join(childPath, subdir);
          if (isDirectory(candidate)) {
            discovered.add(candidate);
          }
        }

        // Do NOT include the .claude/.cursor root directly.
        // Those roots often contain non-command markdown files (e.g. VERIFICATION.md)
        // that can be misclassified by downstream discovery/validation.
      }

      walk(childPath);
    }
  };

  walk(root);
  return [...discovered];
}

export default function (pi: ExtensionAPI) {
  (globalThis as any).__piProfiler?.begin("claude-cursor-commands");
  pi.on("resources_discover", (event, ctx) => {
    const promptPaths = discoverCommandPaths(event.cwd);

    if (promptPaths.length > 0) {
      ctx.ui.notify(`claude-cursor-commands: discovered ${promptPaths.length} command path(s)`, "info");
    }

    return { promptPaths };
  });
  (globalThis as any).__piProfiler?.end("claude-cursor-commands");
}
