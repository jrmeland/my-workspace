import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  const packageName = "@mariozechner/pi-coding-agent";

  async function getVersionInfo() {
    try {
      const currentResult = await pi.exec("npm", ["list", "-g", packageName, "--json"]);
      const currentData = JSON.parse(currentResult.stdout);
      // Handle different npm list output structures
      const current = currentData.dependencies?.[packageName]?.version || 
                    currentData.problems?.[0]?.split('@')?.[1] || // If there's an issue it might be here
                    "unknown";

      const latestResult = await pi.exec("npm", ["view", packageName, "version"]);
      const latest = latestResult.stdout.trim();

      return { current, latest, needsUpdate: current !== latest && latest !== "" };
    } catch (e) {
      return { current: "unknown", latest: "unknown", needsUpdate: false, error: e.message };
    }
  }

  async function performUpdate(ctx: any) {
    ctx.ui.setStatus("pi-updater", `Updating ${packageName}...`);
    ctx.ui.notify(`Updating pi to the latest version...`, "info");

    const result = await pi.exec("npm", ["install", "-g", packageName]);

    if (result.code === 0) {
      ctx.ui.notify("pi updated successfully! Please restart or use /reload.", "success");
      ctx.ui.setStatus("pi-updater", "Update complete. Restart required.");
    } else {
      ctx.ui.notify(`Update failed: ${result.stderr}`, "error");
      ctx.ui.setStatus("pi-updater", "Update failed");
    }
  }

  // Check for updates on startup
  pi.on("session_start", async (_event, ctx) => {
    const info = await getVersionInfo();
    if (info.needsUpdate) {
      ctx.ui.notify(`A new version of pi is available: ${info.latest} (current: ${info.current}). Run /update to install.`, "info");
      ctx.ui.setStatus("pi-updater", `Update available: ${info.latest}`);
    }
  });

  // Register the /update command
  pi.registerCommand("update", {
    description: "Update pi to the latest version",
    handler: async (args, ctx) => {
      const info = await getVersionInfo();
      
      if (info.error) {
        ctx.ui.notify(`Error checking for updates: ${info.error}`, "error");
        return;
      }

      if (!info.needsUpdate && args !== "--force") {
        const confirm = await ctx.ui.confirm(
          "Already up to date", 
          `You are on version ${info.current}, which is the latest. Reinstall anyway?`
        );
        if (!confirm) return;
      } else {
        const confirm = await ctx.ui.confirm(
          "Confirm Update", 
          `Update from ${info.current} to ${info.latest}?`
        );
        if (!confirm) return;
      }

      await performUpdate(ctx);
    },
  });
}
