/**
 * Date Context Extension
 *
 * Replaces pi's built-in "Current date: YYYY-MM-DD" with a richer
 * version that includes day-of-week and local time. Also detects
 * day rollovers mid-session and proactively pushes a message so the
 * model doesn't carry stale date assumptions from earlier context.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function formatDate(now: Date): { dateStr: string; timeStr: string; tz: string; key: string } {
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const key = now.toISOString().slice(0, 10); // YYYY-MM-DD

  return { dateStr, timeStr, tz, key };
}

export default function (pi: ExtensionAPI) {
  let lastDateKey: string | undefined;

  // Seed the tracker so the first prompt doesn't false-positive a day change.
  pi.on("session_start", async () => {
    lastDateKey = new Date().toISOString().slice(0, 10);
  });

  pi.on("session_switch", async () => {
    lastDateKey = new Date().toISOString().slice(0, 10);
  });

  pi.on("before_agent_start", async (event) => {
    const now = new Date();
    const { dateStr, timeStr, tz, key } = formatDate(now);

    const dayChanged = lastDateKey !== undefined && lastDateKey !== key;
    lastDateKey = key;

    // Replace pi's built-in "Current date: YYYY-MM-DD" with a richer line.
    const enhanced = `Current date: ${dateStr} (${key})\nCurrent time: ${timeStr} (${tz})`;
    const systemPrompt = event.systemPrompt.replace(
      /Current date: \d{4}-\d{2}-\d{2}/,
      enhanced,
    );

    const result: {
      systemPrompt: string;
      message?: { customType: string; content: string; display: boolean };
    } = { systemPrompt };

    // If the calendar day rolled over mid-session, inject an explicit
    // message so the model doesn't carry stale date context.
    if (dayChanged) {
      result.message = {
        customType: "date-context",
        content: `📅 A new day has started. Today is now ${dateStr}. Current time: ${timeStr} (${tz}).`,
        display: true,
      };
    }

    return result;
  });
}
