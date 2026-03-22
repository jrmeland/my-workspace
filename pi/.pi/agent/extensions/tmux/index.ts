/**
 * Tmux Extension — Native tmux session access for pi
 *
 * Gives the LLM tools to create, interact with, and monitor tmux sessions,
 * either locally or over SSH. Useful for long-running processes, multiple
 * terminal sessions, watching logs, and remote server work.
 *
 * Usage:
 *   pi -e ./tmux                          # Local tmux
 *   pi -e ./tmux --tmux-ssh user@host     # Remote tmux via SSH
 *
 * Tools provided:
 *   tmux_start   — Create a new tmux session or attach to an existing one
 *   tmux_send    — Send keys/commands to a tmux pane
 *   tmux_read    — Capture visible or scrollback content from a pane
 *   tmux_list    — List sessions, windows, and panes
 *   tmux_new_window — Create a new window in a session
 *   tmux_split   — Split a pane horizontally or vertically
 *   tmux_kill    — Kill a session, window, or pane
 *   tmux_resize  — Resize a pane
 *   tmux_select  — Select (focus) a pane or window
 *
 * Flags:
 *   --tmux-ssh user@host   Route all tmux commands through SSH
 *
 * Requirements:
 *   - tmux installed locally (or on the remote host)
 *   - For SSH: key-based auth configured (no password prompts)
 */

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
	truncateHead,
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
} from "@mariozechner/pi-coding-agent";
import { Type, type Static } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";

/** Default scrollback history for new sessions (lines). */
const DEFAULT_SCROLLBACK = 50000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ExecResult {
	stdout: string;
	stderr: string;
	code: number | null;
}

/**
 * Execute a command, optionally routed through SSH.
 */
function execCommand(
	command: string,
	sshTarget?: string,
	signal?: AbortSignal,
): Promise<ExecResult> {
	return new Promise((resolve, reject) => {
		let proc: ReturnType<typeof spawn>;

		if (sshTarget) {
			proc = spawn("ssh", ["-o", "BatchMode=yes", sshTarget, command], {
				stdio: ["ignore", "pipe", "pipe"],
			});
		} else {
			proc = spawn("bash", ["-c", command], {
				stdio: ["ignore", "pipe", "pipe"],
			});
		}

		const stdoutChunks: Buffer[] = [];
		const stderrChunks: Buffer[] = [];

		proc.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
		proc.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

		const onAbort = () => proc.kill();
		signal?.addEventListener("abort", onAbort, { once: true });

		proc.on("error", (err) => {
			signal?.removeEventListener("abort", onAbort);
			reject(err);
		});

		proc.on("close", (code) => {
			signal?.removeEventListener("abort", onAbort);
			if (signal?.aborted) {
				reject(new Error("aborted"));
				return;
			}
			resolve({
				stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
				stderr: Buffer.concat(stderrChunks).toString("utf-8"),
				code,
			});
		});
	});
}

/**
 * Run a tmux command, optionally via SSH.
 */
async function tmux(
	args: string,
	sshTarget?: string,
	signal?: AbortSignal,
): Promise<ExecResult> {
	return execCommand(`tmux ${args}`, sshTarget, signal);
}

/**
 * Shell-escape a string for safe interpolation.
 */
function shellEscape(s: string): string {
	return `'${s.replace(/'/g, "'\\''")}'`;
}

// ─── Tool schemas ─────────────────────────────────────────────────────────────

const TmuxStartParams = Type.Object({
	session_name: Type.String({ description: "Name for the tmux session" }),
	command: Type.Optional(
		Type.String({ description: "Initial command to run in the session (optional)" }),
	),
	width: Type.Optional(
		Type.Number({ description: "Terminal width in columns (default: 200)" }),
	),
	height: Type.Optional(
		Type.Number({ description: "Terminal height in rows (default: 50)" }),
	),
});

const TmuxSendParams = Type.Object({
	target: Type.String({
		description:
			"Tmux target pane: 'session:window.pane' (e.g. 'main:0.0'). Use tmux_list to discover targets.",
	}),
	text: Type.Optional(
		Type.String({
			description:
				"Text to type into the pane (sent literally). Use this for shell commands, input text, etc.",
		}),
	),
	keys: Type.Optional(
		Type.String({
			description:
				"Special tmux key names to send (space-separated), e.g. 'Enter', 'C-c', 'C-d', 'Escape', 'Up Up Enter'. Not sent literally — tmux interprets these as key names.",
		}),
	),
	enter: Type.Optional(
		Type.Boolean({
			description:
				"If true, send Enter after the text (default: true when text is provided). Convenient shorthand for running commands.",
		}),
	),
});

