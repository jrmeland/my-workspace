import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  truncateTail,
  type ExtensionAPI,
} from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

type McporterServerStatus = "ok" | "auth" | "offline" | "http" | "error";

interface McporterToolInfo {
  name: string;
  description?: string;
}

interface McporterServer {
  name: string;
  status: McporterServerStatus;
  tools?: McporterToolInfo[];
  error?: string;
  authCommand?: string;
}

interface McporterListResponse {
  servers?: McporterServer[];
}

interface McporterSchemaTool {
  name: string;
  description?: string;
  inputSchema?: {
    properties?: Record<string, { description?: string }>;
    required?: string[];
  };
}

interface McporterSchemaResponse {
  name: string;
  description?: string;
  status: McporterServerStatus;
  tools?: McporterSchemaTool[];
}

const TOOL_ARGS_SCHEMA = Type.Object({
  argsJson: Type.Optional(
    Type.String({
      description:
        "Optional JSON object string with arguments for this MCP tool call. Example: {\"limit\":10}",
    }),
  ),
});

const COMMAND_TIMEOUT_MS = 120_000;
const INSTRUCTION_ROOT = resolve(__dirname, "..", "mcp-instructions");
const SERVER_INSTRUCTION_DIR = join(INSTRUCTION_ROOT, "servers");
const CALL_INSTRUCTION_DIR = join(INSTRUCTION_ROOT, "calls");

function safeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_\-.]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function parseJsonObject<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return undefined;
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as T;
    } catch {
      return undefined;
    }
  }
}

function parseMcporterListText(text: string): McporterListResponse | undefined {
  if (!text.trim()) return undefined;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const servers: McporterServer[] = [];
  for (const line of lines) {
    const match = line.match(/^[-*]\s+([a-zA-Z0-9_.-]+)\s*\(([^)]*)\)/);
    if (!match) continue;

    const name = match[1];
    const metadata = match[2].toLowerCase();
    let status: McporterServerStatus = "error";

    if (metadata.includes("auth required")) status = "auth";
    else if (metadata.includes("offline")) status = "offline";
    else if (metadata.includes("http")) status = "http";
    else if (metadata.includes("tool") || metadata.includes("healthy") || /\d+(?:\s+tool|\s+tools)/.test(metadata)) {
      status = "ok";
    }

    servers.push({ name, status });
  }

  return servers.length > 0 ? { servers } : undefined;
}

function parseMcporterListResponse(stdout: string, stderr: string): McporterListResponse | undefined {
  const direct = parseJsonObject<McporterListResponse>(stdout);
  if (direct?.servers) return direct;

  const combined = [stdout, stderr].filter(Boolean).join("\n");
  const combinedJson = parseJsonObject<McporterListResponse>(combined);
  if (combinedJson?.servers) return combinedJson;

  return parseMcporterListText(combined);
}

function parseMcporterServerToolsText(text: string): McporterToolInfo[] {
  const tools: McporterToolInfo[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const fn = line.match(/^function\s+([a-zA-Z0-9_.-]+)\s*\(/);
    if (!fn) continue;

    const name = fn[1];
    if (seen.has(name)) continue;

    seen.add(name);
    tools.push({ name });
  }

  return tools;
}

function renderToolArgSummary(tool: McporterSchemaTool): { required: string[]; optional: string[] } {
  const required = tool.inputSchema?.required ?? [];
  const allProps = Object.keys(tool.inputSchema?.properties ?? {});
  const optional = allProps.filter((name) => !required.includes(name));
  return { required, optional };
}

function summarizeDescription(description?: string): string | undefined {
  if (!description) return undefined;

  const firstNonEmptyLine = description
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstNonEmptyLine) return undefined;
  return firstNonEmptyLine.replace(/^[-*]\s*/, "");
}

function toYamlSingleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim().replace(/"/g, '\\"');
}

