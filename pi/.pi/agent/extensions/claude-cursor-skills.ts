import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const TARGET_DIR_NAMES = new Set([".claude", ".cursor"]);
const SKILL_SUBDIR_CANDIDATES = ["skills", "rules"];

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

function discoverSkillPaths(rootCwd: string): string[] {
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
        // Prefer known subdirectories that commonly hold Claude/Cursor content.
        for (const subdir of SKILL_SUBDIR_CANDIDATES) {
          const candidate = join(childPath, subdir);
          if (isDirectory(candidate)) {
            discovered.add(candidate);
          }
        }

        // Do NOT include the .claude/.cursor root directly.
        // Those roots commonly contain non-skill markdown files (e.g. VERIFICATION.md),
        // which should not be treated as skill definitions.
      }

      walk(childPath);
    }
  };

  walk(root);
  return [...discovered];
}

export default function (pi: ExtensionAPI) {
  pi.on("resources_discover", (event, ctx) => {
    const skillPaths = discoverSkillPaths(event.cwd);

    if (skillPaths.length > 0) {
      ctx.ui.notify(`claude-cursor-skills: discovered ${skillPaths.length} skill path(s)`, "info");
    }

    return { skillPaths };
  });
}
