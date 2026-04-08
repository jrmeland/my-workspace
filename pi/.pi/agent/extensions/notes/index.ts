/**
 * Notes Workspace Extension
 *
 * Sets a notes workspace root and an **active note file** as ambient context.
 * The agent can record IDs, links, findings, and decisions to the active file
 * (or any file in the workspace) without the user specifying paths each time.
 *
 * Usage:
 *   /notes                                    Show workspace + active file
 *   /notes ~/source/josh-workspace            Set workspace root
 *   /notes projects/redis-cluster-migration   Activate a file (resolves README.md for dirs)
 *   /notes today                              Activate today's daily note
 *   /notes new report <slug>                  Create report from template + activate
 *   /notes new task <slug>                    Create task from template + activate
 *   /notes new project <slug>                 Create project from template + activate
 *   /notes clear                              Clear active file (keep workspace)
 *   /notes clear all                          Clear everything
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { AutocompleteItem } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import {
	existsSync,
	readFileSync,
	writeFileSync,
	readdirSync,
	mkdirSync,
	statSync,
} from "node:fs";
import { resolve, join, basename, dirname, relative, extname } from "node:path";
import { homedir } from "node:os";

// ---------------------------------------------------------------------------
// Types & Disk Persistence
// ---------------------------------------------------------------------------

interface NotesState {
	root: string;
	activeFile: string | null; // absolute path to active note file
	setAt: number;
}

const GLOBAL_STATE_PATH = join(homedir(), ".pi", "notes-state.json");

function readGlobalState(): { root: string } | null {
	try {
		if (!existsSync(GLOBAL_STATE_PATH)) return null;
		const data = JSON.parse(readFileSync(GLOBAL_STATE_PATH, "utf-8"));
		if (data?.root && typeof data.root === "string" && existsSync(data.root)) {
			return { root: data.root };
		}
		return null;
	} catch {
		return null;
	}
}

function writeGlobalState(root: string | null): void {
	try {
		const dir = dirname(GLOBAL_STATE_PATH);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		if (root) {
			writeFileSync(GLOBAL_STATE_PATH, JSON.stringify({ root }, null, 2));
		} else {
			writeFileSync(GLOBAL_STATE_PATH, JSON.stringify({}, null, 2));
		}
	} catch {
		// Silently ignore write errors
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expandHome(p: string): string {
	if (p.startsWith("~/") || p === "~") {
		return join(homedir(), p.slice(1));
	}
	return resolve(p);
}

function contractHome(p: string): string {
	const home = homedir();
	return p.startsWith(home) ? "~" + p.slice(home.length) : p;
}

function todaySlug(): string {
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	const yyyy = d.getFullYear();
	return `${mm}-${dd}-${yyyy}`;
}

function todayNotePath(root: string): string {
	return join(root, "notes", `${todaySlug()}.md`);
}

function dateStamp(): string {
	const d = new Date();
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function truncate(s: string, max: number): string {
	return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function listDir(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true })
		.filter((e) => !e.name.startsWith("."))
		.map((e) => (e.isDirectory() ? e.name + "/" : e.name))
		.sort();
}

/**
 * Resolve a user-provided path to an actual file.
 * - "today" → today's daily note
 * - Directories → look for README.md inside
 * - Paths without .md extension → try appending .md
 */
function resolveNotePath(root: string, input: string): string {
	if (input === "today") return todayNotePath(root);

	let candidate = join(root, input);

	// If it's a directory, look for README.md
	if (existsSync(candidate) && statSync(candidate).isDirectory()) {
		const readme = join(candidate, "README.md");
		if (existsSync(readme)) return readme;
		return readme; // return it anyway — caller can create it
	}

	// If exact path exists, use it
	if (existsSync(candidate)) return candidate;

	// Try appending .md
	if (!extname(candidate) && existsSync(candidate + ".md")) {
		return candidate + ".md";
	}

	// Return as-is (may not exist yet — that's OK for "new" flows)
	if (!extname(candidate)) return candidate + ".md";
	return candidate;
}