function buildServerInstructionMarkdown(server: McporterSchemaResponse): string {
  const now = new Date().toISOString();
  const tools = server.tools ?? [];
  const serverDescription =
    summarizeDescription(server.description) ??
    `Usage instructions for MCP server ${server.name}, including auth, tool discovery, and call patterns.`;

  const lines: string[] = [];
  lines.push("---");
  lines.push(`name: "${safeName(server.name)}"`);
  lines.push(`description: "${toYamlSingleLine(`MCP server usage instructions for ${server.name}, including auth and tool call patterns.`)}"`);
  lines.push("---");
  lines.push("");
  lines.push(`# MCP Server Instructions: ${server.name}`);
  lines.push("");
  lines.push(`Generated: ${now}`);
  lines.push(`Description: ${serverDescription}`);
  lines.push(`Server status at generation: ${server.status}`);
  lines.push("");
  lines.push("## Auth");
  lines.push(`- Refresh auth when needed: \`mcporter auth ${server.name}\``);
  lines.push("");
  lines.push("## How to call tools");
  lines.push(`- Raw CLI: \`mcporter call ${server.name}.<tool> --args '{\"key\":\"value\"}'\``);
  lines.push(`- pi command: \`/mcp-call ${server.name}.<tool> {\"key\":\"value\"}\``);
  lines.push(`- pi dynamic tool: \`mcp_${safeName(server.name)}_<tool>\` with \`argsJson\``);
  lines.push("");
  lines.push("## Available tools");
  lines.push("");

  if (tools.length === 0) {
    lines.push("No tools discovered.");
  } else {
    for (const tool of tools) {
      const toolSummary = summarizeDescription(tool.description);
      lines.push(`- ${tool.name}${toolSummary ? ` — ${toolSummary}` : ""}`);
    }
  }

  lines.push("");
  lines.push("## Per-call instructions");
  lines.push(`- See files in: \`mcp-instructions/calls/${safeName(server.name)}/\``);

  return lines.join("\n");
}

function buildCallInstructionMarkdown(serverName: string, tool: McporterSchemaTool): string {
  const now = new Date().toISOString();
  const summary = renderToolArgSummary(tool);
  const callDescription =
    summarizeDescription(tool.description) ??
    `MCP call usage instructions for ${serverName}.${tool.name}, including arguments and examples.`;

  const lines: string[] = [];
  lines.push("---");
  lines.push(`name: "calls-${safeName(serverName)}-${safeName(tool.name)}"`);
  lines.push(`description: "${toYamlSingleLine(callDescription)}"`);
  lines.push("---");
  lines.push("");
  lines.push(`# MCP Call Instructions: ${serverName}.${tool.name}`);
  lines.push("");
  lines.push(`Generated: ${now}`);
  lines.push("");

  if (tool.description) {
    lines.push(`Description: ${tool.description}`);
    lines.push("");
  }

  lines.push("## Preferred usage");
  lines.push(`- First use in a session: verify/refresh auth if prompted.`);
  lines.push(`- Direct CLI: \`mcporter call ${serverName}.${tool.name} --args '{\"k\":\"v\"}'\``);
  lines.push(`- pi command: \`/mcp-call ${serverName}.${tool.name} {\"k\":\"v\"}\``);
  lines.push(`- pi tool: \`mcp_${safeName(serverName)}_${safeName(tool.name)}\` with \`argsJson\``);
  lines.push("");

  lines.push("## Arguments");
  lines.push(`- Required: ${summary.required.length > 0 ? summary.required.join(", ") : "none"}`);
  lines.push(`- Optional: ${summary.optional.length > 0 ? summary.optional.join(", ") : "none"}`);
  lines.push("");

  if (summary.required.length > 0) {
    const exampleBody = summary.required.map((name) => `\"${name}\":\"...\"`).join(",");
    lines.push("## Example");
    lines.push(`- \`mcporter call ${serverName}.${tool.name} --args '{${exampleBody}}'\``);
  } else {
    lines.push("## Example");
    lines.push(`- \`mcporter call ${serverName}.${tool.name}\``);
  }

  return lines.join("\n");
}

