---
name: group-logger
description: "Automatically log all WhatsApp group messages to persistent storage"
meta:
  openclaw:
    emoji: "📝"
    events: ["message_received"]
requires:
  os: []
  bins: []
  env: []
  config: []
---

# WhatsApp Group Message Logger

Automatically captures and stores all incoming WhatsApp group messages to a JSONL file for later retrieval and analysis.

## Purpose

This hook solves the problem of accessing group messages without triggering AI responses. By storing messages passively, you can:

- Keep group chat history without consuming API credits
- Schedule daily/weekly summaries via cron
- Analyze group activity patterns
- Search historical conversations

## Storage

**Location**: `~/.openclaw/group-messages.jsonl`

**Format**: JSONL (JSON Lines) - one JSON object per line

**Example entry**:
```json
{
  "timestamp": "2026-02-17T15:30:00.000Z",
  "groupId": "120363123456789@g.us",
  "groupName": "Family Chat",
  "sessionKey": "agent:main:whatsapp:group:120363123456789@g.us",
  "senderId": "+31612345678",
  "senderName": "John Doe",
  "message": "Hello everyone!",
  "messageType": "text"
}
```

## Behavior

- **Passive**: Does not trigger AI responses
- **Automatic**: No configuration needed
- **Persistent**: Survives OpenClaw restarts
- **Efficient**: Minimal performance impact

## Configuration

Works with `requireMention: true` in WhatsApp group config to prevent unwanted AI replies:

```json
{
  "channels": {
    "whatsapp": {
      "groups": {
        "*": { "requireMention": true }
      }
    }
  }
}
```

## Usage

Once enabled, all group messages are automatically logged. Use the `group-reader` skill to retrieve and analyze them:

```
"Summarize today's discussion in the family group"
"Read messages from the work group in the last 48 hours"
```

Or check status with:
```
/grouplogs
```

## Privacy Note

Messages are stored locally on your system only. Consider rotating or cleaning the log file periodically if storage is a concern.
