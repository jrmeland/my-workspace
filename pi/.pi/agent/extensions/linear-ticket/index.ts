/**
 * Linear Ticket Context Extension
 *
 * Sets an active Linear ticket as ambient context for the session.
 * The agent automatically knows which ticket you're talking about,
 * so you can say "add a comment", "create a sub-issue", "mark it done"
 * without specifying the ticket ID.
 *
 * Usage:
 *   /ticket ENC-42              Set active ticket
 *   /ticket ENC-42 --comments   Set active ticket and load recent comments
 *   /ticket                     Show current ticket info
 *   /ticket clear               Remove ticket context
 *   /ticket refresh             Re-fetch current ticket from Linear
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { AutocompleteItem } from "@mariozechner/pi-tui";

interface TicketComment {
	id: string;
	body: string;
	user: string;
	createdAt: string;
}

interface TicketData {
	id: string;
	title: string;
	status: string;
	project: string | null;
	projectId: string | null;
	assignee: string | null;
	assigneeId: string | null;
	labels: string[];
	priority: string | null;
	description: string | null;
	url: string;
	parentId: string | null;
	team: string;
	teamId: string;
	dueDate: string | null;
	createdBy: string | null;
	gitBranchName: string | null;
}

interface TicketState {
	ticket: TicketData;
	comments: TicketComment[] | null;
	fetchedAt: number;
}

export default function linearTicketExtension(pi: ExtensionAPI) {
	let state: TicketState | null = null;

	// --- helpers ---

	async function mcporter(tool: string, args: Record<string, string>): Promise<any> {
		const argParts = Object.entries(args).map(([k, v]) => `${k}=${v}`);
		const result = await pi.exec("mcporter", ["call", `linear-server.${tool}`, ...argParts], {
			timeout: 30_000,
		});
		if (result.code !== 0) {
			throw new Error(`mcporter call failed: ${result.stderr || result.stdout}`);
		}
		return JSON.parse(result.stdout);
	}

	async function fetchTicket(id: string): Promise<TicketData> {
		const data = await mcporter("get_issue", { id, includeRelations: "true" });
		return {
			id: data.id ?? id,
			title: data.title ?? "",
			status: data.status ?? "Unknown",
			project: data.project ?? null,
			projectId: data.projectId ?? null,
			assignee: data.assignee ?? null,
			assigneeId: data.assigneeId ?? null,
			labels: (data.labels ?? []).map((l: any) => (typeof l === "string" ? l : l.name)),
			priority: data.priority?.name ?? null,
			description: data.description ?? null,
			url: data.url ?? "",
			parentId: data.parentId ?? null,
			team: data.team ?? "Enclaiva",
			teamId: data.teamId ?? "",
			dueDate: data.dueDate ?? null,
			createdBy: data.createdBy ?? null,
			gitBranchName: data.gitBranchName ?? null,
		};
	}

	async function fetchComments(issueId: string, limit = 10): Promise<TicketComment[]> {
		const data = await mcporter("list_comments", {
			issueId,
			limit: String(limit),
			orderBy: "createdAt",
		});
		return (data.comments ?? []).map((c: any) => ({
			id: c.id,
			body: c.body ?? "",
			user: c.author?.name ?? c.author?.email ?? c.user?.name ?? c.userId ?? "Unknown",
			createdAt: c.createdAt ?? "",
		}));
	}

	function updateFooter(ctx: ExtensionContext) {
		const theme = ctx.ui.theme;
		if (!state) {
			ctx.ui.setStatus("linear-ticket", undefined);
			return;
		}
		const t = state.ticket;
		const icon = theme.fg("accent", "🎫");
		const id = theme.fg("accent", t.id);
		const title = theme.fg("muted", truncate(t.title, 40));
		const status = theme.fg("dim", t.status);
		ctx.ui.setStatus("linear-ticket", `${icon} ${id} · ${title} · ${status}`);
	}

	function truncate(s: string, max: number): string {
		return s.length > max ? s.slice(0, max - 1) + "…" : s;
	}

	function buildSystemPromptBlock(): string {
		if (!state) return "";
		const t = state.ticket;
		const lines: string[] = [
			"",
			"## Active Linear Ticket",
			`- **ID:** ${t.id}`,
			`- **Title:** ${t.title}`,
			`- **Status:** ${t.status}`,
		];
		if (t.project) lines.push(`- **Project:** ${t.project}`);
		if (t.assignee) lines.push(`- **Assignee:** ${t.assignee}`);
		if (t.labels.length) lines.push(`- **Labels:** ${t.labels.join(", ")}`);
		if (t.priority) lines.push(`- **Priority:** ${t.priority}`);
		if (t.parentId) lines.push(`- **Parent:** ${t.parentId}`);
		if (t.dueDate) lines.push(`- **Due:** ${t.dueDate}`);
		if (t.gitBranchName) lines.push(`- **Branch:** ${t.gitBranchName}`);
		lines.push(`- **URL:** ${t.url}`);

		if (state.comments && state.comments.length > 0) {
			lines.push("");
			lines.push("### Recent comments");
			for (const c of state.comments) {
				const date = c.createdAt ? c.createdAt.slice(0, 10) : "";
				lines.push(`- **${c.user}** (${date}): ${truncate(c.body.replace(/\n/g, " "), 200)}`);
			}
		}

		lines.push("");
		lines.push(
			'When the user refers to "our ticket", "the ticket", "this issue", or similar — they mean ' +
				t.id +
				"."
		);
		lines.push(
			"To create a sub-issue, use parentId=" +
				t.id +
				". To comment, use issueId=" +
				t.id +
				"."
		);
		lines.push("Use `mcporter call linear-server.*` via bash to interact with Linear.");
		lines.push("");

		return lines.join("\n");
	}

	// --- state persistence ---

	function persistState() {
		pi.appendEntry("linear-ticket", state ? { state } : { state: null });
	}

	function restoreState(ctx: ExtensionContext) {
		state = null;
		// Walk entries to find the last persisted ticket state
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type === "custom" && entry.customType === "linear-ticket") {
				const data = entry.data as { state: TicketState | null } | undefined;
				state = data?.state ?? null;
			}
		}
		updateFooter(ctx);
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

	// Inject ticket context into system prompt every turn
	pi.on("before_agent_start", async (event) => {
		const block = buildSystemPromptBlock();
		if (block) {
			return {
				systemPrompt: event.systemPrompt + block,
			};
		}
		return undefined;
	});

	// --- command ---

	pi.registerCommand("ticket", {
		description: "Set, show, refresh, or clear the active Linear ticket. Usage: /ticket ENC-42 [--comments]",

		getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
			const statics = [
				{ value: "clear", label: "clear — Remove ticket context" },
				{ value: "refresh", label: "refresh — Re-fetch current ticket" },
			];
			if (state) {
				statics.unshift({
					value: state.ticket.id,
					label: `${state.ticket.id} — ${state.ticket.title} (current)`,
				});
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
			const parts = raw.split(/\s+/);
			const withComments = parts.includes("--comments");
			const positional = parts.filter((p) => p !== "--comments");
			const arg = positional[0] ?? "";

			// /ticket — show current
			if (!arg) {
				if (!state) {
					ctx.ui.notify("No active ticket. Use /ticket ENC-42 to set one.", "info");
					return;
				}
				const t = state.ticket;
				const lines = [
					`🎫 ${t.id}: ${t.title}`,
					`   Status: ${t.status} | Project: ${t.project ?? "—"} | Assignee: ${t.assignee ?? "—"}`,
					`   Priority: ${t.priority ?? "—"} | Labels: ${t.labels.join(", ") || "—"}`,
					`   URL: ${t.url}`,
				];
				if (t.parentId) lines.push(`   Parent: ${t.parentId}`);
				if (t.gitBranchName) lines.push(`   Branch: ${t.gitBranchName}`);
				if (state.comments) {
					lines.push(`   Comments loaded: ${state.comments.length}`);
				}
				ctx.ui.notify(lines.join("\n"), "info");
				return;
			}

			// /ticket clear
			if (arg.toLowerCase() === "clear") {
				state = null;
				persistState();
				updateFooter(ctx);
				ctx.ui.notify("Ticket context cleared.", "info");
				return;
			}

			// /ticket refresh
			if (arg.toLowerCase() === "refresh") {
				if (!state) {
					ctx.ui.notify("No active ticket to refresh.", "error");
					return;
				}
				try {
					const ticket = await fetchTicket(state.ticket.id);
					const comments =
						state.comments !== null ? await fetchComments(ticket.id) : null;
					state = { ticket, comments, fetchedAt: Date.now() };
					persistState();
					updateFooter(ctx);
					ctx.ui.notify(`Refreshed ${ticket.id}: ${ticket.title}`, "success");
				} catch (e: any) {
					ctx.ui.notify(`Failed to refresh: ${e.message}`, "error");
				}
				return;
			}

			// /ticket ENC-42 [--comments]
			try {
				const ticket = await fetchTicket(arg);
				const comments = withComments ? await fetchComments(ticket.id) : null;
				state = { ticket, comments, fetchedAt: Date.now() };
				persistState();
				updateFooter(ctx);

				let msg = `🎫 Active ticket: ${ticket.id} — ${ticket.title}`;
				if (comments) msg += ` (${comments.length} comments loaded)`;
				ctx.ui.notify(msg, "success");
			} catch (e: any) {
				ctx.ui.notify(`Failed to fetch ${arg}: ${e.message}`, "error");
			}
		},
	});
}
