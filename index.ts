import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import messageReceivedHandler, { setLogger } from "./hooks/group-logger/handler.js";

const LOG_FILE = join(homedir(), ".openclaw", "group-messages.jsonl");

export default function register(api: OpenClawPluginApi) {
  // Wire the plugin logger into the handler so all logs go through OpenClaw's logging system
  setLogger(api.logger);

  api.on("message_received", messageReceivedHandler);

  api.logger.info("[openclaw-group-logger] Plugin loaded successfully");
  api.logger.info("[openclaw-group-logger] Hook registered: message_received");
  api.logger.info("[openclaw-group-logger] Skill registered: group-reader");
  api.logger.info(`[openclaw-group-logger] Log file: ${LOG_FILE}`);

  // Register /grouplogs command - view storage status
  api.registerCommand({
    name: "grouplogs",
    description: "Show WhatsApp group message log statistics",
    handler: async () => {
      try {
        if (!existsSync(LOG_FILE)) {
          return {
            text: "📝 No group messages logged yet.\n\nMessages will be automatically stored when they arrive in WhatsApp groups.",
          };
        }

        const stats = statSync(LOG_FILE);
        const content = readFileSync(LOG_FILE, "utf-8");
        const lines = content.split("\n").filter(Boolean);
        const messageCount = lines.length;

        // Count number of groups
        const groups = new Set();
        lines.forEach((line) => {
          try {
            const msg = JSON.parse(line);
            if (msg.groupId) groups.add(msg.groupId);
          } catch { }
        });

        // Latest message time
        let latestTime = "N/A";
        if (lines.length > 0) {
          try {
            const lastMsg = JSON.parse(lines[lines.length - 1]);
            latestTime = new Date(lastMsg.timestamp).toLocaleString("nl-NL", {
              timeZone: "Europe/Amsterdam",
            });
          } catch { }
        }

        return {
          text:
            "📊 Group Message Logger Statistics\n\n" +
            `💬 Total messages: ${messageCount}\n` +
            `👥 Unique groups: ${groups.size}\n` +
            `💾 File size: ${(stats.size / 1024).toFixed(2)} KB\n` +
            `🕒 Latest message: ${latestTime}\n` +
            `📂 Location: ${LOG_FILE}`,
        };
      } catch (error) {
        return {
          text: `❌ Error reading log file: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });
}
