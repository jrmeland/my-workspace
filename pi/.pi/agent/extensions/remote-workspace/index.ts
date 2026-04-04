/**
 * Remote Workspace Extension
 *
 * Transparently proxies pi's tools (read, write, edit, bash) to a remote
 * machine via SSH with ControlMaster connection pooling. Pi stays local
 * (full cmux integration), but all file and command operations execute
 * on the remote machine.
 *
 * Usage:
 *   pi --remote user@host:/remote/path
 *   pi --remote user@host                  # uses remote $HOME
 *   pi --remote <alias>                    # looks up ~/.pi/agent/extensions/remote-workspace/hosts.json
 *
 * Requirements:
 *   - SSH key-based auth configured (no password prompts)
 *   - bash on the remote machine
 *
 * What gets proxied:
 *   - read, write, edit, bash → all execute on remote via SSH
 *   - grep, find, ls → disabled in remote mode (use bash with rg/find/ls instead)
 *   - user ! commands → execute on remote
 *
 * What stays local:
 *   - cmux tools (sidebar, notifications, progress, browser, tmux)
 *   - web_search, subagent, and other non-filesystem tools
 *
 * Connection resilience:
 *   - SSH ControlMaster keeps a persistent connection (avoids per-command handshake)
 *   - ControlPersist=3600 keeps the socket alive for 1 hour after last use
 *   - Automatic retry on transient connection failures
 *   - If SSH drops, pi stays alive — tools error until reconnected
 *   - /remote-reconnect to re-establish the connection
 */

import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
	type BashOperations,
	type ReadOperations,
	type WriteOperations,
	type EditOperations,
	createBashTool,
	createEditTool,
	createReadTool,
	createWriteTool,
} from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HostEntry {
	host: string;
	user?: string;
	path?: string;
	port?: number;
	identity?: string;
}

interface RemoteConfig {
	remote: string; // user@host
	remoteCwd: string; // absolute path on remote
	controlPath: string; // SSH ControlMaster socket path
}

// ─── SSH Helpers ─────────────────────────────────────────────────────────────

function sshOpts(cfg: RemoteConfig): string[] {
	return [
		"-o", "ControlMaster=auto",
		"-o", `ControlPath=${cfg.controlPath}`,
		"-o", "ControlPersist=3600",
		"-o", "ConnectTimeout=10",
		"-o", "ServerAliveInterval=15",
		"-o", "ServerAliveCountMax=3",
		"-o", "BatchMode=yes",
		"-o", "StrictHostKeyChecking=accept-new",
	];
}

function sshExec(
	cfg: RemoteConfig,
	command: string,
	options?: { stdin?: Buffer | string; retries?: number },
): Promise<Buffer> {
	const retries = options?.retries ?? 1;

	return new Promise((resolve, reject) => {
		const args = [...sshOpts(cfg), cfg.remote, command];
		const child = spawn("ssh", args, {
			stdio: [options?.stdin != null ? "pipe" : "ignore", "pipe", "pipe"],
		});

		const out: Buffer[] = [];
		const err: Buffer[] = [];
		child.stdout.on("data", (d: Buffer) => out.push(d));
		child.stderr.on("data", (d: Buffer) => err.push(d));

		if (options?.stdin != null) {
			child.stdin!.write(options.stdin);
			child.stdin!.end();
		}

		child.on("error", (e) => {
			if (retries > 0) {
				setTimeout(() => sshExec(cfg, command, { ...options, retries: retries - 1 }).then(resolve, reject), 2000);
			} else {
				reject(new Error(`SSH connection error: ${e.message}`));
			}
		});

		child.on("close", (code) => {
			if (code !== 0) {
				const stderr = Buffer.concat(err).toString().trim();
				const isTransient = stderr.includes("Connection refused") ||
					stderr.includes("Connection reset") ||
					stderr.includes("Connection closed") ||
					stderr.includes("broken pipe");

				if (retries > 0 && isTransient) {
					setTimeout(() => sshExec(cfg, command, { ...options, retries: retries - 1 }).then(resolve, reject), 2000);
				} else {
					reject(new Error(`SSH command failed (exit ${code}): ${stderr}`));
				}
			} else {
				resolve(Buffer.concat(out));
			}
		});
	});
}

// ─── Path Mapping ────────────────────────────────────────────────────────────

function createPathMapper(localCwd: string, remoteCwd: string) {
	return (p: string): string => {
		if (p.startsWith(localCwd)) {
			return remoteCwd + p.slice(localCwd.length);
		}
		// Pass through — might be an absolute path the agent constructed,
		// or a temp file path. Let it resolve (or fail) on the remote.
		return p;
	};
}

function shellQuote(s: string): string {
	return JSON.stringify(s);
}

// ─── Remote Operations ──────────────────────────────────────────────────────

