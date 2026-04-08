/**
 * Git Repos Status Extension
 *
 * When cwd contains git repos one level down, shows them and their branches
 * in the footer status line. Non-recursive — only checks immediate subdirs.
 *
 * Example output: ai-chat(main) ai-app(dev) infra(feat/x)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";

function getGitBranch(repoPath: string): string | null {
	try {
		return execSync("git rev-parse --abbrev-ref HEAD", {
			cwd: repoPath,
			encoding: "utf8",
			timeout: 2000,
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
	} catch {
		return null;
	}
}

function discoverRepos(cwd: string): { name: string; branch: string }[] {
	const repos: { name: string; branch: string }[] = [];
	try {
		const entries = readdirSync(cwd);
		for (const entry of entries) {
			if (entry.startsWith(".")) continue;
			const fullPath = join(cwd, entry);
			try {
				if (!statSync(fullPath).isDirectory()) continue;
			} catch {
				continue;
			}
			if (existsSync(join(fullPath, ".git"))) {
				const branch = getGitBranch(fullPath);
				if (branch) {
					repos.push({ name: basename(fullPath), branch });
				}
			}
		}
	} catch {
		// cwd might not be readable
	}
	return repos.sort((a, b) => a.name.localeCompare(b.name));
}

function formatRepos(repos: { name: string; branch: string }[], theme: any): string {
	return repos
		.map((r) => theme.fg("dim", r.name) + theme.fg("accent", `(${r.branch})`))
		.join(" ");
}

const STATUS_KEY = "git-repos";

export default function (pi: ExtensionAPI) {
	function updateStatus(ctx: any) {
		const repos = discoverRepos(ctx.cwd);
		if (repos.length > 0) {
			ctx.ui.setStatus(STATUS_KEY, formatRepos(repos, ctx.ui.theme));
		} else {
			ctx.ui.setStatus(STATUS_KEY, undefined);
		}
	}

	pi.on("session_start", async (_event, ctx) => {
		updateStatus(ctx);
	});

	// Refresh after each agent turn in case cwd changed (e.g. cd commands)
	pi.on("agent_end", async (_event, ctx) => {
		updateStatus(ctx);
	});
}
