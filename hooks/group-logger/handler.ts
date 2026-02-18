import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const OPENCLAW_DIR = join(homedir(), ".openclaw");
const LOG_FILE = join(OPENCLAW_DIR, "group-messages.jsonl");
const DEBUG = true;

const TAG = "[openclaw-group-logger]";

// Ensure directory exists
if (!existsSync(OPENCLAW_DIR)) {
  mkdirSync(OPENCLAW_DIR, { recursive: true });
}

type PluginLogger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug?: (message: string) => void;
};

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

let _logger: PluginLogger = {
  info: (msg) => console.log(`${TAG} ${msg}`),
  warn: (msg) => console.warn(`${TAG} ${msg}`),
  error: (msg) => console.error(`${TAG} ${msg}`),
  debug: (msg) => console.log(`${TAG}[debug] ${msg}`),
};

export function setLogger(logger: PluginLogger): void {
  _logger = logger;
}

const asString = (value: unknown): string => (typeof value === "string" ? value : "");
const isWhatsAppLikeChannel = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return normalized.includes("whatsapp") || normalized === "web" || normalized === "web-inbound";
};

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
    _logger.info(`Hook fired — from=${event.from ?? "-"} channel=${ctx.channelId ?? "-"} contentLen=${asString(event.content).length}`);
    console.log(`Hook fired — from=${event.from ?? "-"} channel=${ctx.channelId ?? "-"} contentLen=${asString(event.content).length}`);


    const metadata = event.metadata ?? {};
    const groupIdCandidates = [
      asString(ctx.conversationId),
      asString(metadata.originatingTo),
      asString(metadata.to),
      asString(event.from),
    ];
    const groupId = groupIdCandidates.map(extractGroupJid).find(Boolean) ?? "";

    const channelCandidates = [
      asString(ctx.channelId),
      asString(metadata.originatingChannel),
      asString(metadata.surface),
      asString(metadata.provider),
    ];
    const isWhatsApp = groupId !== "" || channelCandidates.some(isWhatsAppLikeChannel);

    if (DEBUG) {
      const rawType = (event as { type?: unknown }).type;
      const rawEventContext = (event as { context?: unknown }).context;
      const eventContextKeys =
        rawEventContext && typeof rawEventContext === "object" && !Array.isArray(rawEventContext)
          ? Object.keys(rawEventContext as Record<string, unknown>)
          : [];
      const ctxKeys = Object.keys(ctx ?? {});
      const metadataKeys = Object.keys(metadata);

      _logger.debug?.(
        `event.type=${String(rawType ?? "-")} channel=${ctx.channelId} groupId=${groupId || "-"} contentLen=${asString(event.content).length}`
      );
      _logger.debug?.(
        `ctxKeys=${ctxKeys.join(",") || "-"} event.context.keys=${eventContextKeys.join(",") || "-"} metadataKeys=${metadataKeys.join(",") || "-"}`
      );
    }

    if (!isWhatsApp || !groupId) {
      _logger.info(`Skipped — not a WhatsApp group message (isWhatsApp=${isWhatsApp}, groupId=${groupId || "none"})`);
      return;
    }

    const message = asString(event.content).trim();
    if (!message) {
      _logger.info("Skipped — empty message content");
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
    _logger.info(`Logged message from ${entry.senderName} in group ${entry.groupId}`);
  } catch (error) {
    _logger.error(`Error logging message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[openclaw-group-logger] something went wrong: ${error instanceof Error ? error.message : String(error)}`);

  }
};

export default handler;