const TmuxReadParams = Type.Object({
	target: Type.String({
		description: "Tmux target pane: 'session:window.pane' (e.g. 'main:0.0')",
	}),
	wait_ms: Type.Optional(
		Type.Number({
			description:
				"Wait this many milliseconds before capturing, to let output settle after a command. Useful after tmux_send. Typical values: 500-3000.",
		}),
	),
	start_line: Type.Optional(
		Type.Number({
			description:
				"Start line for capture. Negative = scrollback history lines (e.g. -500). Default: capture visible pane only.",
		}),
	),
	line_count: Type.Optional(
		Type.Number({
			description:
				"Number of lines to capture from start_line. Default: all lines from start_line to bottom of visible pane.",
		}),
	),
});

const TmuxListParams = Type.Object({
	level: StringEnum(["sessions", "windows", "panes"] as const, {
		description: "What to list: sessions, windows, or panes",
	}),
	target: Type.Optional(
		Type.String({
			description:
				"Filter to a specific session or window (e.g. 'main' or 'main:0')",
		}),
	),
});

const TmuxNewWindowParams = Type.Object({
	session_name: Type.String({ description: "Session to create the window in" }),
	window_name: Type.Optional(
		Type.String({ description: "Name for the new window" }),
	),
	command: Type.Optional(
		Type.String({ description: "Command to run in the new window" }),
	),
});

const TmuxSplitParams = Type.Object({
	target: Type.String({
		description: "Target pane to split: 'session:window.pane'",
	}),
	direction: StringEnum(["horizontal", "vertical"] as const, {
		description: "Split direction: horizontal (-h) or vertical (-v)",
	}),
	percent: Type.Optional(
		Type.Number({
			description: "Size of the new pane as percentage (e.g. 30)",
		}),
	),
	command: Type.Optional(
		Type.String({ description: "Command to run in the new pane" }),
	),
});

const TmuxKillParams = Type.Object({
	level: StringEnum(["session", "window", "pane"] as const, {
		description: "What to kill: session, window, or pane",
	}),
	target: Type.String({
		description:
			"Target to kill (e.g. 'main' for session, 'main:1' for window, 'main:1.0' for pane)",
	}),
});

const TmuxResizeParams = Type.Object({
	target: Type.String({
		description: "Target pane: 'session:window.pane'",
	}),
	direction: StringEnum(["up", "down", "left", "right"] as const, {
		description: "Direction to resize",
	}),
	amount: Type.Optional(
		Type.Number({ description: "Number of cells to resize by (default: 5)" }),
	),
});

const TmuxSelectParams = Type.Object({
	target: Type.String({
		description:
			"Target to select/focus: 'session:window' for window or 'session:window.pane' for pane",
	}),
	type: StringEnum(["window", "pane"] as const, {
		description: "Whether to select a window or a pane",
	}),
});

