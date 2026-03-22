/**
 * Web Search Extension (Parallel AI)
 *
 * Provides a `web_search` tool that searches the web using the Parallel AI Search API.
 * Requires PARALLEL_API_KEY environment variable.
 *
 * Usage:
 *   Place in ~/.pi/agent/extensions/ and reload.
 *   The LLM can then call the web_search tool to find current information.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateHead, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Text } from "@mariozechner/pi-tui";

const API_URL = "https://api.parallel.ai/v1beta/search";
const BETA_HEADER = "search-extract-2025-10-10";

interface ParallelResult {
	url: string;
	title: string;
	excerpts?: string[];
}

interface ParallelResponse {
	results: ParallelResult[];
	search_metadata?: {
		total_results?: number;
	};
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "web_search",
		label: "Web Search",
		description:
			"Search the web for current information using Parallel AI. " +
			"Use this when you need up-to-date information, facts, documentation, or anything beyond your training data. " +
			"Provide a clear objective describing what you're looking for, and one or more search queries.",
		parameters: Type.Object({
			objective: Type.String({
				description: "A clear description of what information you are looking for and why",
			}),
			search_queries: Type.Array(Type.String({ description: "A search query" }), {
				description: "One or more search queries to run (2-3 queries with different angles works best)",
				minItems: 1,
				maxItems: 5,
			}),
			max_results: Type.Optional(
				Type.Number({
					description: "Maximum number of results to return (default: 10)",
					minimum: 1,
					maximum: 20,
				})
			),
		}),

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const apiKey = process.env.PARALLEL_API_KEY;
			if (!apiKey) {
				return {
					content: [{ type: "text", text: "Error: PARALLEL_API_KEY environment variable is not set." }],
					isError: true,
					details: {},
				};
			}

			onUpdate?.({
				content: [{ type: "text", text: `Searching: ${params.search_queries.join(", ")}` }],
			});

			try {
				const body = {
					objective: params.objective,
					search_queries: params.search_queries,
					max_results: params.max_results ?? 10,
					excerpts: {
						max_chars_per_result: 10000,
					},
				};

				const response = await fetch(API_URL, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-api-key": apiKey,
						"parallel-beta": BETA_HEADER,
					},
					body: JSON.stringify(body),
					signal,
				});

				if (!response.ok) {
					const errText = await response.text().catch(() => "");
					return {
						content: [
							{
								type: "text",
								text: `Parallel API error (${response.status}): ${errText || response.statusText}`,
							},
						],
						isError: true,
						details: { status: response.status },
					};
				}

				const data = (await response.json()) as ParallelResponse;
				const results = data.results ?? [];

				if (results.length === 0) {
					return {
						content: [{ type: "text", text: "No results found." }],
						details: { resultCount: 0 },
					};
				}

				// Format results for the LLM
				let output = `Found ${results.length} results:\n\n`;

				for (let i = 0; i < results.length; i++) {
					const r = results[i];
					output += `--- Result ${i + 1} ---\n`;
					output += `Title: ${r.title}\n`;
					output += `URL: ${r.url}\n`;
					if (r.excerpts && r.excerpts.length > 0) {
						output += `\n${r.excerpts.join("\n\n")}\n`;
					}
					output += "\n";
				}

				// Truncate if needed
				const truncation = truncateHead(output, {
					maxLines: DEFAULT_MAX_LINES,
					maxBytes: DEFAULT_MAX_BYTES,
				});

				let text = truncation.content;
				if (truncation.truncated) {
					text += `\n\n[Output truncated: ${truncation.outputLines} of ${truncation.totalLines} lines`;
					text += ` (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)})]`;
				}

				return {
					content: [{ type: "text", text }],
					details: {
						resultCount: results.length,
						queries: params.search_queries,
					},
				};
			} catch (err: any) {
				if (err.name === "AbortError") {
					return {
						content: [{ type: "text", text: "Search cancelled." }],
						details: {},
					};
				}
				return {
					content: [{ type: "text", text: `Search failed: ${err.message}` }],
					isError: true,
					details: {},
				};
			}
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("web_search "));
			const queries = args.search_queries as string[];
			if (queries?.length) {
				text += theme.fg("muted", queries.map((q: string) => `"${q}"`).join(", "));
			}
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded, isPartial }, theme) {
			if (isPartial) {
				return new Text(theme.fg("warning", "Searching…"), 0, 0);
			}

			if (result.isError) {
				const errMsg = result.content?.find((c: any) => c.type === "text")?.text ?? "Unknown error";
				return new Text(theme.fg("error", errMsg), 0, 0);
			}

			const count = result.details?.resultCount ?? 0;
			let text = theme.fg("success", `✓ ${count} result${count !== 1 ? "s" : ""}`);

			if (expanded) {
				const fullText = result.content?.find((c: any) => c.type === "text")?.text ?? "";
				if (fullText) {
					text += "\n" + theme.fg("dim", fullText);
				}
			}

			return new Text(text, 0, 0);
		},
	});
}
