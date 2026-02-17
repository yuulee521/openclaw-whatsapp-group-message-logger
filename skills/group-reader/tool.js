#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const LOG_FILE = join(homedir(), ".openclaw", "group-messages.jsonl");

// 解析命令行参数 (OpenClaw传递为 --key value 格式)
function parseArgs(args) {
  const params = {};
  for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith("--")) {
      const key = args[i].replace(/^--/, "");
      const value = args[i + 1];
      params[key] = value;
    }
  }
  return params;
}

try {
  const args = process.argv.slice(2);
  const params = parseArgs(args);

  // 检查文件是否存在
  if (!existsSync(LOG_FILE)) {
    console.log(
      JSON.stringify({
        messages: [],
        count: 0,
        info: "No messages logged yet. Make sure the group-logger hook is enabled and group messages have been sent.",
        logFile: LOG_FILE,
      }),
    );
    process.exit(0);
  }

  // 读取并解析JSONL
  const content = readFileSync(LOG_FILE, "utf-8");
  let messages = content
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((msg) => msg !== null);

  // 过滤器1: group_id
  if (params.group_id) {
    messages = messages.filter((m) => m.groupId === params.group_id);
  }

  // 过滤器2: since (ISO timestamp)
  if (params.since) {
    const sinceTime = new Date(params.since).getTime();
    if (!isNaN(sinceTime)) {
      messages = messages.filter((m) => {
        const msgTime = new Date(m.timestamp).getTime();
        return msgTime >= sinceTime;
      });
    }
  }

  // 过滤器3: hours (最近N小时，优先级低于since)
  if (params.hours && !params.since) {
    const hours = parseInt(params.hours);
    if (!isNaN(hours) && hours > 0) {
      const hoursAgo = Date.now() - hours * 3600 * 1000;
      messages = messages.filter((m) => {
        const msgTime = new Date(m.timestamp).getTime();
        return msgTime >= hoursAgo;
      });
    }
  }

  // 排序: 时间升序 (最早的在前)
  messages.sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  // 限制数量 (取最新的N条)
  const limit = parseInt(params.limit) || 100;
  if (messages.length > limit) {
    messages = messages.slice(-limit);
  }

  // 输出结果
  const result = {
    messages: messages,
    count: messages.length,
    filters: {
      group_id: params.group_id || "all",
      since: params.since || null,
      hours: params.hours || null,
      limit: limit,
    },
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(
    JSON.stringify({
      error: error.message,
      stack: error.stack,
    }),
  );
  process.exit(1);
}