// ─── Extension ────────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.registerFlag("tmux-ssh", {
		description: "Route tmux commands through SSH (e.g. user@host)",
		type: "string",
	});

	let sshTarget: string | undefined;

	// ── tmux_start ──────────────────────────────────────────────────────────

	pi.registerTool({
		name: "tmux_start",
		label: "Tmux Start",
		description:
			"Create a new tmux session. If a session with the given name already exists, reports it. Returns session info on success.",
		promptSnippet: "Create or verify a named tmux session",
		parameters: TmuxStartParams,
		async execute(_toolCallId, params, signal) {
			const { session_name, command, width, height } = params as Static<
				typeof TmuxStartParams
			>;
			const w = width ?? 200;
			const h = height ?? 50;

			// Check if session already exists
			const check = await tmux(
				`has-session -t ${shellEscape(session_name)} 2>/dev/null`,
				sshTarget,
				signal,
			);

			if (check.code === 0) {
				// Session exists — gather info
				const info = await tmux(
					`list-windows -t ${shellEscape(session_name)} -F '#{window_index}: #{window_name} (#{window_panes} panes)'`,
					sshTarget,
					signal,
				);
				const windowCount = info.stdout.trim().split("\n").filter(Boolean).length;
				return {
					content: [
						{
							type: "text" as const,
							text: `Session '${session_name}' already exists with ${windowCount} window(s).\n${info.stdout.trim()}`,
						},
					],
					details: { existed: true, session_name, windows: windowCount },
				};
			}

			// Create new session (detached)
			let cmd = `new-session -d -s ${shellEscape(session_name)} -x ${w} -y ${h}`;
			if (command) {
				cmd += ` ${shellEscape(command)}`;
			}
			const result = await tmux(cmd, sshTarget, signal);

			if (result.code !== 0) {
				throw new Error(
					`Failed to create tmux session: ${result.stderr.trim()}`,
				);
			}

			// Set large scrollback buffer so we don't lose output history
			await tmux(
				`set-option -t ${shellEscape(session_name)} history-limit ${DEFAULT_SCROLLBACK}`,
				sshTarget,
				signal,
			);

			return {
				content: [
					{
						type: "text" as const,
						text: `Created tmux session '${session_name}' (${w}x${h}, scrollback: ${DEFAULT_SCROLLBACK})${command ? ` running: ${command}` : ""}`,
					},
				],
				details: { existed: false, session_name, width: w, height: h },
			};
		},
	});

	// ── tmux_send ───────────────────────────────────────────────────────────

	pi.registerTool({
		name: "tmux_send",
		label: "Tmux Send",
		description:
			"Send text and/or special keys to a tmux pane. For running a shell command, provide text with enter=true (the default). For special keys (C-c to interrupt, Up for history, etc.), use the keys parameter. Both can be combined: text is sent first (literally), then keys.",
		promptSnippet:
			"Send text/keys to a tmux pane (text is typed literally, keys are tmux key names)",
		promptGuidelines: [
			"To run a command in tmux: tmux_send with text='your command' (enter defaults to true).",
			"To interrupt a process: tmux_send with keys='C-c'.",
			"To send text without pressing Enter: tmux_send with text='partial input' and enter=false.",
			"To navigate history: tmux_send with keys='Up Enter'.",
		],
		parameters: TmuxSendParams,
		async execute(_toolCallId, params, signal) {
			const { target, text, keys, enter } = params as Static<
				typeof TmuxSendParams
			>;

			if (!text && !keys) {
				throw new Error(
					"At least one of 'text' or 'keys' must be provided.",
				);
			}

			const parts: string[] = [];

			// Send literal text first
			if (text) {
				const result = await tmux(
					`send-keys -t ${shellEscape(target)} -l ${shellEscape(text)}`,
					sshTarget,
					signal,
				);
				if (result.code !== 0) {
					throw new Error(
						`Failed to send text to ${target}: ${result.stderr.trim()}`,
					);
				}
				parts.push(`text: ${JSON.stringify(text)}`);
			}

			// Send Enter if requested (default true when text is provided)
			const shouldEnter = enter ?? (text !== undefined);
			if (shouldEnter) {
				const result = await tmux(
					`send-keys -t ${shellEscape(target)} Enter`,
					sshTarget,
					signal,
				);
				if (result.code !== 0) {
					throw new Error(
						`Failed to send Enter to ${target}: ${result.stderr.trim()}`,
					);
				}
				if (!keys) parts.push("Enter");
			}

			// Send special keys
			if (keys) {
				const result = await tmux(
					`send-keys -t ${shellEscape(target)} ${keys}`,
					sshTarget,
					signal,
				);
				if (result.code !== 0) {
					throw new Error(
						`Failed to send keys to ${target}: ${result.stderr.trim()}`,
					);
				}
				parts.push(`keys: ${keys}`);
			}

			return {
				content: [
					{
						type: "text" as const,
						text: `Sent to ${target}: ${parts.join(", ")}`,
					},
				],
				details: { target, text, keys, enter: shouldEnter },
			};
		},
	});

	// ── tmux_read ───────────────────────────────────────────────────────────

	pi.registerTool({
		name: "tmux_read",
		label: "Tmux Read",
		description:
			"Capture the content of a tmux pane. By default captures only the visible area. Use start_line with a negative number to include scrollback history (e.g. -500 for last 500 lines of scrollback). Useful for checking command output, monitoring logs, or reading program state.",
		promptSnippet:
			"Capture content from a tmux pane (visible or scrollback)",
		parameters: TmuxReadParams,
		async execute(_toolCallId, params, signal) {
			const { target, wait_ms, start_line, line_count } = params as Static<
				typeof TmuxReadParams
			>;

			// Wait for output to settle if requested
			if (wait_ms && wait_ms > 0) {
				const clamped = Math.min(wait_ms, 30000); // cap at 30s
				await sleep(clamped, undefined, { signal });
			}

			// Build capture-pane command
			let captureArgs = `-t ${shellEscape(target)} -p`;
			if (start_line !== undefined) {
				captureArgs += ` -S ${start_line}`;
			}
			if (start_line !== undefined && line_count !== undefined) {
				captureArgs += ` -E ${start_line + line_count}`;
			}

			const result = await tmux(
				`capture-pane ${captureArgs}`,
				sshTarget,
				signal,
			);

			if (result.code !== 0) {
				throw new Error(
					`Failed to capture pane ${target}: ${result.stderr.trim()}`,
				);
			}

			let output = result.stdout;

			// Trim trailing blank lines for cleaner output
			output = output.replace(/\n+$/, "\n");

			// Apply truncation
			const truncation = truncateHead(output, {
				maxLines: DEFAULT_MAX_LINES,
				maxBytes: DEFAULT_MAX_BYTES,
			});

			let content = truncation.content;
			if (truncation.truncated) {
				content += `\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)})]`;
			}

			return {
				content: [{ type: "text" as const, text: content }],
				details: {
					target,
					lines: truncation.totalLines,
					truncated: truncation.truncated,
				},
			};
		},
	});

	// ── tmux_list ───────────────────────────────────────────────────────────

	pi.registerTool({
		name: "tmux_list",
		label: "Tmux List",
		description:
			"List tmux sessions, windows, or panes. Use this to discover targets for other tmux tools.",
		promptSnippet: "List tmux sessions, windows, or panes",
		parameters: TmuxListParams,
		async execute(_toolCallId, params, signal) {
			const { level, target } = params as Static<typeof TmuxListParams>;

			let cmd: string;
			switch (level) {
				case "sessions":
					cmd =
						'list-sessions -F "#{session_name}: #{session_windows} windows (created #{session_created_string})#{?session_attached, (attached),}"';
					break;
				case "windows":
					cmd = target
						? `list-windows -t ${shellEscape(target)} -F "#{window_index}: #{window_name}#{?window_active, (active),} (#{window_panes} panes)"`
						: 'list-windows -a -F "#{session_name}:#{window_index}: #{window_name}#{?window_active, (active),} (#{window_panes} panes)"';
					break;
				case "panes":
					cmd = target
						? `list-panes -t ${shellEscape(target)} -F "#{pane_index}: #{pane_width}x#{pane_height}#{?pane_active, (active),} [#{pane_current_command}] #{pane_current_path}"`
						: 'list-panes -a -F "#{session_name}:#{window_index}.#{pane_index}: #{pane_width}x#{pane_height}#{?pane_active, (active),} [#{pane_current_command}] #{pane_current_path}"';
					break;
			}

			const result = await tmux(cmd, sshTarget, signal);

			if (result.code !== 0) {
				// No server running or no sessions is common
				if (
					result.stderr.includes("no server running") ||
					result.stderr.includes("no sessions")
				) {
					return {
						content: [
							{
								type: "text" as const,
								text: `No tmux ${level} found.`,
							},
						],
						details: { level, count: 0 },
					};
				}
				throw new Error(
					`Failed to list ${level}: ${result.stderr.trim()}`,
				);
			}

			const output = result.stdout.trim();
			const count = output ? output.split("\n").length : 0;

			return {
				content: [
					{
						type: "text" as const,
						text: output || `No ${level} found.`,
					},
				],
				details: { level, target, count },
			};
		},
	});

	// ── tmux_new_window ─────────────────────────────────────────────────────

	pi.registerTool({
		name: "tmux_new_window",
		label: "Tmux New Window",
		description:
			"Create a new window in an existing tmux session.",
		promptSnippet: "Create a new window in a tmux session",
		parameters: TmuxNewWindowParams,
		async execute(_toolCallId, params, signal) {
			const { session_name, window_name, command } = params as Static<
				typeof TmuxNewWindowParams
			>;

			let cmd = `new-window -t ${shellEscape(session_name)}`;
			if (window_name) {
				cmd += ` -n ${shellEscape(window_name)}`;
			}
			if (command) {
				cmd += ` ${shellEscape(command)}`;
			}

			const result = await tmux(cmd, sshTarget, signal);

			if (result.code !== 0) {
				throw new Error(
					`Failed to create window: ${result.stderr.trim()}`,
				);
			}

			// Get the new window info
			const info = await tmux(
				`display-message -t ${shellEscape(session_name)} -p '#{window_index}: #{window_name}'`,
				sshTarget,
				signal,
			);

			return {
				content: [
					{
						type: "text" as const,
						text: `Created new window in '${session_name}': ${info.stdout.trim()}${command ? ` running: ${command}` : ""}`,
					},
				],
				details: { session_name, window_name, command },
			};
		},
	});

	// ── tmux_split ──────────────────────────────────────────────────────────

	pi.registerTool({
		name: "tmux_split",
		label: "Tmux Split",
		description:
			"Split a tmux pane horizontally (side-by-side) or vertically (top/bottom).",
		promptSnippet: "Split a tmux pane horizontally or vertically",
		parameters: TmuxSplitParams,
		async execute(_toolCallId, params, signal) {
			const { target, direction, percent, command } = params as Static<
				typeof TmuxSplitParams
			>;

			const flag = direction === "horizontal" ? "-h" : "-v";
			let cmd = `split-window ${flag} -t ${shellEscape(target)}`;
			if (percent) {
				cmd += ` -p ${percent}`;
			}
			if (command) {
				cmd += ` ${shellEscape(command)}`;
			}

			const result = await tmux(cmd, sshTarget, signal);

			if (result.code !== 0) {
				throw new Error(
					`Failed to split pane ${target}: ${result.stderr.trim()}`,
				);
			}

			return {
				content: [
					{
						type: "text" as const,
						text: `Split ${target} ${direction}ly${percent ? ` (${percent}%)` : ""}${command ? ` running: ${command}` : ""}`,
					},
				],
				details: { target, direction, percent, command },
			};
		},
	});

	// ── tmux_kill ───────────────────────────────────────────────────────────

	pi.registerTool({
		name: "tmux_kill",
		label: "Tmux Kill",
		description: "Kill a tmux session, window, or pane.",
		promptSnippet: "Kill a tmux session, window, or pane",
		parameters: TmuxKillParams,
		async execute(_toolCallId, params, signal) {
			const { level, target } = params as Static<typeof TmuxKillParams>;

			let cmd: string;
			switch (level) {
				case "session":
					cmd = `kill-session -t ${shellEscape(target)}`;
					break;
				case "window":
					cmd = `kill-window -t ${shellEscape(target)}`;
					break;
				case "pane":
					cmd = `kill-pane -t ${shellEscape(target)}`;
					break;
			}

			const result = await tmux(cmd, sshTarget, signal);

			if (result.code !== 0) {
				throw new Error(
					`Failed to kill ${level} '${target}': ${result.stderr.trim()}`,
				);
			}

			return {
				content: [
					{
						type: "text" as const,
						text: `Killed ${level} '${target}'`,
					},
				],
				details: { level, target },
			};
		},
	});

	// ── tmux_resize ─────────────────────────────────────────────────────────

	pi.registerTool({
		name: "tmux_resize",
		label: "Tmux Resize",
		description: "Resize a tmux pane in a given direction.",
		promptSnippet: "Resize a tmux pane",
		parameters: TmuxResizeParams,
		async execute(_toolCallId, params, signal) {
			const { target, direction, amount } = params as Static<
				typeof TmuxResizeParams
			>;
			const n = amount ?? 5;

			const flag = {
				up: "-U",
				down: "-D",
				left: "-L",
				right: "-R",
			}[direction];

			const result = await tmux(
				`resize-pane -t ${shellEscape(target)} ${flag} ${n}`,
				sshTarget,
				signal,
			);

			if (result.code !== 0) {
				throw new Error(
					`Failed to resize pane ${target}: ${result.stderr.trim()}`,
				);
			}

			return {
				content: [
					{
						type: "text" as const,
						text: `Resized ${target} ${direction} by ${n} cells`,
					},
				],
				details: { target, direction, amount: n },
			};
		},
	});

	// ── tmux_select ─────────────────────────────────────────────────────────

	pi.registerTool({
		name: "tmux_select",
		label: "Tmux Select",
		description:
			"Select (focus) a tmux window or pane. Useful before sending keys to ensure the right pane is active.",
		promptSnippet: "Select/focus a tmux window or pane",
		parameters: TmuxSelectParams,
		async execute(_toolCallId, params, signal) {
			const { target, type } = params as Static<typeof TmuxSelectParams>;

			let cmd: string;
			if (type === "window") {
				cmd = `select-window -t ${shellEscape(target)}`;
			} else {
				cmd = `select-pane -t ${shellEscape(target)}`;
			}

			const result = await tmux(cmd, sshTarget, signal);

			if (result.code !== 0) {
				throw new Error(
					`Failed to select ${type} '${target}': ${result.stderr.trim()}`,
				);
			}

			return {
				content: [
					{
						type: "text" as const,
						text: `Selected ${type} '${target}'`,
					},
				],
				details: { target, type },
			};
		},
	});

	// ── Commands ────────────────────────────────────────────────────────────

	pi.registerCommand("tmux", {
		description: "Show tmux extension status and active sessions",
		handler: async (_args, ctx) => {
			const mode = sshTarget ? `SSH (${sshTarget})` : "Local";
			let msg = `Tmux extension — Mode: ${mode}\n`;

			const result = await tmux(
				'list-sessions -F "#{session_name}: #{session_windows} windows#{?session_attached, (attached),}" 2>/dev/null',
				sshTarget,
			);

			if (result.code !== 0 || !result.stdout.trim()) {
				msg += "No active tmux sessions.";
			} else {
				msg += `\nActive sessions:\n${result.stdout.trim()}`;
			}

			ctx.ui.notify(msg, "info");
		},
	});

	// ── Events ──────────────────────────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		// Resolve SSH target from flag
		const sshArg = pi.getFlag("tmux-ssh") as string | undefined;
		if (sshArg) {
			sshTarget = sshArg;

			// Verify SSH connectivity
			try {
				const check = await execCommand("echo ok", sshTarget);
				if (check.code !== 0) {
					ctx.ui.notify(
						`SSH connection to ${sshTarget} failed: ${check.stderr.trim()}`,
						"error",
					);
					return;
				}
			} catch (err) {
				ctx.ui.notify(
					`SSH connection to ${sshTarget} failed: ${err instanceof Error ? err.message : err}`,
					"error",
				);
				return;
			}

			// Verify tmux is available on remote
			const tmuxCheck = await execCommand("which tmux", sshTarget);
			if (tmuxCheck.code !== 0) {
				ctx.ui.notify(
					`tmux not found on ${sshTarget}. Please install tmux on the remote host.`,
					"error",
				);
				return;
			}

			ctx.ui.setStatus(
				"tmux",
				ctx.ui.theme.fg("accent", `📟 tmux (SSH: ${sshTarget})`),
			);
			ctx.ui.notify(`Tmux extension loaded — SSH mode: ${sshTarget}`, "info");
		} else {
			// Local mode — verify tmux is installed
			try {
				const tmuxCheck = await execCommand("which tmux");
				if (tmuxCheck.code !== 0) {
					ctx.ui.notify(
						"tmux not found. Please install tmux (e.g. brew install tmux).",
						"error",
					);
					return;
				}
			} catch {
				ctx.ui.notify(
					"tmux not found. Please install tmux (e.g. brew install tmux).",
					"error",
				);
				return;
			}

			ctx.ui.setStatus("tmux", ctx.ui.theme.fg("accent", "📟 tmux (local)"));
			ctx.ui.notify("Tmux extension loaded — local mode", "info");
		}
	});

	// Inject tmux awareness into the system prompt
	pi.on("before_agent_start", async (event) => {
		const sshNote = sshTarget
			? `All tmux commands are routed to the remote host (${sshTarget}) via SSH. Create sessions there — do NOT use local tmux.\n`
			: "";
		const mode = sshTarget ? `remote host (${sshTarget})` : "this machine";
		const extra = `

# Tmux Session Access
You have access to tmux tools for managing terminal sessions on ${mode}.
${sshNote}Workflow: tmux_start to create a session → tmux_send to run commands → tmux_read to check output.
Target format: 'session:window.pane' (e.g. 'main:0.0'). Use tmux_list to discover targets.
Key patterns:
- Run a command: tmux_send with text="your command" (Enter is sent automatically).
- Check output after a command: tmux_read with wait_ms=1000 to let output settle before capturing.
- Interrupt a process: tmux_send with keys="C-c".
- Read scrollback: tmux_read with start_line=-500 for last 500 lines of history.
- Name sessions descriptively (e.g. "dev-server", "test-runner") so you can track what's running where.
- **Prefer panes over windows**: Use tmux_split to create panes within a session instead of tmux_new_window. Panes let the user see multiple outputs side-by-side in a single view.
  - Use vertical splits (top/bottom) for stacking related outputs.
  - Use horizontal splits (side-by-side) for comparing or monitoring in parallel.
  - Only create new windows when you genuinely need a separate workspace (rare).
For long-running processes, start them in tmux and use tmux_read periodically to check status.`;

		return { systemPrompt: event.systemPrompt + extra };
	});
}
