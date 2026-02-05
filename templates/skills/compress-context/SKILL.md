---
name: compress-context
description: Compress long agent context summaries to prevent context explosion. Use before spawning multiple agents or when context_summary exceeds 500 characters.
version: 1.0.0
model: sonnet
---

# Context Compressor

Compress long agent context summaries in the database to prevent context explosion.

## When to Use

Run this skill before spawning multiple agents, especially after:
- Long review sessions with detailed reports
- Explore agents with extensive findings
- Plan agents with comprehensive plans

## Process

1. Query agents with context_summary > 500 characters
2. Spawn a Sonnet agent to summarize each (cost-effective + quality)
3. Update the database with compressed summaries

## Execution

**IMPORTANT**: Spawn a Sonnet agent to do the actual summarization work.
This keeps cost low while maintaining summary quality.

```
Use the Task tool with:
- subagent_type: "general-purpose"
- model: "sonnet"
- prompt: (include the agent data and compression instructions below)
```

## Agent Prompt Template

```
You are a context compressor. For each agent summary below, create a compressed
version (max 500 chars) that captures:
1. What was accomplished (1 sentence)
2. Key decisions or findings (1 sentence)
3. Any blockers or handoffs (if applicable)

After compression, update each agent via API:
curl -s -X PATCH "http://localhost:3100/api/agents/{ID}" \
  -H "Content-Type: application/json" \
  -d '{"context_summary": "COMPRESSED_SUMMARY"}'

Agent data to compress:
{PASTE_AGENT_DATA_HERE}
```

## Steps for Leader

1. Get agents with long summaries:

```bash
curl -s "http://localhost:3100/api/agents" | jq '[.[] | select(.context_summary) | select((.context_summary | length) > 500) | {id, agent_type, len: (.context_summary | length), summary: .context_summary}]'
```

2. If results exist, spawn Sonnet agent with the data and prompt template above

3. Sonnet agent will compress and update each summary via API

## Example

Before (14,562 chars):
```
Excellent. The build passes. Now let me compile my findings...
[... full review report ...]
```

After (180 chars):
```
Reviewed extractCount refactoring. Found 2 warnings (type precision, duplicate in test setup). All 135 tests pass. Ready for merge.
```

## Target

- Each summary: max 500 characters
- Focus on actionable information
- Preserve key decisions and blockers
- Use Sonnet model for cost-effective quality summarization