function createRemoteReadOps(cfg: RemoteConfig, localCwd: string): ReadOperations {
	const toRemote = createPathMapper(localCwd, cfg.remoteCwd);
	return {
		readFile: (p) => sshExec(cfg, `cat ${shellQuote(toRemote(p))}`),
		access: (p) => sshExec(cfg, `test -r ${shellQuote(toRemote(p))}`).then(() => {}),
		detectImageMimeType: async (p) => {
			try {
				const r = await sshExec(cfg, `file --mime-type -b ${shellQuote(toRemote(p))}`);
				const m = r.toString().trim();
				return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(m)
					? (m as "image/jpeg" | "image/png" | "image/gif" | "image/webp")
					: null;
			} catch {
				return null;
			}
		},
	};
}

function createRemoteWriteOps(cfg: RemoteConfig, localCwd: string): WriteOperations {
	const toRemote = createPathMapper(localCwd, cfg.remoteCwd);
	return {
		writeFile: async (p, content) => {
			const remotePath = shellQuote(toRemote(p));
			const b64 = Buffer.from(content).toString("base64");
			// Pipe via stdin to handle large files without hitting arg length limits
			await sshExec(cfg, `base64 -d > ${remotePath}`, { stdin: b64 });
		},
		mkdir: (dir) => sshExec(cfg, `mkdir -p ${shellQuote(toRemote(dir))}`).then(() => {}),
	};
}

function createRemoteEditOps(cfg: RemoteConfig, localCwd: string): EditOperations {
	const read = createRemoteReadOps(cfg, localCwd);
	const write = createRemoteWriteOps(cfg, localCwd);
	return { readFile: read.readFile, access: read.access, writeFile: write.writeFile };
}

function createRemoteBashOps(cfg: RemoteConfig, localCwd: string): BashOperations {
	const toRemote = createPathMapper(localCwd, cfg.remoteCwd);
	return {
		exec: (command, cwd, { onData, signal, timeout }) =>
			new Promise((resolve, reject) => {
				const remoteCwd = toRemote(cwd);
				const cmd = `cd ${shellQuote(remoteCwd)} && ${command}`;
				const args = [...sshOpts(cfg), cfg.remote, cmd];
				const child = spawn("ssh", args, { stdio: ["ignore", "pipe", "pipe"] });

				let timedOut = false;
				const timer = timeout
					? setTimeout(() => {
							timedOut = true;
							child.kill();
						}, timeout * 1000)
					: undefined;

				child.stdout.on("data", onData);
				child.stderr.on("data", onData);

				child.on("error", (e) => {
					if (timer) clearTimeout(timer);
					reject(e);
				});

				const onAbort = () => child.kill();
				signal?.addEventListener("abort", onAbort, { once: true });

				child.on("close", (code) => {
					if (timer) clearTimeout(timer);
					signal?.removeEventListener("abort", onAbort);
					if (signal?.aborted) reject(new Error("aborted"));
					else if (timedOut) reject(new Error(`timeout:${timeout}`));
					else resolve({ exitCode: code });
				});
			}),
	};
}

// ─── Host Config ─────────────────────────────────────────────────────────────

function loadHostsConfig(): Record<string, HostEntry> {
	const configPath = join(homedir(), ".pi/agent/extensions/remote-workspace/hosts.json");
	if (existsSync(configPath)) {
		try {
			return JSON.parse(readFileSync(configPath, "utf8"));
		} catch {
			return {};
		}
	}
	return {};
}

function parseRemoteArg(arg: string): { remote: string; remoteCwd?: string } {
	// Check saved hosts first
	const hosts = loadHostsConfig();
	if (hosts[arg]) {
		const h = hosts[arg];
		const remote = h.user ? `${h.user}@${h.host}` : h.host;
		return { remote, remoteCwd: h.path };
	}

	// Parse user@host:/path
	if (arg.includes(":")) {
		const idx = arg.indexOf(":");
		return { remote: arg.slice(0, idx), remoteCwd: arg.slice(idx + 1) };
	}

	// Just user@host
	return { remote: arg };
}

