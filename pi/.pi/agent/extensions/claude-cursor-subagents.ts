import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Message } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { parseFrontmatter } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

type Origin = ".claude" | ".cursor";

interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  tools?: string[];
  model?: string;
  filePath: string;
  origin: Origin;
}

interface UsageStats {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  turns: number;
}

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".venv",
  "venv",
  "dist",
  "build",
  "__pycache__",
]);

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

function walkDirs(root: string): string[] {
  const results: string[] = [];

  function walk(current: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name)) continue;

      const full = path.join(current, entry.name);
      if (entry.name === ".claude" || entry.name === ".cursor") {
        results.push(full);
      }

      walk(full);
    }
  }

  walk(root);
  return results;
}

function parseTools(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const tools = value.map((x) => String(x).trim()).filter(Boolean);
    return tools.length > 0 ? tools : undefined;
  }
  if (typeof value === "string") {
    const tools = value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return tools.length > 0 ? tools : undefined;
  }
  return undefined;
}

function parseMarkdownAgent(filePath: string, content: string, origin: Origin): AgentConfig | null {
  const { frontmatter, body } = parseFrontmatter<Record<string, unknown>>(content);

  const rawName = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
  const name = rawName || path.basename(filePath, path.extname(filePath));
  if (!name) return null;

  const description =
    typeof frontmatter.description === "string" && frontmatter.description.trim()
      ? frontmatter.description.trim()
      : `Subagent loaded from ${toPosix(filePath)}`;

  const model = typeof frontmatter.model === "string" && frontmatter.model.trim() ? frontmatter.model.trim() : undefined;
  const tools = parseTools(frontmatter.tools);

  const systemPrompt = body.trim();
  if (!systemPrompt) return null;

  return { name, description, systemPrompt, tools, model, filePath, origin };
}

function parseJsonAgent(filePath: string, content: string, origin: Origin): AgentConfig | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }

  const rawName = typeof parsed.name === "string" ? parsed.name.trim() : "";
  const name = rawName || path.basename(filePath, path.extname(filePath));
  if (!name) return null;

  const prompt =
    typeof parsed.systemPrompt === "string"
      ? parsed.systemPrompt
      : typeof parsed.prompt === "string"
        ? parsed.prompt
        : "";
  if (!prompt.trim()) return null;

  const description =
    typeof parsed.description === "string" && parsed.description.trim()
      ? parsed.description.trim()
      : `Subagent loaded from ${toPosix(filePath)}`;

  const model = typeof parsed.model === "string" && parsed.model.trim() ? parsed.model.trim() : undefined;
  const tools = parseTools(parsed.tools);

  return {
    name,
    description,
    systemPrompt: prompt.trim(),
    tools,
    model,
    filePath,
    origin,
  };
}

function loadAgentsFromRoot(root: string): AgentConfig[] {
  const origin: Origin = path.basename(root) === ".claude" ? ".claude" : ".cursor";
  const agents: AgentConfig[] = [];

  function walk(current: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(full);
        continue;
      }

      if (!entry.isFile() && !entry.isSymbolicLink()) continue;

      const lower = entry.name.toLowerCase();
      if (!(lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".mdx") || lower.endsWith(".json"))) {
        continue;
      }

      let content: string;
      try {
        content = fs.readFileSync(full, "utf-8");
      } catch {
        continue;
      }

      const parsed = lower.endsWith(".json")
        ? parseJsonAgent(full, content, origin)
        : parseMarkdownAgent(full, content, origin);

      if (!parsed) continue;

      // Heuristic: avoid treating random docs as subagents.
      // Keep files that are in an agents/ directory OR explicitly define name in frontmatter/json.
      const rel = toPosix(path.relative(root, full));
      const looksLikeAgentPath = rel.includes("/agents/") || rel.startsWith("agents/");
      const explicitName = parsed.name !== path.basename(full, path.extname(full));
      if (!looksLikeAgentPath && !explicitName) continue;

      agents.push(parsed);
    }
  }

  walk(root);
  return agents;
}

