# OpenClaw Group Message Logger

> Store and analyze WhatsApp group messages without triggering AI responses

[![npm version](https://img.shields.io/npm/v/@yuulee521/openclaw-group-logger.svg)](https://www.npmjs.com/package/@yuulee521/openclaw-group-logger)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Problem

OpenClaw's default behavior triggers AI responses for every group message, which:
- Consumes API credits unnecessarily
- Creates noise in group chats
- Makes it hard to passively monitor conversations

## Solution

This plugin provides:
- **🔇 Silent logging**: Store messages without AI replies
- **📊 On-demand analysis**: Summarize when you need it
- **⏰ Scheduled summaries**: Use cron for daily/weekly digests
- **💾 Persistent storage**: Survives restarts

## Installation

```bash
openclaw plugins install @yuulee521/openclaw-group-logger
openclaw gateway restart
```

## Configuration

Set WhatsApp groups to require mentions (prevents auto-replies):

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

### Check Status

```
/grouplogs
```

Output:
```
📊 Group Message Logger Statistics

💬 Total messages: 1,247
👥 Unique groups: 3
💾 File size: 156.32 KB
🕒 Latest message: 17-2-2026 15:30
📂 Location: ~/.openclaw/group-messages.jsonl
```

### Query Messages

**Natural language examples:**

```
"Summarize today's discussion in the family group"
"What has been said in the work group over the past week?"
"Latest messages from all groups"
```

### Automated Summaries

**Daily summary at 10 PM:**

```bash
openclaw cron add \
  --name "Daily family group summary" \
  --cron "0 22 * * *" \
  --tz "Europe/Amsterdam" \
  --session isolated \
  --message "Use group-reader tool to read messages from group 120363xxx@g.us for the last 24 hours and summarize the key points, then send them to me" \
  --channel whatsapp \
  --to "+31627393856"
```

**Weekly work group digest:**

```bash
openclaw cron add \
  --name "Weekly work summary" \
  --cron "0 18 * * 5" \
  --tz "Europe/Amsterdam" \
  --session isolated \
  --message "Summarize important discussions in the work group (120363yyy@g.us) this week, including decisions, task assignments, and to-do items" \
  --channel whatsapp \
  --to "+31627393856"
```

## How It Works

1. **Hook captures messages**: `group-logger` hook listens for `message_received` events
2. **Stores to JSONL**: Appends to `~/.openclaw/group-messages.jsonl`
3. **Skill reads on demand**: `group-reader` skill queries the storage
4. **AI analyzes**: OpenClaw summarizes only when asked

## Storage Format

**Location**: `~/.openclaw/group-messages.jsonl`

**Format**: JSONL (one JSON per line)

**Example**:
```json
{"timestamp":"2026-02-17T15:30:00.000Z","groupId":"120363xxx@g.us","groupName":"Family","senderId":"+31612345678","senderName":"John","message":"Hello!","messageType":"text"}
```

## Maintenance

**View log file:**
```bash
tail -f ~/.openclaw/group-messages.jsonl
```

**Rotate logs** (keep last 1000 lines):
```bash
tail -1000 ~/.openclaw/group-messages.jsonl > ~/.openclaw/group-messages.tmp && \
mv ~/.openclaw/group-messages.tmp ~/.openclaw/group-messages.jsonl
```

**Clear all logs:**
```bash
rm ~/.openclaw/group-messages.jsonl
```

## Troubleshooting

### No messages being logged

1. Check hook is enabled:
   ```bash
   openclaw hooks list | grep group-logger
   ```
   Should show: `✓ plugin:openclaw-group-logger/group-logger`

2. Check plugin is loaded:
   ```bash
   openclaw plugins list | grep openclaw-group-logger
   ```

3. Verify group config allows messages (not `groupPolicy: "disabled"`)

### Skill not found

1. Restart gateway after installation:
   ```bash
   openclaw gateway restart
   ```

2. Check skill is registered:
   ```bash
   openclaw skills list | grep group-reader
   ```

### Can't find group ID

Run with verbose logging and send a message in the group:
```bash
openclaw gateway --verbose
```

Look for: `inbound web message from: 120363xxx@g.us`

## Privacy & Security

- **Local only**: Messages stored on your machine
- **No network calls**: Hook doesn't send data anywhere
- **Plain text**: Consider disk encryption for sensitive groups
- **Access control**: Log file permissions default to user-only

## Contributing

Issues and PRs welcome at: https://github.com/yuulee521/openclaw-whatsapp-group-message-logger

## License

MIT © yuulee521
