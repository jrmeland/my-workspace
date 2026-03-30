import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function clearSessionExtension(pi: ExtensionAPI) {
  pi.registerCommand("clear", {
    description: "Start a fresh session with no conversation history",
    handler: async (_args, ctx) => {
      await ctx.waitForIdle();
      const result = await ctx.newSession();

      if (result.cancelled) {
        ctx.ui.notify("/clear cancelled", "warning");
        return;
      }

      ctx.ui.notify("Started a fresh session (/clear)", "success");
    },
  });
}