function discoverAgents(cwd: string): AgentConfig[] {
  const roots = walkDirs(cwd);
  roots.sort((a, b) => a.localeCompare(b));

  const byName = new Map<string, AgentConfig>();
  for (const root of roots) {
    for (const agent of loadAgentsFromRoot(root)) {
      // First match wins for stability.
      if (!byName.has(agent.name)) byName.set(agent.name, agent);
    }
  }
  return Array.from(byName.values());
}

function getFinalText(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    for (const part of msg.content) {
      if (part.type === "text" && part.text.trim()) return part.text;
    }
  }
  return "";
}

function writePromptToTempFile(agentName: string, prompt: string): { dir: string; filePath: string } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-subagent-"));
  const safeName = agentName.replace(/[^\w.-]+/g, "_");
  const filePath = path.join(tmpDir, `prompt-${safeName}.md`);
  fs.writeFileSync(filePath, prompt, { encoding: "utf-8", mode: 0o600 });
  return { dir: tmpDir, filePath };
}

async function runSubagent(
  baseCwd: string,
  agent: AgentConfig,
  task: string,
  overrideCwd: string | undefined,
  signal: AbortSignal | undefined,
  onUpdate?: (text: string) => void,
): Promise<{ exitCode: number; stderr: string; messages: Message[]; usage: UsageStats }> {
  const args: string[] = ["--mode", "json", "-p", "--no-session"];
  if (agent.model) args.push("--model", agent.model);
  if (agent.tools && agent.tools.length > 0) args.push("--tools", agent.tools.join(","));

  let tmpPromptDir: string | null = null;
  let tmpPromptPath: string | null = null;

  const messages: Message[] = [];
  const usage: UsageStats = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, turns: 0 };
  let stderr = "";

  try {
    const tmp = writePromptToTempFile(agent.name, agent.systemPrompt);
    tmpPromptDir = tmp.dir;
    tmpPromptPath = tmp.filePath;

    args.push("--append-system-prompt", tmpPromptPath);
    args.push(`Task: ${task}`);

    const exitCode = await new Promise<number>((resolve) => {
      const proc = spawn("pi", args, {
        cwd: overrideCwd ?? baseCwd,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let buffer = "";

      const processLine = (line: string) => {
        if (!line.trim()) return;
        let event: any;
        try {
          event = JSON.parse(line);
        } catch {
          return;
        }

        if (event.type === "message_end" && event.message) {
          const msg = event.message as Message;
          messages.push(msg);
          if (msg.role === "assistant") {
            usage.turns += 1;
            if (msg.usage) {
              usage.input += msg.usage.input || 0;
              usage.output += msg.usage.output || 0;
              usage.cacheRead += msg.usage.cacheRead || 0;
              usage.cacheWrite += msg.usage.cacheWrite || 0;
              usage.cost += msg.usage.cost?.total || 0;
            }
          }
          const latest = getFinalText(messages);
          if (latest && onUpdate) onUpdate(latest);
        }

        if (event.type === "tool_result_end" && event.message) {
          messages.push(event.message as Message);
        }
      };

      proc.stdout.on("data", (data) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) processLine(line);
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (buffer.trim()) processLine(buffer);
        resolve(code ?? 0);
      });

      proc.on("error", () => resolve(1));

      if (signal) {
        const killProc = () => {
          proc.kill("SIGTERM");
          setTimeout(() => {
            if (!proc.killed) proc.kill("SIGKILL");
          }, 3000);
        };
        if (signal.aborted) killProc();
        else signal.addEventListener("abort", killProc, { once: true });
      }
    });

    return { exitCode, stderr, messages, usage };
  } finally {
    if (tmpPromptPath) {
      try {
        fs.unlinkSync(tmpPromptPath);
      } catch {
        // ignore
      }
    }
    if (tmpPromptDir) {
      try {
        fs.rmdirSync(tmpPromptDir);
      } catch {
        // ignore
      }
    }
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("subagents", {
    description: "List discovered subagents from nested .claude/.cursor directories",
    handler: async (_args, ctx) => {
      const agents = discoverAgents(ctx.cwd);
      if (agents.length === 0) {
        ctx.ui.notify("No subagents discovered in .claude or .cursor folders.", "warning");
        return;
      }

      const lines = agents
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => `- ${a.name}: ${a.description} (${a.origin} @ ${toPosix(path.relative(ctx.cwd, a.filePath))})`);

      ctx.ui.notify(`Discovered ${agents.length} subagent(s).`, "info");
      pi.sendMessage({
        customType: "subagents-list",
        content: lines.join("\n"),
        display: true,
      });
    },
  });

  pi.registerTool({
    name: "list_subagents",
    label: "List Subagents",
    description: "Discover available subagents from .claude/.cursor folders recursively under the current working directory.",
    parameters: Type.Object({
      cwd: Type.Optional(Type.String({ description: "Optional directory to search from. Defaults to current working directory." })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const searchCwd = params.cwd ?? ctx.cwd;
      const agents = discoverAgents(searchCwd)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));

      if (agents.length === 0) {
        return {
          content: [{ type: "text", text: `No subagents found under ${searchCwd}.` }],
          details: { count: 0, agents: [] },
        };
      }

      const text = agents
        .map((a) => `- ${a.name}: ${a.description} (${a.origin} @ ${toPosix(path.relative(searchCwd, a.filePath))})`)
        .join("\n");

      return {
        content: [{ type: "text", text: `Discovered ${agents.length} subagent(s):\n${text}` }],
        details: {
          count: agents.length,
          agents: agents.map((a) => ({ name: a.name, description: a.description, origin: a.origin, filePath: a.filePath })),
        },
      };
    },
  });

  pi.registerTool({
    name: "subagent",
    label: "Subagent",
    description:
      "Run a discovered subagent from .claude/.cursor recursively under the current working directory in an isolated pi subprocess.",
    promptGuidelines: [
      "Call list_subagents first when you need to discover available subagents.",
      "Then call subagent with {agent, task} to delegate focused work.",
    ],
    parameters: Type.Object({
      agent: Type.String({ description: "Name of the discovered subagent to run." }),
      task: Type.String({ description: "Task to delegate to that subagent." }),
      cwd: Type.Optional(Type.String({ description: "Working directory for subagent execution. Defaults to current working directory." })),
    }),

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const searchCwd = ctx.cwd;
      const agents = discoverAgents(searchCwd);
      const found = agents.find((a) => a.name === params.agent) ?? agents.find((a) => a.name.toLowerCase() === params.agent.toLowerCase());

      if (!found) {
        const available = agents.map((a) => a.name).sort().join(", ") || "none";
        return {
          content: [{ type: "text", text: `Unknown subagent: ${params.agent}. Available: ${available}` }],
          details: { ok: false, availableAgents: agents.map((a) => a.name) },
        };
      }

      let latestText = "";
      const result = await runSubagent(searchCwd, found, params.task, params.cwd, signal, (text) => {
        latestText = text;
        onUpdate?.({
          content: [{ type: "text", text: latestText.slice(0, 8000) }],
          details: { status: "running", agent: found.name },
        });
      });

      const finalOutput = getFinalText(result.messages) || latestText || "(No assistant output)";
      const status = result.exitCode === 0 ? "completed" : "failed";

      const summary = [
        `${found.name} ${status} (exit ${result.exitCode})`,
        `Source: ${found.origin} @ ${toPosix(path.relative(searchCwd, found.filePath))}`,
        `Turns: ${result.usage.turns}, Tokens: in ${result.usage.input} / out ${result.usage.output}, Cost: $${result.usage.cost.toFixed(4)}`,
        "",
        finalOutput,
      ].join("\n");

      return {
        content: [{ type: "text", text: summary }],
        details: {
          ok: result.exitCode === 0,
          agent: found.name,
          filePath: found.filePath,
          origin: found.origin,
          exitCode: result.exitCode,
          stderr: result.stderr,
          usage: result.usage,
        },
      };
    },
  });
}