export default function mcporterMcpBootstrap(pi: ExtensionAPI) {
  (globalThis as any).__piProfiler?.begin("mcporter-mcp-bootstrap");
  const registeredToolNames = new Set<string>();
  const authCheckedThisSession = new Set<string>();
  const discoveredServers = new Map<string, McporterServer>();
  const discoveredSelectors = new Set<string>();

  const runMcporter = async (args: string[], timeout = COMMAND_TIMEOUT_MS, signal?: AbortSignal) => {
    return pi.exec("mcporter", args, { timeout, signal });
  };

  const ensureInstructionArtifacts = async (serverName: string) => {
    const serverSkillDir = join(SERVER_INSTRUCTION_DIR, safeName(serverName));
    const serverFilePath = join(serverSkillDir, "SKILL.md");

    mkdirSync(SERVER_INSTRUCTION_DIR, { recursive: true });
    mkdirSync(CALL_INSTRUCTION_DIR, { recursive: true });
    mkdirSync(serverSkillDir, { recursive: true });

    const perServerCallDir = join(CALL_INSTRUCTION_DIR, safeName(serverName));
    mkdirSync(perServerCallDir, { recursive: true });

    const schemaResult = await runMcporter(["list", serverName, "--schema", "--json"]);
    if (schemaResult.code !== 0) return;

    const parsed = parseJsonObject<McporterSchemaResponse>(schemaResult.stdout);
    if (!parsed) return;

    if (!existsSync(serverFilePath)) {
      const renderedServerInstructions = buildServerInstructionMarkdown(parsed);
      writeFileSync(serverFilePath, renderedServerInstructions, "utf8");
    }

    for (const tool of parsed.tools ?? []) {
      const callFilePath = join(perServerCallDir, `${safeName(tool.name)}.md`);
      if (!existsSync(callFilePath)) {
        writeFileSync(callFilePath, buildCallInstructionMarkdown(serverName, tool), "utf8");
      }
    }
  };

  const ensureAuthIfNeeded = async (serverName: string, ctx: { hasUI?: boolean; ui?: any }, signal?: AbortSignal) => {
    if (authCheckedThisSession.has(serverName)) return { ok: true as const };

    const statusResult = await runMcporter(["list", serverName, "--json"], COMMAND_TIMEOUT_MS, signal);
    const parsed = parseJsonObject<McporterServer>(statusResult.stdout);

    if (!parsed) {
      authCheckedThisSession.add(serverName);
      return { ok: true as const };
    }

    if (parsed.status !== "auth") {
      authCheckedThisSession.add(serverName);
      return { ok: true as const };
    }

    if (ctx.hasUI && ctx.ui) {
      const shouldAuth = await ctx.ui.confirm(
        `MCP auth needed: ${serverName}`,
        `Auth appears expired for ${serverName}. Run 'mcporter auth ${serverName}' now?`,
      );
      if (!shouldAuth) {
        return {
          ok: false as const,
          message: `Auth required for ${serverName}. Run: mcporter auth ${serverName}`,
        };
      }
    } else {
      return {
        ok: false as const,
        message: `Auth required for ${serverName}. Run: mcporter auth ${serverName}`,
      };
    }

    const authResult = await runMcporter(["auth", serverName], 180_000, signal);
    if (authResult.code !== 0) {
      return {
        ok: false as const,
        message: authResult.stderr || authResult.stdout || `Failed to refresh auth for ${serverName}`,
      };
    }

    authCheckedThisSession.add(serverName);
    return { ok: true as const };
  };

  const registerMcpTool = (serverName: string, tool: McporterToolInfo) => {
    const toolName = safeName(`mcp_${serverName}_${tool.name}`);
    if (!toolName || registeredToolNames.has(toolName)) return;

    registeredToolNames.add(toolName);
    discoveredSelectors.add(`${serverName}.${tool.name}`);

    pi.registerTool({
      name: toolName,
      label: `MCP ${serverName}.${tool.name}`,
      description: tool.description || `Call MCP tool ${serverName}.${tool.name}`,
      promptSnippet: `Call MCP tool ${serverName}.${tool.name} via mcporter`,
      promptGuidelines: [
        "Before first MCP use per server in this session, ensure auth is valid.",
        "Pass argsJson as a JSON object string only when args are required.",
      ],
      parameters: TOOL_ARGS_SCHEMA,
      async execute(_toolCallId, params, signal) {
        const auth = await ensureAuthIfNeeded(serverName, { hasUI: false }, signal);
        if (!auth.ok) {
          return { content: [{ type: "text", text: auth.message }], isError: true };
        }

        let argsPayload: Record<string, unknown> | undefined;
        if (params.argsJson?.trim()) {
          try {
            const parsed = JSON.parse(params.argsJson);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              argsPayload = parsed as Record<string, unknown>;
            } else {
              return {
                content: [{ type: "text", text: "argsJson must be a JSON object string." }],
                isError: true,
              };
            }
          } catch (error) {
            return {
              content: [{ type: "text", text: `Invalid argsJson: ${(error as Error).message}` }],
              isError: true,
            };
          }
        }

        const callArgs = ["call", `${serverName}.${tool.name}`, "--output", "json"];
        if (argsPayload) callArgs.push("--args", JSON.stringify(argsPayload));

        const callResult = await runMcporter(callArgs, COMMAND_TIMEOUT_MS, signal);
        const rawOutput = [callResult.stdout, callResult.stderr].filter(Boolean).join("\n").trim();

        const truncation = truncateTail(rawOutput || "(no output)", {
          maxBytes: DEFAULT_MAX_BYTES,
          maxLines: DEFAULT_MAX_LINES,
        });

        let text = truncation.content;
        let fullOutputPath: string | undefined;

        if (truncation.truncated) {
          const tempDir = mkdtempSync(join(tmpdir(), "pi-mcp-"));
          fullOutputPath = join(tempDir, `${toolName}.log`);
          writeFileSync(fullOutputPath, rawOutput, "utf8");
          text += `\n\n[Output truncated: ${truncation.outputLines}/${truncation.totalLines} lines, ${formatSize(truncation.outputBytes)}/${formatSize(truncation.totalBytes)}. Full output: ${fullOutputPath}]`;
        }

        return {
          content: [{ type: "text", text }],
          isError: callResult.code !== 0,
          details: {
            selector: `${serverName}.${tool.name}`,
            exitCode: callResult.code,
            fullOutputPath,
          },
        };
      },
    });
  };

  const discoverAndRegister = async (ctx: { ui: any; hasUI?: boolean }) => {
    let parsed: McporterListResponse | undefined;

    const textResult = await runMcporter(["list"]);
    if (textResult.code === 0) {
      parsed = parseMcporterListText([textResult.stdout, textResult.stderr].filter(Boolean).join("\n"));
    }

    if (!parsed?.servers) {
      const jsonResult = await runMcporter(["list", "--json"]);
      if (jsonResult.code !== 0) {
        ctx.ui.notify(`mcporter list failed: ${jsonResult.stderr || jsonResult.stdout}`, "warning");
        return;
      }

      parsed = parseMcporterListResponse(jsonResult.stdout, jsonResult.stderr);
      if (!parsed?.servers) {
        const sample = [jsonResult.stdout, jsonResult.stderr].filter(Boolean).join("\n").slice(0, 300);
        ctx.ui.notify(`mcporter list returned unreadable JSON${sample ? `: ${sample}` : ""}`, "warning");
        return;
      }
    }

    for (const server of parsed.servers) {
      let hydratedServer = server;

      // Do not do deeper discovery for servers that are not already healthy.
      // Auth checks/refreshes should only happen at tool invocation time.
      if (hydratedServer.status === "ok") {
        if (!hydratedServer.tools || hydratedServer.tools.length === 0) {
          const serverResult = await runMcporter(["list", server.name, "--json"]);
          const fromServerList = parseJsonObject<McporterServer>(serverResult.stdout);
          if (fromServerList?.name) {
            hydratedServer = {
              ...hydratedServer,
              ...fromServerList,
              tools: fromServerList.tools ?? hydratedServer.tools,
            };
          }
        }

        if (!hydratedServer.tools || hydratedServer.tools.length === 0) {
          const serverTextResult = await runMcporter(["list", server.name]);
          const toolsFromText = parseMcporterServerToolsText([serverTextResult.stdout, serverTextResult.stderr].join("\n"));
          if (toolsFromText.length > 0) {
            hydratedServer = { ...hydratedServer, tools: toolsFromText };
          }
        }
      }

      discoveredServers.set(hydratedServer.name, hydratedServer);

      if (hydratedServer.status === "ok") {
        await ensureInstructionArtifacts(hydratedServer.name);
        for (const tool of hydratedServer.tools ?? []) registerMcpTool(hydratedServer.name, tool);
      }
    }

    ctx.ui.notify(
      `mcporter: discovered ${parsed.servers.length} server(s), ${registeredToolNames.size} MCP tool command(s) registered`,
      "info",
    );
  };

  pi.on("resources_discover", () => {
    const skillPaths = [INSTRUCTION_ROOT, SERVER_INSTRUCTION_DIR, CALL_INSTRUCTION_DIR].filter((path) => existsSync(path));
    return { skillPaths };
  });

  const runMcpRefresh = async (ctx: { ui: any; hasUI?: boolean }, source: "manual" | "startup") => {
    if (source === "startup") {
      ctx.ui.notify("Running /mcp-refresh on session start", "info");
    }
    await discoverAndRegister(ctx);
  };

  pi.registerCommand("mcp-refresh", {
    description: "Refresh MCP discovery from mcporter and register tools",
    handler: async (_args, ctx) => {
      await runMcpRefresh(ctx, "manual");
    },
  });

  pi.registerCommand("mcp-list", {
    description: "List discovered MCP servers and statuses",
    handler: async (_args, ctx) => {
      if (discoveredServers.size === 0) {
        ctx.ui.notify("No MCP servers discovered yet. Run /mcp-refresh", "warning");
        return;
      }
      const lines = [...discoveredServers.values()].map((s) => `${s.name}: ${s.status}`);
      ctx.ui.notify(lines.join(" | "), "info");
    },
  });

  pi.registerCommand("mcp-auth", {
    description: "Refresh auth for an MCP server: /mcp-auth <server>",
    handler: async (args, ctx) => {
      const server = args?.trim();
      if (!server) {
        ctx.ui.notify("Usage: /mcp-auth <server>", "warning");
        return;
      }

      const result = await runMcporter(["auth", server], 180_000);
      if (result.code !== 0) {
        ctx.ui.notify(result.stderr || result.stdout || `Failed to auth ${server}`, "error");
        return;
      }

      authCheckedThisSession.add(server);
      ctx.ui.notify(`Auth refreshed for ${server}`, "info");
    },
  });

  pi.registerCommand("mcp-call", {
    description: "Call MCP by selector: /mcp-call <server.tool> [jsonArgs]",
    getArgumentCompletions: (prefix) => {
      const startsWith = prefix.trim();
      const items = [...discoveredSelectors]
        .filter((selector) => selector.startsWith(startsWith))
        .slice(0, 100)
        .map((selector) => ({ value: selector, label: selector }));
      return items.length > 0 ? items : null;
    },
    handler: async (args, ctx) => {
      const trimmed = (args ?? "").trim();
      if (!trimmed) {
        ctx.ui.notify("Usage: /mcp-call <server.tool> [jsonArgs]", "warning");
        return;
      }

      const [selector, ...rest] = trimmed.split(" ");
      const jsonArg = rest.join(" ").trim();
      const serverName = selector.split(".")[0];

      const auth = await ensureAuthIfNeeded(serverName, ctx);
      if (!auth.ok) {
        ctx.ui.notify(auth.message, "warning");
        return;
      }

      const callArgs = ["call", selector, "--output", "json"];
      if (jsonArg) callArgs.push("--args", jsonArg);

      const result = await runMcporter(callArgs);
      const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim() || "(no output)";
      const truncation = truncateTail(output, { maxBytes: DEFAULT_MAX_BYTES, maxLines: DEFAULT_MAX_LINES });

      let finalText = truncation.content;
      if (truncation.truncated) {
        finalText += `\n\n[Truncated: ${truncation.outputLines}/${truncation.totalLines} lines.]`;
      }

      pi.sendMessage({
        customType: "mcp-call",
        content: finalText,
        display: true,
        details: { selector, exitCode: result.code },
      });
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    authCheckedThisSession.clear();
    await runMcpRefresh(ctx, "startup");
  });
  (globalThis as any).__piProfiler?.end("mcporter-mcp-bootstrap");
}
