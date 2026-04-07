import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  truncateTail,
  type ExtensionAPI,
} from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const SEARCH_API_URL = process.env.PARALLEL_SEARCH_API_URL ?? "https://api.parallel.ai/v1beta/search";
const SEARCH_BETA_HEADER = process.env.PARALLEL_SEARCH_BETA_HEADER ?? "search-extract-2025-10-10";

const SEARCH_MODE = Type.Union([
  Type.Literal("one-shot"),
  Type.Literal("agentic"),
  Type.Literal("fast"),
]);

const TOOL_SCHEMA = Type.Object(
  {
    mode: Type.Optional(SEARCH_MODE),
    objective: Type.Optional(Type.String({ minLength: 1 })),
    search_queries: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1, maxItems: 5 })),
    processor: Type.Optional(Type.Union([Type.Literal("base"), Type.Literal("pro")], {
      description: "Deprecated by Parallel API; prefer mode.",
    })),
    max_results: Type.Optional(Type.Integer({ minimum: 1 })),
    max_chars_per_result: Type.Optional(
      Type.Integer({ minimum: 1, description: "Deprecated by Parallel API; prefer excerpts.max_chars_per_result." }),
    ),
    excerpts: Type.Optional(
      Type.Object({
        max_chars_per_result: Type.Optional(Type.Integer({ minimum: 1 })),
        max_chars_total: Type.Optional(Type.Integer({ minimum: 1 })),
      }),
    ),
    source_policy: Type.Optional(
      Type.Object({
        include_domains: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
        exclude_domains: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
        after_date: Type.Optional(
          Type.String({ description: "RFC 3339 date: YYYY-MM-DD", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
        ),
      }),
    ),
    fetch_policy: Type.Optional(
      Type.Object({
        max_age_seconds: Type.Optional(Type.Integer({ minimum: 600 })),
        timeout_seconds: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
        disable_cache_fallback: Type.Optional(Type.Boolean()),
      }),
    ),
  },
  { additionalProperties: false },
);

function buildRequestBody(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
}

export default function parallelSearchApiExtension(pi: ExtensionAPI) {
  (globalThis as any).__piProfiler?.begin("parallel-search-api");
  pi.registerTool({
    name: "parallel_search_beta_search",
    label: "Parallel Search API (v1beta/search)",
    description: "Direct Parallel Search API call with full v1beta/search request options.",
    promptSnippet:
      "Run a Parallel Search API request against /v1beta/search. Prefer mode=one-shot for richer single-response results.",
    promptGuidelines: [
      "Requires PARALLEL_API_KEY (or PARALLEL_SEARCH_API_KEY) in environment.",
      "At least one of objective or search_queries is required.",
      "Use mode one-shot | agentic | fast depending on trade-off needs.",
    ],
    parameters: TOOL_SCHEMA,
    async execute(_toolCallId, params) {
      const apiKey = process.env.PARALLEL_API_KEY ?? process.env.PARALLEL_SEARCH_API_KEY;
      if (!apiKey) {
        return {
          content: [
            {
              type: "text",
              text: "Missing API key. Set PARALLEL_API_KEY (or PARALLEL_SEARCH_API_KEY) in your environment.",
            },
          ],
          isError: true,
        };
      }

      const hasObjective = typeof params.objective === "string" && params.objective.trim().length > 0;
      const hasQueries = Array.isArray(params.search_queries) && params.search_queries.length > 0;
      if (!hasObjective && !hasQueries) {
        return {
          content: [
            {
              type: "text",
              text: "Invalid request: provide at least one of objective or search_queries.",
            },
          ],
          isError: true,
        };
      }

      const requestBody = buildRequestBody(params as Record<string, unknown>);

      let response: Response;
      try {
        response = await fetch(SEARCH_API_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "parallel-beta": SEARCH_BETA_HEADER,
          },
          body: JSON.stringify(requestBody),
        });
      } catch (error) {
        return {
          content: [{ type: "text", text: `Network error calling Parallel Search API: ${(error as Error).message}` }],
          isError: true,
        };
      }

      const raw = await response.text();
      const truncation = truncateTail(raw || "(no output)", {
        maxBytes: DEFAULT_MAX_BYTES,
        maxLines: DEFAULT_MAX_LINES,
      });

      let text = truncation.content;
      if (truncation.truncated) {
        text += `\n\n[Output truncated: ${truncation.outputLines}/${truncation.totalLines} lines, ${formatSize(truncation.outputBytes)}/${formatSize(truncation.totalBytes)}]`;
      }

      let parsed: Record<string, unknown> | undefined;
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        parsed = undefined;
      }

      if (!response.ok) {
        return {
          content: [{ type: "text", text: `Parallel Search API error (${response.status}):\n${text}` }],
          isError: true,
          details: {
            status: response.status,
          },
        };
      }

      return {
        content: [{ type: "text", text }],
        isError: false,
        details: {
          status: response.status,
          searchId: typeof parsed?.search_id === "string" ? parsed.search_id : undefined,
          resultCount: Array.isArray(parsed?.results) ? parsed.results.length : undefined,
          mode: requestBody.mode,
        },
      };
    },
  });
  (globalThis as any).__piProfiler?.end("parallel-search-api");
}
