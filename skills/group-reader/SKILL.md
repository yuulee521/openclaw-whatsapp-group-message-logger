---
name: group-reader
description: "Read and analyze stored WhatsApp group messages"
requires:
  bins: []
  env: []
meta
  openclaw:
    emoji: "📖"
    primaryTool: "read_group_messages"
---

# Group Message Reader

Retrieve and analyze WhatsApp group messages stored by the group-logger hook.

## When to Use

This skill is automatically invoked when:

- User asks to read, summarize, or analyze group messages
- User references past group conversations
- User wants statistics about group activity
- Cron jobs scheduled for periodic summaries

## Tools

### read_group_messages

Read messages from the persistent storage with flexible filtering.

**Parameters:**

- `group_id` (optional, string): Filter by specific group JID
  - Example: `"120363123456789@g.us"`
  - If omitted, returns messages from all groups

- `since` (optional, string): ISO 8601 timestamp
  - Only return messages after this time
  - Example: `"2026-02-17T00:00:00Z"`

- `hours` (optional, number): Hours to look back from now
  - Alternative to `since` parameter
  - Example: `24` for last 24 hours
  - If both `since` and `hours` are provided, `since` takes precedence

- `limit` (optional, number): Maximum messages to return
  - Default: 100
  - Useful for large group histories

**Returns:**

JSON object with:
```json
{
  "messages": [
    {
      "timestamp": "2026-02-17T15:30:00.000Z",
      "groupId": "120363xxx@g.us",
      "groupName": "Family Chat",
      "senderId": "+31612345678",
      "senderName": "John",
      "message": "Hello!",
      "messageType": "text"
    }
  ],
  "count": 42,
  "filters": {
    "hours": 24,
    "limit": 100
  }
}
```

**Example Invocations:**

User: "Summarize today's discussion in the family group"
→ Calls: `read_group_messages(group_id="120363xxx@g.us", hours=24)`

User: "What has been said in the work group over the past week?"
→ Calls: `read_group_messages(group_id="120363yyy@g.us", hours=168)`

User: "Latest messages from all groups"
→ Calls: `read_group_messages(limit=50)`

## Implementation

Reads from `~/.openclaw/group-messages.jsonl`, parses the JSONL format, applies filters, and returns matching messages sorted chronologically.

## Notes

- Messages are read from local storage, no API calls
- Empty result means no messages match the criteria
- Use `/grouplogs` command to check if messages are being logged
- Requires the `group-logger` hook to be enabled
