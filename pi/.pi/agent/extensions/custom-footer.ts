/**
 * Custom Multi-Line Footer
 *
 * Replaces the default single-line footer with a multi-line layout:
 *   Top lines:  extension statuses, wrapped by width (one row per overflow)
 *   Bottom line: model · tokens/cost · git branch
 *
 * Extension statuses from setStatus() are grouped onto lines that fit
 * within the terminal width. Long entries (like git-repos) naturally
 * get their own line without truncation.
 */

import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

const SEP_VISIBLE_WIDTH = 3; // " · "

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.setFooter((tui, theme, footerData) => {
			const unsub = footerData.onBranchChange(() => tui.requestRender());

			return {
				dispose: unsub,
				invalidate() {},
				render(width: number): string[] {
					// --- Infra line: model · tokens · cost · branch ---
					let input = 0,
						output = 0,
						cost = 0;
					for (const e of ctx.sessionManager.getBranch()) {
						if (e.type === "message" && e.message.role === "assistant") {
							const m = e.message as AssistantMessage;
							input += m.usage.input;
							output += m.usage.output;
							cost += m.usage.cost.total;
						}
					}

					const fmt = (n: number) =>
						n < 1000 ? `${n}` : `${(n / 1000).toFixed(1)}k`;

					const model = ctx.model?.id || "no-model";
					const branch = footerData.getGitBranch();

					const leftParts: string[] = [theme.fg("dim", model)];
					if (input > 0 || output > 0) {
						leftParts.push(
							theme.fg("dim", `↑${fmt(input)} ↓${fmt(output)} $${cost.toFixed(3)}`)
						);
					}
					const left1 = leftParts.join(theme.fg("dim", " · "));
					const right1 = branch ? theme.fg("dim", ` ${branch}`) : "";
					const pad1 = " ".repeat(
						Math.max(1, width - visibleWidth(left1) - visibleWidth(right1))
					);
					const infraLine = truncateToWidth(left1 + pad1 + right1, width);

					// --- Status lines: wrap statuses across rows by width ---
					const statuses = footerData.getExtensionStatuses();
					const skipKeys = new Set(["cmux"]);

					// Collect status entries as { text, width } for bin-packing
					const items: { text: string; w: number }[] = [];
					for (const [key, value] of statuses) {
						if (skipKeys.has(key) || !value) continue;
						items.push({ text: value, w: visibleWidth(value) });
					}

					if (items.length === 0) {
						return [infraLine];
					}

					// Greedy line-wrap: pack items left-to-right, start a new line on overflow
					const sep = theme.fg("dim", " · ");
					const statusLines: string[] = [];
					let currentParts: string[] = [];
					let currentWidth = 0;

					for (const item of items) {
						const needed =
							currentParts.length === 0
								? item.w
								: SEP_VISIBLE_WIDTH + item.w;

						if (currentParts.length > 0 && currentWidth + needed > width) {
							// Flush current line
							statusLines.push(currentParts.join(sep));
							currentParts = [];
							currentWidth = 0;
						}

						currentParts.push(item.text);
						currentWidth += currentParts.length === 1 ? item.w : SEP_VISIBLE_WIDTH + item.w;
					}

					if (currentParts.length > 0) {
						statusLines.push(currentParts.join(sep));
					}

					// Truncate any single line that's still wider than terminal
					const wrapped = statusLines.map((l) => truncateToWidth(l, width));

					return [...wrapped, infraLine];
				},
			};
		});
	});
}
