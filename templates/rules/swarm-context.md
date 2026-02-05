# Swarm Context Rules

## Structured Context Entries

When working in swarm mode (clnode enabled), agents should record important context entries
via the clnode daemon API. This enables cross-agent communication through the shared DB.

### Entry Types

| Type | When to Use | Example |
|------|------------|---------|
| `decision` | Architecture/design choice made | "Chose JWT over sessions for auth" |
| `blocker` | Problem that blocks progress | "DuckDB WAL corruption on ALTER TABLE" |
| `handoff` | Work that another agent should pick up | "API ready, frontend needs to integrate /api/tasks" |

### How to Record

Use `curl` to POST context entries to the daemon:

```bash
curl -s -X POST http://localhost:3100/hooks/PostContext \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "$SESSION_ID",
    "agent_id": "$AGENT_ID",
    "entry_type": "decision",
    "content": "Using RETURNING clause instead of lastval() for DuckDB inserts",
    "tags": ["backend", "duckdb"]
  }'
```

### When to Record

- **decision**: After making a non-obvious technical choice. Don't record trivial decisions.
- **blocker**: When you encounter something that prevents completion. Include what you tried.
- **handoff**: When your work produces output that another agent needs. Describe what's ready and what's expected next.

### Guidelines

- Keep entries concise (1-2 sentences)
- Include relevant tags for discoverability
- Don't duplicate information that's already in the commit message
- `decision` and `blocker` entries persist across sessions via cross-session context
- **Language**: All files in `.claude/` and `templates/` directories must be written in English

---

## Review Loop Protocol

After a reviewer requests fixes and the implementer completes them, **always confirm with the user** before proceeding.

### Flow

```
1. Implementer done → Reviewer reviews
2. Reviewer finds issues → Implementer fixes
3. After fixes → Ask user: "Re-review needed?"
4a. User "yes" → Run reviewer again (back to step 2)
4b. User "no" or "stop" → Add needs_review tag, end current phase
```

### Leader's Responsibility

- After fixes complete, **do NOT auto-trigger next review**
- Always ask user: "Should I run re-review?"
- If user wants to stop, add `needs_review` tag to the task

### Example Conversation

```
Leader: "Reviewer found 3 issues, backend-dev fixed all of them.
        Should I run re-review?"

User: "yes"
→ Run reviewer again

User: "no" / "stop" / "later"
→ Add [needs_review] tag to task, end current phase
```

### Why This Protocol?

- Prevents infinite review loops (user can stop anytime)
- Ensures review quality (no skipping verification after fixes)
- Context management (prevents context explosion from unnecessary review cycles)