// ─── Extension ──────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.registerFlag("remote", {
		description: "Remote workspace: user@host:/path, user@host, or alias from hosts.json",
		type: "string",
	});

	const localCwd = process.cwd();

	// Create local tool instances (used when --remote is not set)
	const localRead = createReadTool(localCwd);
	const localWrite = createWriteTool(localCwd);
	const localEdit = createEditTool(localCwd);
	const localBash = createBashTool(localCwd);

	// Resolved on session_start when --remote is provided
	let remoteCfg: RemoteConfig | null = null;
	const getRemote = () => remoteCfg;

	// Handoff state
	let handoffLocalSessionFile: string | null = null;
	let handoffRemoteSessionFile: string | null = null;
	const HANDOFF_TMUX_SESSION = "pi-handoff";

	// ── Connection health & auto-reconnect ──────────────────────────────

	let connectionHealthy = false;
	let lastHealthCheck = 0;
	const HEALTH_CHECK_INTERVAL_MS = 30_000; // recheck every 30s at most
	let uiCtx: any = null; // stash ctx from session_start for status updates

	async function ensureConnected(): Promise<void> {
		const cfg = getRemote();
		if (!cfg) return;

		const now = Date.now();
		if (connectionHealthy && now - lastHealthCheck < HEALTH_CHECK_INTERVAL_MS) {
			return; // recently verified, skip
		}

		try {
			await sshExec(cfg, "echo ok", { retries: 0 });
			if (!connectionHealthy) {
				// Was down, now recovered
				connectionHealthy = true;
				const label = `🔗 ${cfg.remote}:${cfg.remoteCwd}`;
				uiCtx?.ui?.setStatus("remote", uiCtx.ui.theme.fg("accent", label));
				uiCtx?.ui?.notify("Remote connection restored", "info");
			}
			connectionHealthy = true;
			lastHealthCheck = now;
		} catch {
			connectionHealthy = false;
			uiCtx?.ui?.setStatus(
				"remote",
				uiCtx.ui.theme.fg("warning", `⏳ ${cfg.remote} — reconnecting…`),
			);

			// Try to kill stale ControlMaster and reconnect
			try {
				spawn("ssh", ["-o", `ControlPath=${cfg.controlPath}`, "-O", "exit", cfg.remote], {
					stdio: "ignore",
				});
			} catch { /* ignore */ }
			await sleep(1000);

			try {
				await sshExec(cfg, "echo ok", { retries: 2 });
				connectionHealthy = true;
				lastHealthCheck = Date.now();
				const label = `🔗 ${cfg.remote}:${cfg.remoteCwd}`;
				uiCtx?.ui?.setStatus("remote", uiCtx.ui.theme.fg("accent", label));
				uiCtx?.ui?.notify("Remote connection restored", "info");
			} catch (err: any) {
				uiCtx?.ui?.setStatus(
					"remote",
					uiCtx.ui.theme.fg("error", `❌ ${cfg.remote} — offline. Use /remote-reconnect`),
				);
				throw new Error(
					`Remote connection to ${cfg.remote} is down. ` +
					`The machine may be asleep or unreachable. ` +
					`Use /remote-reconnect once it's back.`,
				);
			}
		}
	}

	// ── Override read ────────────────────────────────────────────────────

	pi.registerTool({
		...localRead,
		async execute(id, params, signal, onUpdate) {
			const cfg = getRemote();
			if (cfg) {
				// Local-only paths (temp dirs, clipboard images) stay local
				const resolvedPath = params.path.startsWith("/") ? params.path : join(localCwd, params.path);
				if (isLocalOnlyPath(resolvedPath)) {
					return localRead.execute(id, params, signal, onUpdate);
				}
				await ensureConnected();
				const tool = createReadTool(localCwd, {
					operations: createRemoteReadOps(cfg, localCwd),
				});
				return tool.execute(id, params, signal, onUpdate);
			}
			return localRead.execute(id, params, signal, onUpdate);
		},
	});

	// ── Override write ───────────────────────────────────────────────────

	pi.registerTool({
		...localWrite,
		async execute(id, params, signal, onUpdate) {
			const cfg = getRemote();
			if (cfg) {
				await ensureConnected();
				const tool = createWriteTool(localCwd, {
					operations: createRemoteWriteOps(cfg, localCwd),
				});
				return tool.execute(id, params, signal, onUpdate);
			}
			return localWrite.execute(id, params, signal, onUpdate);
		},
	});

	// ── Override edit ────────────────────────────────────────────────────

	pi.registerTool({
		...localEdit,
		async execute(id, params, signal, onUpdate) {
			const cfg = getRemote();
			if (cfg) {
				await ensureConnected();
				const tool = createEditTool(localCwd, {
					operations: createRemoteEditOps(cfg, localCwd),
				});
				return tool.execute(id, params, signal, onUpdate);
			}
			return localEdit.execute(id, params, signal, onUpdate);
		},
	});

	// ── Override bash ────────────────────────────────────────────────────

	pi.registerTool({
		...localBash,
		async execute(id, params, signal, onUpdate) {
			const cfg = getRemote();
			if (cfg) {
				await ensureConnected();
				const tool = createBashTool(localCwd, {
					operations: createRemoteBashOps(cfg, localCwd),
				});
				return tool.execute(id, params, signal, onUpdate);
			}
			return localBash.execute(id, params, signal, onUpdate);
		},
	});

	// ── Intercept user ! commands ────────────────────────────────────────

	pi.on("user_bash", () => {
		const cfg = getRemote();
		if (!cfg) return;
		return { operations: createRemoteBashOps(cfg, localCwd) };
	});

	// ── Initialize connection ────────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		const arg = pi.getFlag("remote") as string | undefined;
		if (!arg) return;

		const { remote, remoteCwd: rawCwd } = parseRemoteArg(arg);
		const controlPath = join(tmpdir(), `pi-remote-${remote.replace(/[^a-zA-Z0-9]/g, "-")}`);

		// Temporary config for initial connection
		const bootstrap: RemoteConfig = { remote, remoteCwd: "", controlPath };

		uiCtx = ctx; // stash for health check status updates

		try {
			ctx.ui.setStatus("remote", "Connecting…");

			// Resolve remote cwd (expands ~ and verifies connectivity)
			// Replace ~ with $HOME so it expands inside double quotes on the remote shell
			let resolvedCwd: string;
			if (rawCwd) {
				const expandedPath = rawCwd.replace(/^~\//, "$HOME/").replace(/^~$/, "$HOME");
				resolvedCwd = (await sshExec(bootstrap, `cd ${shellQuote(expandedPath)} && pwd`)).toString().trim();
			} else {
				resolvedCwd = (await sshExec(bootstrap, "pwd")).toString().trim();
			}

			remoteCfg = { remote, remoteCwd: resolvedCwd, controlPath };
			connectionHealthy = true;
			lastHealthCheck = Date.now();

			// Disable local-only tools that would search the wrong filesystem.
			// The agent should use bash (which is remoted) for grep/find/ls.
			const all = pi.getAllTools().map((t) => t.name);
			const localOnly = new Set(["grep", "find", "ls"]);
			pi.setActiveTools(all.filter((n) => !localOnly.has(n)));

			const label = `🔗 ${remote}:${resolvedCwd}`;
			ctx.ui.setStatus("remote", ctx.ui.theme.fg("accent", label));
			ctx.ui.notify(`Remote workspace connected: ${remote}:${resolvedCwd}`, "info");
		} catch (err: any) {
			ctx.ui.setStatus("remote", ctx.ui.theme.fg("error", `❌ ${remote} — connection failed`));
			ctx.ui.notify(`Failed to connect to ${remote}: ${err.message}`, "error");
		}
	});

	// ── Modify system prompt ─────────────────────────────────────────────

	pi.on("before_agent_start", async (event) => {
		const cfg = getRemote();
		if (!cfg) return;

		let prompt = event.systemPrompt;

		// Replace the CWD reference
		prompt = prompt.replace(
			`Current working directory: ${localCwd}`,
			`Current working directory: ${cfg.remoteCwd} (remote via SSH: ${cfg.remote})`,
		);

		// Add remote workspace guidance
		prompt += "\n\n# Remote Workspace\n";
		prompt += `All file operations (read, write, edit) and bash commands execute on ${cfg.remote} at ${cfg.remoteCwd} via SSH.\n`;
		prompt += "The built-in grep, find, and ls tools are DISABLED — use the bash tool with `rg`, `find`, or `ls` commands instead.\n";
		prompt += "\n";
		prompt += "## CRITICAL: Local vs Remote Tool Split\n";
		prompt += `- read, write, edit, bash → execute on REMOTE machine (${cfg.remote})\n`;
		prompt += "- tmux_start, tmux_send, tmux_read, tmux_* → execute on LOCAL machine (NOT remote!)\n";
		prompt += "- cmux tools (notifications, sidebar status, progress) → LOCAL\n";
		prompt += "\n";
		prompt += "**NEVER use tmux tools to run commands intended for the remote machine.** They will run locally instead.\n";
		prompt += "For long-running remote processes (dev servers, test suites, docker, builds, log tailing):\n";
		prompt += "  1. Use the remote_terminal tool — it creates a cmux pane auto-connected via mosh+tmux to the remote machine\n";
		prompt += "  2. Then use cmux send/read-screen with the returned surface ref to interact\n";
		prompt += "  3. These processes survive network disconnects (tmux persistence on remote)\n";
		prompt += "\n";
		prompt += "For quick one-shot commands, the bash tool is fine (runs on remote, returns output).\n";

		return { systemPrompt: prompt };
	});

	// ── Cleanup ──────────────────────────────────────────────────────────

	pi.on("session_shutdown", async () => {
		const cfg = getRemote();
		if (!cfg) return;
		try {
			// Ask ControlMaster to exit gracefully
			const args = ["-o", `ControlPath=${cfg.controlPath}`, "-O", "exit", cfg.remote];
			spawn("ssh", args, { stdio: "ignore", detached: true });
		} catch {
			// Best effort
		}
	});

	// ── Remote Terminal Tool ─────────────────────────────────────────────

	pi.registerTool({
		name: "remote_terminal",
		label: "Remote Terminal",
		description:
			"Open a new cmux split pane that is automatically connected to the remote machine. " +
			"Use for long-running processes (dev servers, test suites, log tailing) that need to " +
			"survive disconnects. After creation, use cmux send/read-screen with the returned " +
			"surface ref to interact with the remote terminal.",
		promptSnippet:
			"Open a persistent remote terminal pane (mosh + tmux) for long-running processes",
		promptGuidelines: [
			"Use remote_terminal for dev servers, long test suites, log tailing, or any process that should survive disconnects.",
			"For quick commands (git status, grep, cat), use the bash tool instead — it's faster.",
			"After creating a remote terminal, use cmux send/read-screen with the returned surface ref.",
		],
		parameters: Type.Object({
			direction: StringEnum(["right", "down"] as const, {
				description: "Split direction for the new pane",
			}),
			command: Type.Optional(
				Type.String({ description: "Command to run on the remote machine after connecting" }),
			),
			persistent: Type.Optional(
				Type.Boolean({
					description:
						"If true, attach to a remote tmux session so the process survives disconnects. Default: true",
					default: true,
				}),
			),
			tmux_session: Type.Optional(
				Type.String({
					description: 'Remote tmux session name. Default: "pi-remote"',
					default: "pi-remote",
				}),
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate) {
			const cfg = getRemote();
			if (!cfg) {
				throw new Error("Not in remote mode. Start pi with --remote flag.");
			}

			const direction = params.direction;
			const persistent = params.persistent !== false;
			const tmuxSession = params.tmux_session || "pi-remote";

			// 1. Create cmux split pane
			const splitResult = await pi.exec("cmux", ["new-split", direction]);
			if (splitResult.code !== 0) {
				throw new Error(`Failed to create split: ${splitResult.stderr}`);
			}

			// 2. Find the new surface ref from tree output
			await sleep(500);
			const treeResult = await pi.exec("cmux", ["tree"]);
			const treeOutput = treeResult.stdout;

			// Parse the most recently created surface from the split output
			// cmux new-split outputs something like "OK surface:X ..."
			const surfaceMatch = splitResult.stdout.match(/surface:(\d+)/);
			const surfaceRef = surfaceMatch ? `surface:${surfaceMatch[1]}` : null;

			if (!surfaceRef) {
				throw new Error(
					`Could not determine new surface ref. Split output: ${splitResult.stdout}`,
				);
			}

			// 3. Check if mosh is available, fall back to ssh
			let usesMosh = false;
			try {
				await pi.exec("which", ["mosh"]);
				// Also check remote has mosh-server
				await sshExec(cfg, "which mosh-server");
				usesMosh = true;
			} catch {
				// mosh not available, will use ssh
			}

			// 4. Connect to remote
			const connectCmd = usesMosh ? `mosh ${cfg.remote}` : `ssh ${cfg.remote}`;
			await pi.exec("cmux", ["send", "--surface", surfaceRef, connectCmd]);
			await pi.exec("cmux", ["send-key", "--surface", surfaceRef, "Return"]);

			// Wait for connection to establish
			await sleep(usesMosh ? 3000 : 2000);

			// 5. Optionally attach to remote tmux for persistence
			if (persistent) {
				const tmuxCmd = `tmux new-session -A -s ${shellQuote(tmuxSession)}`;
				await pi.exec("cmux", ["send", "--surface", surfaceRef, tmuxCmd]);
				await pi.exec("cmux", ["send-key", "--surface", surfaceRef, "Return"]);
				await sleep(1000);
			}

			// 6. Navigate to project directory
			const cdCmd = `cd ${shellQuote(cfg.remoteCwd)}`;
			await pi.exec("cmux", ["send", "--surface", surfaceRef, cdCmd]);
			await pi.exec("cmux", ["send-key", "--surface", surfaceRef, "Return"]);
			await sleep(500);

			// 7. Run the requested command if provided
			if (params.command) {
				await pi.exec("cmux", ["send", "--surface", surfaceRef, params.command]);
				await pi.exec("cmux", ["send-key", "--surface", surfaceRef, "Return"]);
			}

			const transport = usesMosh ? "mosh" : "ssh";
			const persistence = persistent ? ` (tmux session: ${tmuxSession})` : "";

			return {
				content: [
					{
						type: "text",
						text:
							`Remote terminal opened: ${surfaceRef}\n` +
							`Connected via ${transport} to ${cfg.remote}:${cfg.remoteCwd}${persistence}\n` +
							`Use cmux send/read-screen --surface ${surfaceRef} to interact.`,
					},
				],
				details: {
					surface: surfaceRef,
					remote: cfg.remote,
					transport,
					tmuxSession: persistent ? tmuxSession : null,
				},
			};
		},
	});

	// ── Commands ─────────────────────────────────────────────────────────

	pi.registerCommand("remote", {
		description: "Show remote workspace status",
		handler: async (_args, ctx) => {
			const cfg = getRemote();
			if (cfg) {
				ctx.ui.notify(`Connected: ${cfg.remote}:${cfg.remoteCwd}`, "info");
			} else {
				ctx.ui.notify("Not in remote mode. Start pi with: pi --remote user@host:/path", "info");
			}
		},
	});

	pi.registerCommand("remote-switch", {
		description: "Switch remote workspace path or host (e.g. /remote-switch ~/source/OtherProject or /remote-switch shire-kg)",
		handler: async (args, ctx) => {
			if (!args?.trim()) {
				ctx.ui.notify("Usage: /remote-switch <path> or /remote-switch <alias>", "error");
				return;
			}

			const arg = args.trim();
			let newRemote: string;
			let newRawCwd: string | undefined;

			// Check if it's a host alias or path
			const hosts = loadHostsConfig();
			if (hosts[arg]) {
				// Full host switch
				const h = hosts[arg];
				newRemote = h.user ? `${h.user}@${h.host}` : h.host;
				newRawCwd = h.path;
			} else if (arg.includes("@") || arg.includes(":")) {
				// user@host:/path format
				const parsed = parseRemoteArg(arg);
				newRemote = parsed.remote;
				newRawCwd = parsed.remoteCwd;
			} else {
				// Just a path — keep current host
				const cfg = getRemote();
				if (!cfg) {
					ctx.ui.notify("Not in remote mode.", "error");
					return;
				}
				newRemote = cfg.remote;
				newRawCwd = arg;
			}

			const controlPath = join(tmpdir(), `pi-remote-${newRemote.replace(/[^a-zA-Z0-9]/g, "-")}`);
			const bootstrap: RemoteConfig = { remote: newRemote, remoteCwd: "", controlPath };

			try {
				ctx.ui.setStatus("remote", "Switching…");
				const expandedPath = (newRawCwd || "~").replace(/^~\//, "$HOME/").replace(/^~$/, "$HOME");
				const resolvedCwd = (await sshExec(bootstrap, `cd ${shellQuote(expandedPath)} && pwd`)).toString().trim();

				remoteCfg = { remote: newRemote, remoteCwd: resolvedCwd, controlPath };

				const label = `🔗 ${newRemote}:${resolvedCwd}`;
				ctx.ui.setStatus("remote", ctx.ui.theme.fg("accent", label));
				ctx.ui.notify(`Switched to ${newRemote}:${resolvedCwd}`, "info");
			} catch (err: any) {
				ctx.ui.setStatus("remote", ctx.ui.theme.fg("error", `❌ Switch failed`));
				ctx.ui.notify(`Switch failed: ${err.message}`, "error");
			}
		},
	});

	// ── Handoff: transfer session to remote for autonomous work ─────────

	pi.registerCommand("remote-handoff", {
		description:
			'Transfer session to remote machine for autonomous work. ' +
			'Usage: /remote-handoff [prompt to continue with]',
		handler: async (args, ctx) => {
			const cfg = getRemote();
			if (!cfg) {
				ctx.ui.notify("Not in remote mode. Start pi with --remote flag.", "error");
				return;
			}

			// 1. Check prerequisites on remote
			ctx.ui.setStatus("remote", "Checking remote prerequisites…");
			const checks: { name: string; cmd: string; fix: string }[] = [
				{ name: "pi", cmd: "zsh -lc 'which pi'", fix: "Install pi: npm install -g @mariozechner/pi-coding-agent" },
				{ name: "tmux", cmd: "which tmux", fix: "Install tmux: brew install tmux" },
				{ name: "API keys", cmd: "test -f ~/.secrets", fix: "Create ~/.secrets with API keys (see secrets.template)" },
			];
			for (const check of checks) {
				try {
					await sshExec(cfg, check.cmd, { retries: 0 });
				} catch {
					ctx.ui.setStatus("remote", ctx.ui.theme.fg("error", `❌ Handoff failed: ${check.name} missing`));
					ctx.ui.notify(`Prerequisite missing on ${cfg.remote}: ${check.name}. ${check.fix}`, "error");
					return;
				}
			}

			// 2. Wait for agent to be idle
			ctx.ui.setStatus("remote", "Waiting for agent to finish current work…");
			await ctx.waitForIdle();

			// 3. Get current session file
			const sessionFile = ctx.sessionManager.getSessionFile();
			if (!sessionFile) {
				ctx.ui.notify("No session file to transfer (ephemeral session?).", "error");
				return;
			}

			// 4. Prepare remote session directory and copy
			ctx.ui.setStatus("remote", "Transferring session…");
			const remoteSessionDir = "~/.pi/agent/sessions/_handoff";
			const remoteSessionFile = `${remoteSessionDir}/session.jsonl`;

			try {
				await sshExec(cfg, `mkdir -p ${remoteSessionDir}`);

				// SCP via ControlMaster
				const scpResult = await pi.exec("scp", [
					"-o", `ControlPath=${cfg.controlPath}`,
					"-o", "ControlMaster=auto",
					sessionFile,
					`${cfg.remote}:${remoteSessionFile}`,
				]);
				if (scpResult.code !== 0) {
					throw new Error(`SCP failed: ${scpResult.stderr}`);
				}
			} catch (err: any) {
				ctx.ui.setStatus("remote", ctx.ui.theme.fg("error", "❌ Session transfer failed"));
				ctx.ui.notify(`Failed to transfer session: ${err.message}`, "error");
				return;
			}

			// 5. Start remote pi in tmux
			ctx.ui.setStatus("remote", "Starting remote agent…");
			try {
				// Kill any existing handoff session
				await sshExec(cfg, `tmux kill-session -t ${HANDOFF_TMUX_SESSION} 2>/dev/null || true`);

				// Resolve the remote session path (expand ~)
				const resolvedRemoteSession = (await sshExec(cfg, `echo ${remoteSessionFile}`)).toString().trim();

				// Start pi in tmux with login shell (so nvm/mise PATH works)
				const piCmd = `cd ${shellQuote(cfg.remoteCwd)} && pi --session ${shellQuote(resolvedRemoteSession)}`;
				await sshExec(cfg, `tmux new-session -d -s ${HANDOFF_TMUX_SESSION} "zsh -lc ${shellQuote(piCmd)}"`);

				// Wait for pi to load
				await sleep(6000);

				// 6. Send the follow-up prompt if provided
				const prompt = args?.trim();
				if (prompt) {
					await sshExec(cfg, `tmux send-keys -t ${HANDOFF_TMUX_SESSION} ${shellQuote(prompt)} Enter`);
				}
			} catch (err: any) {
				ctx.ui.setStatus("remote", ctx.ui.theme.fg("error", "❌ Failed to start remote agent"));
				ctx.ui.notify(`Failed to start remote pi: ${err.message}`, "error");
				return;
			}

			// 7. Store handoff state and update UI
			handoffLocalSessionFile = sessionFile;
			handoffRemoteSessionFile = remoteSessionFile;

			const promptNote = args?.trim() ? ` with prompt: "${args.trim().slice(0, 50)}..."` : " (waiting for input)";
			ctx.ui.setStatus(
				"remote",
				ctx.ui.theme.fg("accent", `🔄 Handed off to ${cfg.remote} (tmux: ${HANDOFF_TMUX_SESSION})`),
			);
			ctx.ui.notify(
				`Session handed off to ${cfg.remote}${promptNote}. ` +
				`Check with /remote-handoff-status. Retrieve with /remote-takeback.`,
				"info",
			);
		},
	});

	pi.registerCommand("remote-handoff-status", {
		description: "Check on the remote agent's progress",
		handler: async (_args, ctx) => {
			const cfg = getRemote();
			if (!cfg) {
				ctx.ui.notify("Not in remote mode.", "error");
				return;
			}

			try {
				// Check if tmux session exists
				await sshExec(cfg, `tmux has-session -t ${HANDOFF_TMUX_SESSION}`, { retries: 0 });

				// Capture recent output
				const output = await sshExec(cfg, `tmux capture-pane -t ${HANDOFF_TMUX_SESSION} -p -S -30`);
				const lines = output.toString().trim();

				ctx.ui.notify(
					`Remote agent is running (tmux: ${HANDOFF_TMUX_SESSION}).\n` +
					`Last output:\n${lines.slice(-500)}`,
					"info",
				);
			} catch {
				ctx.ui.notify(
					`No remote agent running (tmux session '${HANDOFF_TMUX_SESSION}' not found). ` +
					`It may have finished or been stopped.`,
					"warning",
				);
			}
		},
	});

	pi.registerCommand("remote-takeback", {
		description: "Retrieve session from remote machine and resume locally",
		handler: async (_args, ctx) => {
			const cfg = getRemote();
			if (!cfg) {
				ctx.ui.notify("Not in remote mode.", "error");
				return;
			}

			const remoteFile = handoffRemoteSessionFile || "~/.pi/agent/sessions/_handoff/session.jsonl";
			const localFile = handoffLocalSessionFile;

			// 1. Check if remote agent is still running
			let remoteRunning = false;
			try {
				await sshExec(cfg, `tmux has-session -t ${HANDOFF_TMUX_SESSION}`, { retries: 0 });
				remoteRunning = true;
			} catch {
				// Not running — that's fine
			}

			if (remoteRunning) {
				// Show what the remote agent is doing
				const output = await sshExec(cfg, `tmux capture-pane -t ${HANDOFF_TMUX_SESSION} -p -S -10`);
				const lastLines = output.toString().trim().slice(-300);

				const ok = await ctx.ui.confirm(
					"Remote agent is still running",
					`Stop it and take back the session?\n\nLast output:\n${lastLines}`,
				);
				if (!ok) {
					ctx.ui.notify("Takeback cancelled.", "info");
					return;
				}

				// Send Ctrl+C twice then Ctrl+D to stop pi gracefully
				ctx.ui.setStatus("remote", "Stopping remote agent…");
				await sshExec(cfg, `tmux send-keys -t ${HANDOFF_TMUX_SESSION} C-c`);
				await sleep(500);
				await sshExec(cfg, `tmux send-keys -t ${HANDOFF_TMUX_SESSION} C-c`);
				await sleep(500);
				await sshExec(cfg, `tmux send-keys -t ${HANDOFF_TMUX_SESSION} C-d`);
				await sleep(2000);

				// Force kill if still alive
				try {
					await sshExec(cfg, `tmux kill-session -t ${HANDOFF_TMUX_SESSION}`, { retries: 0 });
				} catch { /* already dead */ }
			}

			// 2. Transfer session file back
			ctx.ui.setStatus("remote", "Retrieving session…");

			// Determine where to save locally
			const localTarget = localFile || join(
				homedir(),
				".pi/agent/sessions/_handoff",
				"session-takeback.jsonl",
			);

			try {
				// Ensure local directory exists
				const localDir = localTarget.substring(0, localTarget.lastIndexOf("/"));
				await pi.exec("mkdir", ["-p", localDir]);

				const scpResult = await pi.exec("scp", [
					"-o", `ControlPath=${cfg.controlPath}`,
					"-o", "ControlMaster=auto",
					`${cfg.remote}:${remoteFile}`,
					localTarget,
				]);
				if (scpResult.code !== 0) {
					throw new Error(`SCP failed: ${scpResult.stderr}`);
				}
			} catch (err: any) {
				ctx.ui.setStatus("remote", ctx.ui.theme.fg("error", "❌ Takeback failed"));
				ctx.ui.notify(`Failed to retrieve session: ${err.message}`, "error");
				return;
			}

			// 3. Clear handoff state
			handoffLocalSessionFile = null;
			handoffRemoteSessionFile = null;

			// 4. Tell user how to resume
			ctx.ui.setStatus(
				"remote",
				ctx.ui.theme.fg("accent", `🔗 ${cfg.remote}:${cfg.remoteCwd} (session retrieved)`),
			);
			ctx.ui.notify(
				`Session retrieved from ${cfg.remote}. Resume with:\n` +
				`  pi --remote ${cfg.remote}:${cfg.remoteCwd} --session ${localTarget}`,
				"info",
			);
		},
	});

	pi.registerCommand("remote-reconnect", {
		description: "Re-establish SSH connection to remote workspace",
		handler: async (_args, ctx) => {
			const cfg = getRemote();
			if (!cfg) {
				ctx.ui.notify("Not in remote mode.", "error");
				return;
			}
			try {
				ctx.ui.setStatus("remote", "Reconnecting…");
				// Kill stale ControlMaster
				try {
					spawn("ssh", ["-o", `ControlPath=${cfg.controlPath}`, "-O", "exit", cfg.remote], {
						stdio: "ignore",
					});
				} catch {
					/* ignore */
				}
				// Wait for socket cleanup
				await sleep(1000);
				// Test connection
				await sshExec(cfg, "echo ok");
				ctx.ui.setStatus("remote", ctx.ui.theme.fg("accent", `🔗 ${cfg.remote}:${cfg.remoteCwd}`));
				ctx.ui.notify("Reconnected!", "info");
			} catch (err: any) {
				ctx.ui.setStatus("remote", ctx.ui.theme.fg("error", `❌ ${cfg.remote}`));
				ctx.ui.notify(`Reconnect failed: ${err.message}`, "error");
			}
		},
	});
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/** Paths that should always be read locally, never proxied to remote */
const LOCAL_ONLY_PREFIXES = [
	"/var/folders/",    // macOS temp (clipboard, drag-drop)
	"/tmp/",            // Unix temp
	"/private/tmp/",    // macOS /tmp symlink target
	"/private/var/",    // macOS /var symlink target
];

function isLocalOnlyPath(p: string): boolean {
	return LOCAL_ONLY_PREFIXES.some((prefix) => p.startsWith(prefix));
}
