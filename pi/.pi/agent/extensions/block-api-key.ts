/**
 * Block Anthropic API Key Extension
 *
 * Removes ANTHROPIC_API_KEY from the process environment so pi
 * can only authenticate via OAuth / subscription login.
 * This prevents accidental API billing when you want to use
 * your Claude Pro/Max subscription.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  (globalThis as any).__piProfiler?.begin("block-api-key");
  // Strip the API key from the process environment immediately on load.
  // This runs before any provider request can use it.
  const hadKey = !!process.env.ANTHROPIC_API_KEY;

  if (hadKey) {
    delete process.env.ANTHROPIC_API_KEY;
  }

  pi.on("session_start", async (_event, ctx) => {
    if (hadKey) {
      ctx.ui.notify(
        "🔒 ANTHROPIC_API_KEY removed from environment — using subscription auth only",
        "info"
      );
    } else {
      ctx.ui.notify(
        "🔒 No ANTHROPIC_API_KEY detected — subscription auth only",
        "info"
      );
    }
  });

  // Belt-and-suspenders: also guard every provider request
  pi.on("before_provider_request", (event, ctx) => {
    // Re-check in case something re-injects the key at runtime
    if (process.env.ANTHROPIC_API_KEY) {
      delete process.env.ANTHROPIC_API_KEY;
      ctx.ui.notify(
        "⚠️ ANTHROPIC_API_KEY was re-injected and has been removed again",
        "warning"
      );
    }
  });
  (globalThis as any).__piProfiler?.end("block-api-key");
}
