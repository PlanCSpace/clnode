---
name: session-usage
description: Analyze session token usage and agent breakdown. Use /usage for Max plan quota, use this for session-level details.
version: 1.0.0
model: haiku
---

# Usage Analytics

Analyze token usage from Claude Code transcript files.

## When to Use

- Check how many tokens the current session has used
- Compare token usage across agents
- Monitor context consumption before it gets too large

## Process

1. Find transcript files in `.claude/projects/`
2. Parse JSONL to extract message content
3. Estimate tokens (chars / 4)
4. Display summary by session and agent

## Steps

### 1. Find Session Transcript

First, identify the current project's session file:

```bash
# List recent transcripts for this project (replace PROJECT_PATH)
find ~/.claude/projects/-Users-*-YOUR-PROJECT -name "*.jsonl" -mtime -1 -type f 2>/dev/null | grep -v subagents
```

### 2. Run Usage Report

Replace `SESSION_ID` with your session ID (the UUID from the file path):

```bash
PROJECT_DIR="$HOME/.claude/projects/-Users-deejay-Development-swarm-clnode"
SESSION_ID="12b74425-cbaa-44b7-bf99-c20681fed5f2"  # Replace with your session

SESSION_FILE="$PROJECT_DIR/$SESSION_ID.jsonl"
SUBAGENT_DIR="$PROJECT_DIR/$SESSION_ID/subagents"

echo "=== Session Usage Report ==="
echo ""
printf "%-40s %8s %8s\n" "Component" "Tokens" "% of sess"
echo "─────────────────────────────────────────────────────────"

# First pass: calculate total
MAIN_CHARS=$(jq -r 'select(.type=="assistant" or .type=="user") | .message.content[]? | select(.type=="text") | .text' "$SESSION_FILE" 2>/dev/null | wc -c)
MAIN_TOKENS=$((MAIN_CHARS / 4))
TOTAL=$MAIN_TOKENS

if [ -d "$SUBAGENT_DIR" ]; then
  for f in "$SUBAGENT_DIR"/*.jsonl; do
    [ -f "$f" ] || continue
    CHARS=$(jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="text") | .text' "$f" 2>/dev/null | wc -c)
    TOTAL=$((TOTAL + CHARS / 4))
  done
fi

# Second pass: print with percentages
PCT=$(echo "scale=1; $MAIN_TOKENS * 100 / $TOTAL" | bc)
printf "%-40s %8d %5.1f%%\n" "Main Session" "$MAIN_TOKENS" "$PCT"

if [ -d "$SUBAGENT_DIR" ]; then
  for f in "$SUBAGENT_DIR"/*.jsonl; do
    [ -f "$f" ] || continue
    CHARS=$(jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="text") | .text' "$f" 2>/dev/null | wc -c)
    TOKENS=$((CHARS / 4))
    PCT=$(echo "scale=1; $TOKENS * 100 / $TOTAL" | bc)
    printf "  %-38s %8d %5.1f%%\n" "$(basename $f .jsonl)" "$TOKENS" "$PCT"
  done
fi

echo "─────────────────────────────────────────────────────────"
printf "%-40s %8d %5.1f%%\n" "SESSION TOTAL" "$TOTAL" "100.0"
echo ""
echo "Tip: Run /usage in Claude Code for Max plan % remaining"

# Daily activity from stats-cache.json
STATS_FILE="$HOME/.claude/stats-cache.json"
if [ -f "$STATS_FILE" ]; then
  echo ""
  echo "=== Daily Activity (Last 7 Days) ==="
  echo ""
  printf "%-12s %10s %10s %12s\n" "Date" "Messages" "Sessions" "Tool Calls"
  echo "────────────────────────────────────────────────"
  jq -r '.dailyActivity | sort_by(.date) | reverse | .[0:7] | .[] | "\(.date) \(.messageCount) \(.sessionCount) \(.toolCallCount)"' "$STATS_FILE" 2>/dev/null | while read date msgs sess tools; do
    printf "%-12s %10s %10s %12s\n" "$date" "$msgs" "$sess" "$tools"
  done
  echo ""

  # Weekly total
  WEEK_MSGS=$(jq '[.dailyActivity | sort_by(.date) | reverse | .[0:7] | .[].messageCount] | add' "$STATS_FILE" 2>/dev/null)
  WEEK_TOOLS=$(jq '[.dailyActivity | sort_by(.date) | reverse | .[0:7] | .[].toolCallCount] | add' "$STATS_FILE" 2>/dev/null)
  echo "Week total: $WEEK_MSGS messages, $WEEK_TOOLS tool calls"
fi
```

## Output Example

```
=== Session Usage Report ===

Component                                  Tokens  % of sess
─────────────────────────────────────────────────────────────
Main Session                                8801     53.9%
  agent-a129217 (reviewer)                  1653     10.1%
  agent-acompact-0cbc39                     1941     11.9%
  agent-acompact-88f12c                     1540      9.4%
  agent-ad71472                             1013      6.2%
─────────────────────────────────────────────────────────────
SESSION TOTAL                              16341    100.0%

Tip: Run /usage in Claude Code for Max plan % remaining
```

**Note**: "% of sess" = percentage of THIS session's total, NOT your Max plan usage.

```
=== Daily Activity (Last 7 Days) ===

Date           Messages   Sessions   Tool Calls
────────────────────────────────────────────────
2026-02-05          281          6           22
2026-02-04         2086          4          316
2026-02-03         2933          6          418
...

Week total: 12600 messages, 1733 tool calls
```

## For Max Plan Users

This skill shows **relative usage within a session** (which agents consume the most).
For your **monthly plan percentage**, run Claude Code's built-in `/usage` command.

Use this skill to:
- Identify token-heavy agents (optimize or split them)
- Compare before/after running `/compress-context`
- Decide when to start a new session

## Notes

- Token estimation uses chars/4 (rough approximation)
- Shows session-relative percentages, not plan percentages
- For actual Max plan % remaining, use `/usage` command
