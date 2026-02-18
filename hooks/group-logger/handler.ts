import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const OPENCLAW_DIR = join(homedir(), ".openclaw");
const LOG_FILE = join(OPENCLAW_DIR, "group-messages.jsonl");

// Ensure directory exists
if (!existsSync(OPENCLAW_DIR)) {
  mkdirSync(OPENCLAW_DIR, { recursive: true });
}

type MessageReceivedEvent = {
  from: string;
  content: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
};

type MessageContext = {
  channelId: string;
  accountId?: string;
  conversationId?: string;
};

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

const extractGroupJid = (value: string): string => {
  const match = value.match(/([0-9A-Za-z._-]+@g\.us)/);
  return match?.[1] ?? "";
};

const toIsoTimestamp = (timestamp?: number): string => {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return new Date().toISOString();
  }
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
  return new Date(ms).toISOString();
};

const handler = async (event: MessageReceivedEvent, ctx: MessageContext): Promise<void> => {
  try {
    // Only handle WhatsApp channel messages
    if (ctx.channelId !== "whatsapp") {
      return;
    }

    const metadata = event.metadata ?? {};
    const groupIdCandidates = [
      asString(ctx.conversationId),
      asString(metadata.originatingTo),
      asString(metadata.to),
      asString(event.from),
    ];
    const groupId = groupIdCandidates.map(extractGroupJid).find(Boolean) ?? "";
    if (!groupId) {
      return;
    }

    const message = asString(event.content).trim();
    if (!message) {
      return;
    }

    // Build log entry
    const entry = {
      timestamp: toIsoTimestamp(event.timestamp),
      groupId,
      groupName:
        asString(metadata.groupName) || asString(metadata.chatName) || asString(ctx.conversationId) || "Unknown Group",
      sessionKey: asString(metadata.sessionKey),
      senderId: asString(metadata.senderId) || asString(event.from) || "unknown",
      senderName:
        asString(metadata.senderName) || asString(metadata.senderUsername) || asString(metadata.pushName) || "Unknown",
      message,
      messageType: asString(metadata.messageType) || asString(metadata.type) || "text",
      channelId: ctx.channelId,
      accountId: ctx.accountId ?? "default",
    };

    // Append to JSONL file (synchronous operation to avoid concurrency issues)
    appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", { encoding: "utf-8" });
  } catch (error) {
    // Fail silently to avoid interfering with OpenClaw operation
    console.error("[openclaw-group-logger] Error logging message:", error);
  }
};

export default handler;