/**
 * Derive a display label for the active file.
 * e.g. "projects/redis-cluster-migration/README.md" → "project: redis-cluster-migration"
 * e.g. "reports/hashimotos-investigation.md" → "report: hashimotos-investigation"
 * e.g. "notes/04-06-2026.md" → "daily: 04-06-2026"
 * e.g. "tasks/redis-connectivity.md" → "task: redis-connectivity"
 */
function fileLabel(root: string, absPath: string): string {
	const rel = relative(root, absPath);
	const parts = rel.split("/");

	if (parts[0] === "notes") {
		const name = basename(parts[parts.length - 1], ".md");
		return `daily: ${name}`;
	}
	if (parts[0] === "projects" && parts.length >= 2) {
		return `project: ${parts[1]}`;
	}
	if (parts[0] === "reports") {
		return `report: ${basename(parts[parts.length - 1], ".md")}`;
	}
	if (parts[0] === "tasks") {
		return `task: ${basename(parts[parts.length - 1], ".md")}`;
	}
	return rel;
}

// ---------------------------------------------------------------------------
// Section append logic
// ---------------------------------------------------------------------------

function appendToSection(
	filePath: string,
	section: string,
	content: string
): { ok: boolean; detail: string } {
	if (!existsSync(filePath)) {
		return { ok: false, detail: `File not found: ${filePath}` };
	}

	const raw = readFileSync(filePath, "utf-8");
	const lines = raw.split("\n");

	const heading = section.startsWith("#") ? section : `## ${section}`;
	const headingLevel = (heading.match(/^#+/) || ["##"])[0].length;

	let sectionStart = -1;
	let sectionEnd = lines.length;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const match = line.match(/^(#{1,6})\s/);
		if (match) {
			if (sectionStart === -1) {
				if (line.trim().toLowerCase() === heading.trim().toLowerCase()) {
					sectionStart = i;
				}
			} else if (match[1].length <= headingLevel) {
				sectionEnd = i;
				break;
			}
		}
	}

	if (sectionStart === -1) {
		const suffix = `\n${heading}\n\n${content}\n`;
		writeFileSync(filePath, raw.trimEnd() + "\n" + suffix);
		return { ok: true, detail: `Created section "${heading}" at end of file` };
	}

	let insertAt = sectionEnd;
	while (insertAt > sectionStart + 1 && lines[insertAt - 1].trim() === "") {
		insertAt--;
	}

	const newLines = [...lines.slice(0, insertAt), content, ...lines.slice(insertAt)];
	writeFileSync(filePath, newLines.join("\n"));
	return { ok: true, detail: `Appended to "${heading}" at line ${insertAt + 1}` };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const REPORT_TEMPLATE = (title: string, slug: string) => `# ${title}

**Date:** ${dateStamp()}
**Author:** Josh
**Status:** draft

---

## Identifiers

| Key | Value |
|-----|-------|
| | |

---

## Summary



---

## Methodology



---

## Findings



---

## Recommendations



---

## Open Questions

-
`;

const TASK_TEMPLATE = (title: string, slug: string) => `# ${title}

**Status:** draft
**Created:** ${dateStamp()}

## Ticket

-

## Goal



## Context



## Log

- ${dateStamp()}: Created

## Findings



## Next Actions

-
`;

const PROJECT_TEMPLATE = (name: string) => {
	// Read the _template if available, otherwise use a minimal version
	return `# ${name}

## Overview

One-paragraph summary of the project and intended outcome.

## Current

- Current phase/state:
- Top focus this week:
- Main risk/blocker:

## Dependencies

| Dependency | What we need | Status | Blocking? |
|-----------|-------------|--------|-----------|
| | | | |

## Updates

- ${dateStamp()}: Created

## Log

## Context sources

### Linear
- Parent:
- Children:

### Docs
- PRD:
- TRD:

### Slack
- Project channel:
- Key threads:

## Key people

-

## Open questions

-
`;
};

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function notesExtension(pi: ExtensionAPI) {
	let state: NotesState | null = null;

	// --- state persistence ---

	function persistState() {
		pi.appendEntry("notes-workspace", state ? { state } : { state: null });
	}

	function restoreState(ctx: ExtensionContext) {
		state = null;
		// First, try to restore from session entries (includes active file)
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type === "custom" && entry.customType === "notes-workspace") {
				const data = entry.data as { state: NotesState | null } | undefined;
				state = data?.state ?? null;
			}
		}
		// If no session state, fall back to disk for the workspace root
		if (!state) {
			const global = readGlobalState();
			if (global) {
				state = { root: global.root, activeFile: null, setAt: Date.now() };
			}
		}
		updateFooter(ctx);
	}

	// --- footer ---

	function updateFooter(ctx: ExtensionContext) {
		const theme = ctx.ui.theme;
		if (!state) {
			ctx.ui.setStatus("notes", undefined);
			return;
		}
		const icon = theme.fg("accent", "📓");
		if (!state.activeFile) {
			const root = theme.fg("accent", contractHome(state.root));
			ctx.ui.setStatus("notes", `${icon} ${root}`);
			return;
		}
		const label = theme.fg("accent", fileLabel(state.root, state.activeFile));
		const exists = existsSync(state.activeFile);
		const marker = exists ? "" : theme.fg("dim", " (new)");
		ctx.ui.setStatus("notes", `${icon} ${label}${marker}`);
	}

	// --- system prompt ---

	function buildSystemPromptBlock(): string {
		if (!state) return "";
		const root = state.root;
		const rootDisplay = contractHome(root);

		const lines: string[] = [
			"",
			"## Notes Workspace",
			"",
			`**Root:** \`${rootDisplay}\``,
		];

		// Active file context
		if (state.activeFile) {
			const rel = relative(root, state.activeFile);
			const label = fileLabel(root, state.activeFile);
			const fileExists = existsSync(state.activeFile);

			lines.push(`**Active note:** \`${rel}\` (${label})${fileExists ? "" : " — not yet created"}`);
			lines.push("");

			if (fileExists) {
				const content = readFileSync(state.activeFile, "utf-8");
				// Include full content if under 4k chars, otherwise include first 4k
				if (content.length <= 4000) {
					lines.push("### Active note content");
					lines.push("");
					lines.push(content);
				} else {
					lines.push("### Active note content (truncated)");
					lines.push("");
					lines.push(content.slice(0, 4000));
					lines.push(`\n... (${content.length - 4000} chars truncated — use notes_read for full content)`);
				}
				lines.push("");
			}
		} else {
			lines.push(`**Active note:** none — use \`/notes <path>\` to set one`);
			lines.push(`**Today's note:** \`${rootDisplay}/notes/${todaySlug()}.md\``);
			lines.push("");
		}

		// Workspace structure summary
		const projects = listDir(join(root, "projects")).filter(
			(n) => n.endsWith("/") && n !== "_template/"
		);
		const tasks = listDir(join(root, "tasks")).filter(
			(n) => n.endsWith(".md") && n !== "README.md"
		);
		const reports = listDir(join(root, "reports")).filter((n) => n.endsWith(".md"));

		lines.push("### Workspace structure");
		lines.push("");
		lines.push("| Folder | Purpose | Convention |");
		lines.push("|--------|---------|------------|");
		lines.push("| `notes/` | Daily notes (MM-DD-YYYY.md) | Sections: Theme, Now, Later, Meetings, Notes, Projects |");
		lines.push("| `projects/` | Durable project tracking | Each is a folder with README.md |");
		lines.push("| `reports/` | Investigation reports, retros, specs | One file per report |");
		lines.push("| `tasks/` | Task records with context + evidence | One file per task (slug.md) |");

		if (projects.length > 0) {
			lines.push("");
			lines.push(`**Projects:** ${projects.map((p) => "`" + p.replace("/", "") + "`").join(", ")}`);
		}
		if (tasks.length > 0) {
			lines.push(`**Tasks:** ${tasks.map((t) => "`" + t.replace(".md", "") + "`").join(", ")}`);
		}
		if (reports.length > 0) {
			lines.push(`**Reports:** ${reports.map((r) => "`" + r.replace(".md", "") + "`").join(", ")}`);
		}

		lines.push("");
		lines.push("### Behavior");
		lines.push("");
		if (state.activeFile) {
			lines.push(
				"When the user says \"note this\", \"record this\", \"log this\", or \"save this\" — " +
					"**default to the active note file** using `notes_append`. Ask only if the target section is ambiguous."
			);
			lines.push(
				"For IDs, links, trace IDs, and key facts discovered during work — " +
					"proactively offer to record them in the active note."
			);
		} else {
			lines.push(
				"No active file is set. When the user asks to record something, ask which file to use " +
					"or suggest setting one with `/notes <path>`."
			);
		}
		lines.push("Use `notes_read` to check content before appending to avoid duplicates.");
		lines.push("Use `notes_append` with a `file` param to write to a different file than the active one.");
		lines.push("");

		return lines.join("\n");
	}

	// --- events ---

	pi.on("session_start", async (_event, ctx) => {
		restoreState(ctx);
	});

	pi.on("session_switch", async (_event, ctx) => {
		restoreState(ctx);
	});

	pi.on("session_fork", async (_event, ctx) => {
		restoreState(ctx);
	});

	pi.on("session_tree", async (_event, ctx) => {
		restoreState(ctx);
	});

	pi.on("before_agent_start", async (event) => {
		const block = buildSystemPromptBlock();
		if (block) {
			return { systemPrompt: event.systemPrompt + block };
		}
		return undefined;
	});

	// --- command ---

	pi.registerCommand("notes", {
		description:
			"Manage notes workspace and active file. Usage: /notes [path | today | new report|task|project <slug> | clear [all]]",

		getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
			const statics: AutocompleteItem[] = [
				{ value: "today", label: "today — Activate today's daily note" },
				{ value: "clear", label: "clear — Clear active file" },
				{ value: "clear all", label: "clear all — Clear workspace + active file" },
				{ value: "new report ", label: "new report <slug> — Create + activate report" },
				{ value: "new task ", label: "new task <slug> — Create + activate task" },
				{ value: "new project ", label: "new project <slug> — Create + activate project" },
			];

			// Add workspace files if we have a root set
			if (state) {
				const root = state.root;
				// Add projects
				for (const p of listDir(join(root, "projects"))) {
					if (p.endsWith("/") && p !== "_template/") {
						const name = p.replace("/", "");
						statics.push({
							value: `projects/${name}`,
							label: `projects/${name} — Project`,
						});
					}
				}
				// Add tasks
				for (const t of listDir(join(root, "tasks"))) {
					if (t.endsWith(".md") && t !== "README.md") {
						statics.push({
							value: `tasks/${t}`,
							label: `tasks/${t} — Task`,
						});
					}
				}
				// Add reports
				for (const r of listDir(join(root, "reports"))) {
					if (r.endsWith(".md")) {
						statics.push({
							value: `reports/${r}`,
							label: `reports/${r} — Report`,
						});
					}
				}
			}

			const filtered = statics.filter(
				(i) =>
					i.value.toLowerCase().startsWith(prefix.toLowerCase()) ||
					i.label.toLowerCase().includes(prefix.toLowerCase())
			);
			return filtered.length > 0 ? filtered : null;
		},

		handler: async (args, ctx) => {
			const raw = (args ?? "").trim();

			// /notes — show current state
			if (!raw) {
				if (!state) {
					ctx.ui.notify(
						"No notes workspace set. Use /notes ~/source/josh-workspace to set one.",
						"info"
					);
					return;
				}
				const rootDisplay = contractHome(state.root);
				const lines = [`📓 Workspace: ${rootDisplay}`];

				if (state.activeFile) {
					const rel = relative(state.root, state.activeFile);
					const label = fileLabel(state.root, state.activeFile);
					const exists = existsSync(state.activeFile);
					lines.push(`   Active: ${rel} (${label})${exists ? "" : " — not created yet"}`);
				} else {
					lines.push("   Active: none");
				}

				const todayPath = todayNotePath(state.root);
				lines.push(`   Today: notes/${todaySlug()}.md ${existsSync(todayPath) ? "✓" : "(not created)"}`);

				const projects = listDir(join(state.root, "projects")).filter(
					(n) => n.endsWith("/") && n !== "_template/"
				);
				if (projects.length > 0) {
					lines.push(`   Projects: ${projects.map((p) => p.replace("/", "")).join(", ")}`);
				}

				ctx.ui.notify(lines.join("\n"), "info");
				return;
			}

			// /notes clear [all]
			if (raw.toLowerCase() === "clear") {
				if (state) {
					state.activeFile = null;
					persistState();
					updateFooter(ctx);
					ctx.ui.notify("Active note cleared. Workspace still set.", "info");
				} else {
					ctx.ui.notify("Nothing to clear.", "info");
				}
				return;
			}
			if (raw.toLowerCase() === "clear all") {
				state = null;
				persistState();
				writeGlobalState(null);
				updateFooter(ctx);
				ctx.ui.notify("Notes workspace and active note cleared.", "info");
				return;
			}

			// /notes today
			if (raw.toLowerCase() === "today") {
				if (!state) {
					ctx.ui.notify("Set a workspace first: /notes ~/source/josh-workspace", "error");
					return;
				}
				const todayPath = todayNotePath(state.root);
				state.activeFile = todayPath;
				persistState();
				updateFooter(ctx);
				const exists = existsSync(todayPath);
				ctx.ui.notify(
					`📓 Active: notes/${todaySlug()}.md${exists ? "" : " (will be created on first append)"}`,
					"success"
				);
				return;
			}

			// /notes new <type> <slug>
			if (raw.toLowerCase().startsWith("new ")) {
				if (!state) {
					ctx.ui.notify("Set a workspace first: /notes ~/source/josh-workspace", "error");
					return;
				}
				const parts = raw.slice(4).trim().split(/\s+/);
				const type = parts[0]?.toLowerCase();
				const slug = parts.slice(1).join("-");

				if (!slug) {
					ctx.ui.notify(`Usage: /notes new ${type || "report|task|project"} <slug>`, "error");
					return;
				}

				let filePath: string;
				let content: string;
				const title = slug
					.replace(/-/g, " ")
					.replace(/\b\w/g, (c) => c.toUpperCase());

				if (type === "report") {
					filePath = join(state.root, "reports", `${slug}.md`);
					content = REPORT_TEMPLATE(title, slug);
				} else if (type === "task") {
					filePath = join(state.root, "tasks", `${slug}.md`);
					content = TASK_TEMPLATE(title, slug);
				} else if (type === "project") {
					const dir = join(state.root, "projects", slug);
					filePath = join(dir, "README.md");
					if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
					content = PROJECT_TEMPLATE(title);
				} else {
					ctx.ui.notify(`Unknown type "${type}". Use: report, task, or project.`, "error");
					return;
				}

				if (existsSync(filePath)) {
					// File exists — just activate it
					state.activeFile = filePath;
					persistState();
					updateFooter(ctx);
					ctx.ui.notify(
						`📓 File already exists — activated: ${contractHome(filePath)}`,
						"info"
					);
					return;
				}

				// Ensure parent dir exists
				const parentDir = dirname(filePath);
				if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });

				writeFileSync(filePath, content);
				state.activeFile = filePath;
				persistState();
				updateFooter(ctx);

				const label = fileLabel(state.root, filePath);
				ctx.ui.notify(`📓 Created + activated: ${label}\n   ${contractHome(filePath)}`, "success");
				return;
			}

			// /notes ~/path — set workspace root
			if (raw.startsWith("~") || raw.startsWith("/")) {
				const resolved = expandHome(raw);
				if (!existsSync(resolved)) {
					ctx.ui.notify(`Path does not exist: ${resolved}`, "error");
					return;
				}
				if (!statSync(resolved).isDirectory()) {
					ctx.ui.notify(`Not a directory: ${resolved}`, "error");
					return;
				}
				state = { root: resolved, activeFile: null, setAt: Date.now() };
				persistState();
				writeGlobalState(resolved);
				updateFooter(ctx);
				ctx.ui.notify(`📓 Workspace: ${contractHome(resolved)}`, "success");
				return;
			}

			// /notes <relative-path> — activate a file within the workspace
			if (!state) {
				ctx.ui.notify(
					"Set a workspace first: /notes ~/source/josh-workspace",
					"error"
				);
				return;
			}

			const filePath = resolveNotePath(state.root, raw);
			const exists = existsSync(filePath);
			state.activeFile = filePath;
			persistState();
			updateFooter(ctx);

			const label = fileLabel(state.root, filePath);
			const rel = relative(state.root, filePath);
			ctx.ui.notify(
				`📓 Active: ${label}\n   ${rel}${exists ? "" : " (will be created on first append)"}`,
				"success"
			);
		},
	});

	// ---------------------------------------------------------------------------
	// Tool: notes_append
	// ---------------------------------------------------------------------------

	pi.registerTool({
		name: "notes_append",
		label: "Notes Append",
		description:
			"Append content to a section of a markdown file in the notes workspace. " +
			"Defaults to the active note file if no file is specified. " +
			"Use for recording IDs, links, findings, decisions, log entries, or any structured info.",
		parameters: Type.Object({
			section: Type.String({
				description:
					'Markdown section heading to append under (e.g. "Notes", "Identifiers", "## Updates", "## Now", "## Log"). ' +
					"Include ## prefix or just the name — both work.",
			}),
			content: Type.String({
				description:
					"Content to append. Markdown formatted. Include `- ` for list items, `| col | col |` for table rows, etc.",
			}),
			file: Type.Optional(
				Type.String({
					description:
						'Optional: file path relative to workspace root. Omit to use the active note file. ' +
						'Use "today" for today\'s daily note.',
				})
			),
		}),
		async execute(_toolCallId, params) {
			if (!state) {
				return {
					content: [{ type: "text", text: "Error: No notes workspace set. Use /notes <path> first." }],
					details: {},
				};
			}

			let filePath: string;
			if (params.file) {
				filePath = resolveNotePath(state.root, params.file);
			} else if (state.activeFile) {
				filePath = state.activeFile;
			} else {
				return {
					content: [
						{
							type: "text",
							text: 'Error: No active note file and no file specified. Set one with /notes <path> or pass a "file" parameter.',
						},
					],
					details: {},
				};
			}

			if (!existsSync(filePath)) {
				return {
					content: [
						{
							type: "text",
							text: `Error: File not found: ${contractHome(filePath)}. Create it first with /notes new or the write tool.`,
						},
					],
					details: {},
				};
			}

			const result = appendToSection(filePath, params.section, params.content);
			const rel = relative(state.root, filePath);

			return {
				content: [
					{
						type: "text",
						text: result.ok
							? `✓ ${result.detail} in ${rel}`
							: `Error: ${result.detail}`,
					},
				],
				details: {},
			};
		},
	});

	// ---------------------------------------------------------------------------
	// Tool: notes_read
	// ---------------------------------------------------------------------------

	pi.registerTool({
		name: "notes_read",
		label: "Notes Read",
		description:
			"Read a file (or a specific section) from the notes workspace. " +
			"Defaults to the active note file if no file is specified. " +
			"Use to check existing content before appending, or review context.",
		parameters: Type.Object({
			file: Type.Optional(
				Type.String({
					description:
						'File path relative to workspace root. Omit to read the active note file. ' +
						'Use "today" for today\'s daily note.',
				})
			),
			section: Type.Optional(
				Type.String({
					description:
						"Optional: only return content from this section heading. Omit for the full file.",
				})
			),
		}),
		async execute(_toolCallId, params) {
			if (!state) {
				return {
					content: [{ type: "text", text: "Error: No notes workspace set. Use /notes <path> first." }],
					details: {},
				};
			}

			let filePath: string;
			if (params.file) {
				filePath = resolveNotePath(state.root, params.file);
			} else if (state.activeFile) {
				filePath = state.activeFile;
			} else {
				return {
					content: [
						{
							type: "text",
							text: 'Error: No active note file and no file specified. Set one with /notes <path> or pass a "file" parameter.',
						},
					],
					details: {},
				};
			}

			if (!existsSync(filePath)) {
				return {
					content: [{ type: "text", text: `File not found: ${contractHome(filePath)}` }],
					details: {},
				};
			}

			const raw = readFileSync(filePath, "utf-8");
			const rel = relative(state.root, filePath);

			if (!params.section) {
				return {
					content: [{ type: "text", text: raw }],
					details: { path: rel, lines: raw.split("\n").length },
				};
			}

			// Extract section
			const heading = params.section.startsWith("#") ? params.section : `## ${params.section}`;
			const headingLevel = (heading.match(/^#+/) || ["##"])[0].length;
			const lines = raw.split("\n");
			let sectionStart = -1;
			let sectionEnd = lines.length;

			for (let i = 0; i < lines.length; i++) {
				const match = lines[i].match(/^(#{1,6})\s/);
				if (match) {
					if (sectionStart === -1) {
						if (lines[i].trim().toLowerCase() === heading.trim().toLowerCase()) {
							sectionStart = i;
						}
					} else if (match[1].length <= headingLevel) {
						sectionEnd = i;
						break;
					}
				}
			}

			if (sectionStart === -1) {
				return {
					content: [{ type: "text", text: `Section "${heading}" not found in ${rel}` }],
					details: {},
				};
			}

			return {
				content: [{ type: "text", text: lines.slice(sectionStart, sectionEnd).join("\n") }],
				details: { path: rel, section: heading },
			};
		},
	});

	// ---------------------------------------------------------------------------
	// Tool: notes_list
	// ---------------------------------------------------------------------------

	pi.registerTool({
		name: "notes_list",
		label: "Notes List",
		description:
			"List files and folders in the notes workspace. Use to discover available projects, tasks, reports, or daily notes.",
		parameters: Type.Object({
			folder: Type.Optional(
				Type.String({
					description:
						'Subfolder relative to workspace root (e.g. "projects", "tasks", "reports", "notes"). Omit for workspace root.',
				})
			),
		}),
		async execute(_toolCallId, params) {
			if (!state) {
				return {
					content: [{ type: "text", text: "Error: No notes workspace set. Use /notes <path> first." }],
					details: {},
				};
			}

			const dir = params.folder ? join(state.root, params.folder) : state.root;

			if (!existsSync(dir)) {
				return {
					content: [{ type: "text", text: `Directory not found: ${contractHome(dir)}` }],
					details: {},
				};
			}

			const entries = listDir(dir);

			if (entries.length === 0) {
				return {
					content: [{ type: "text", text: `Empty: ${contractHome(dir)}` }],
					details: {},
				};
			}

			const header = `${contractHome(dir)}/`;
			return {
				content: [{ type: "text", text: `${header}\n${"─".repeat(40)}\n${entries.join("\n")}` }],
				details: { count: entries.length },
			};
		},
	});
}
