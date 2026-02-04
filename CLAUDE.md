# clnode — Claude Code Swarm Intelligence Plugin

## Why This Exists

Claude Code supports multi-agent mode (spawning subagents via the Task tool),
but **agents cannot communicate with each other**. Each agent runs in an
isolated context and has no awareness of what other agents are doing or have done.

This creates a critical problem: **the Leader agent's context explodes**.
When a reviewer finds issues and work needs to be re-assigned, everything
must flow through the Leader. Every round-trip of "review failed → tell Leader
→ Leader re-assigns → implementer fixes → send back" piles up context on the
Leader's window until it hits limits and loses track.

**clnode solves this by externalizing agent coordination state to a local DB.**

Using only two features that Claude Code already provides — **hooks** and
**skills** — clnode builds a swarm mode layer on top of vanilla Claude Code:

- **hooks** intercept agent lifecycle events and route context through DuckDB
- **skills** define agent roles, rules, and workflows
- **DuckDB** acts as shared memory between agents (the communication channel)

When Agent B starts, the SubagentStart hook automatically injects Agent A's
results via `additionalContext` — no Leader relay needed. The Leader stays lean,
only making high-level decisions instead of carrying every intermediate result.

**Goal: distribute as an npm plugin** — `clnode init` on any project to enable
swarm capabilities in Claude Code.

## Architecture

```
Claude Code Session (no native swarm support)
│
├── Agent A starts  ──→  hook ──→  clnode daemon ──→  DuckDB (store)
├── Agent A stops   ──→  hook ──→  clnode daemon ──→  DuckDB (save summary)
├── Agent B starts  ──→  hook ──→  clnode daemon ──→  DuckDB (read A's summary)
│                                       │
│                                       └──→ stdout: additionalContext
│                                             (A's results injected into B)
└── Leader only sees final reports — context stays minimal
```

## How It Works

1. `clnode start` — daemon starts on port 3100
2. `clnode init ./project` — installs hooks + skills into target project
3. Claude Code runs → hooks fire on every agent lifecycle event
4. hook.sh reads JSON from stdin, POSTs to daemon, returns response via stdout
5. DuckDB stores all state (agents, context, files, activities)
6. On SubagentStart: daemon reads previous context from DB → returns `additionalContext`
7. On SubagentStop: daemon saves agent's work summary to DB
8. Leader's context stays clean — DB handles the coordination

## Key Insight

**Agents don't talk to each other directly. They talk through time.**
Agent A finishes and leaves a summary in DB. Agent B starts later and
receives that summary automatically. The hook system is the message bus,
DuckDB is the mailbox.

## Tech Stack
- **Runtime**: Node.js v22, TypeScript, ESM (type: module)
- **Server**: Hono + @hono/node-server + @hono/node-ws
- **DB**: DuckDB (duckdb-async) — `data/clnode.duckdb`
- **CLI**: commander.js
- **Web UI**: React 19 + Vite 7 + TailwindCSS 4 + react-icons
- **Package Manager**: pnpm

## Hook Protocol (stdin → stdout)
```
Claude Code → stdin(JSON) → hook.sh → curl POST daemon → stdout(JSON) → Claude Code
```

stdin example:
```json
{
  "session_id": "abc123",
  "hook_event_name": "SubagentStart",
  "tool_input": { "subagent_type": "soomin-jeon", "prompt": "..." }
}
```

stdout example (SubagentStart response):
```json
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStart",
    "additionalContext": "Previous session summary: product API completed."
  }
}
```

## Directory Structure
```
src/
  cli/index.ts          — CLI entry point (clnode start/stop/init/status/ui)
  hooks/hook.sh         — stdin→stdout hook script (jq + curl)
  server/
    index.ts            — Hono server entry point (port 3100)
    db.ts               — DuckDB connection + schema initialization
    routes/
      hooks.ts          — POST /hooks/:event (7 event handlers + RegisterProject)
      api.ts            — GET/PATCH/DELETE /api/* (REST API)
      ws.ts             — WebSocket broadcast utility
    services/
      project.ts        — Project registration
      session.ts        — Session lifecycle
      agent.ts          — Agent lifecycle + context_summary
      context.ts        — Context entries (entry_type, content, tags[])
      filechange.ts     — File change tracking (Edit/Write)
      task.ts           — Task state tracking (5-stage: idea→planned→pending→in_progress→completed)
      comment.ts        — Task comments CRUD
      activity.ts       — Activity log (details JSON)
  web/
    App.tsx             — Router + ProjectProvider
    index.css           — Tailwind + custom styles
    index.html          — SPA entry point
    lib/
      api.ts            — API client (fetch with error handling)
      useWebSocket.ts   — WebSocket hook for live events
      ProjectContext.tsx — Global project selection context
    components/
      Layout.tsx        — Sidebar nav (react-icons + project selector)
      Card.tsx          — Reusable card wrapper
      Badge.tsx         — Status/type badge with dot indicator
      Chart.tsx         — Horizontal bar chart (no deps)
      AgentDetail.tsx   — Agent detail expansion (Summary/Context/Files tabs)
    pages/
      Dashboard.tsx     — Stats cards, bar charts, active sessions
      Agents.tsx        — Agent tree with expandable detail + kill button
      Context.tsx       — Session context entries with search
      Tasks.tsx         — 5-column kanban with drag-and-drop
      Activity.tsx      — Event log + file changes
templates/
  hooks-config.json     — Hooks config template (HOOK_SCRIPT_PATH placeholder)
data/                   — DuckDB file storage (gitignored)
```

## DuckDB Schema (8 tables)
- **projects**: id, name, path (UNIQUE), created_at
- **sessions**: id, project_id, started_at, ended_at, status
- **agents**: id, session_id, agent_name, agent_type, parent_agent_id, status, started_at, completed_at, context_summary
- **context_entries**: id(seq), session_id, agent_id, entry_type, content TEXT, tags VARCHAR[], created_at
- **file_changes**: id(seq), session_id, agent_id, file_path, change_type, created_at
- **tasks**: id(seq), project_id, title, description, status(idea/planned/pending/in_progress/completed), assigned_to, tags VARCHAR[], created_at, updated_at
- **task_comments**: id(seq), task_id, author, comment_type(plan/review/status_change/result/note), content, created_at
- **activity_log**: id(seq), session_id, agent_id, event_type, details JSON, created_at

## Hook Events (POST /hooks/:event)
| Event | Purpose | Response |
|-------|---------|----------|
| SessionStart | Register session, link to project | {} |
| SubagentStart | Register agent, auto-assign pending task, return additionalContext | { hookSpecificOutput: { additionalContext } } |
| SubagentStop | Finalize agent, store context_summary, auto-complete tasks | {} |
| PostToolUse | Track file changes (Edit/Write) | {} |
| Stop | Log stop event | {} |
| SessionEnd | End session, close all agents | {} |
| UserPromptSubmit | Log user prompt | {} |
| RegisterProject | Register project in DB (used by `clnode init`) | { ok, project_id } |

## Commands
```bash
pnpm dev          # Dev server with tsx
pnpm build        # TypeScript build
pnpm start        # Run built server
pnpm dev:cli      # CLI dev mode
```

## CLI Usage
```bash
clnode start       # Start daemon (background)
clnode stop        # Stop daemon
clnode status      # Show active sessions/agents
clnode init [path] # Install hooks + register project in DB
clnode ui          # Open Web UI in browser
```

## `clnode init` behavior
1. Set hook.sh as executable
2. Read templates/hooks-config.json, replace HOOK_SCRIPT_PATH with absolute path
3. Write hooks config to target project's `.claude/settings.local.json`
4. Register project in DB via POST /hooks/RegisterProject (if daemon running)

## API Endpoints
- `GET /` — Server info
- `GET /ws` — WebSocket real-time events
- `GET /api/health` — Health check
- `GET /api/projects` — All registered projects
- `GET /api/sessions[?active=true]` — Session list
- `GET /api/sessions/:id` — Session detail
- `GET /api/sessions/:id/agents` — Agents by session
- `GET /api/sessions/:id/context` — Context entries by session
- `DELETE /api/sessions/:id/context?entry_type=X` — Delete context by type
- `GET /api/sessions/:id/files` — File changes by session
- `GET /api/sessions/:id/activities` — Activities by session
- `GET /api/agents[?active=true]` — Agent list
- `GET /api/agents/:id` — Single agent
- `GET /api/agents/:id/context` — Context entries by agent
- `GET /api/agents/:id/files` — File changes by agent
- `PATCH /api/agents/:id` — Update agent (kill zombie: `{ status: "completed" }`)
- `DELETE /api/agents/:id` — Delete agent + related data
- `GET /api/tasks[?project_id=X]` — Task list
- `GET /api/tasks/:id` — Single task
- `POST /api/tasks` — Create task (status default: "idea")
- `PATCH /api/tasks/:id` — Update task (auto status_change comment)
- `DELETE /api/tasks/:id` — Delete task + comments
- `GET /api/tasks/:id/comments` — Task comments
- `POST /api/tasks/:id/comments` — Add comment
- `GET /api/activities[?limit=50]` — Recent activities
- `GET /api/stats` — Aggregate stats (sessions, agents, context, files)

## Important Notes
- Use `now()` instead of `current_timestamp` in DuckDB
- hook.sh exits 0 even on failure (never blocks Claude Code)
- hook.sh requires `jq` for JSON parsing
- Server port: env var CLNODE_PORT (default 3100)
- DuckDB VARCHAR[] params need special handling (literal construction, not bind params)

## Phase 1 Status: Complete
- [x] Project init (package.json, tsconfig, .gitignore)
- [x] DuckDB schema (7 tables matching spec)
- [x] Hono server + WebSocket
- [x] Hook event handlers (stdin→stdout protocol)
- [x] **additionalContext injection on SubagentStart**
- [x] **context_summary storage on SubagentStop**
- [x] **file_changes tracking on PostToolUse (Edit/Write)**
- [x] **Project registration via clnode init**
- [x] REST API
- [x] Service layer (7 services)
- [x] hook.sh (jq + curl, stdin→stdout)
- [x] CLI (start/stop/status/init/ui)
- [x] Hook config template with absolute path
- [x] Build verified
- [x] Full integration test passed

## Roadmap

## Phase 2 Status: Complete
- [x] React 19 + Vite 7 + TailwindCSS 4
- [x] Dashboard: stats cards, active sessions, recent activity, WebSocket LIVE
- [x] Agents: agent tree (parent-child), status filter, context summary
- [x] Context: session selector, full-text search (content/type/tags)
- [x] Tasks: 5-column kanban (idea/planned/pending/in_progress/completed)
- [x] Activity: event log + file changes tabs, event type filter, WebSocket live
- [x] Production static serving (Hono serves dist/web + SPA fallback)
- [x] **Supabase-style UI renewal** (zinc + emerald dark theme)
  - Card, Badge, Chart reusable components
  - react-icons sidebar navigation + project selector dropdown
  - Dashboard: 6 stat cards with icons + 2 bar charts (agent types, activity breakdown)
  - Agents: expandable detail view (Summary/Context/Files tabs) + Kill button for zombies
  - Tasks: HTML5 drag-and-drop kanban with visual drop targets
  - Global project filter (ProjectContext) connected to all pages
  - API error handling (res.ok check) + debounced WebSocket reload (500ms)
  - Agent detail API: GET /agents/:id, /agents/:id/context, /agents/:id/files
  - Agent kill API: PATCH /agents/:id { status: "completed" }

## Phase 3 Status: Complete
- [x] **Smart context injection** (`src/server/services/intelligence.ts`)
  - Sibling agent summaries (same parent, same session)
  - Same-type agent history (learn from predecessors)
  - Tagged context entries (agent name/type/all tags)
  - Fallback to recent session context
  - Assigned tasks for the starting agent
- [x] **Cross-session context** — queries previous sessions of the same project
- [x] **Todo Enforcer** — SubagentStop checks incomplete tasks, logs warning to context_entries
- [x] **UserPromptSubmit auto-attach** — returns project context (active agents, open tasks, decisions, completed summaries)

## Phase 4 Status: Complete
- [x] **npm package config** — files, keywords, license, prepublishOnly, bin
- [x] **Error handling** — hook.sh 3s timeout + jq check, hooks.ts error fallback for SubagentStart/UserPromptSubmit, server EADDRINUSE/DuckDB error messages
- [x] **README.md** — Quick Start, architecture, CLI commands, API reference
- [x] **Template skills** — 5 agent role templates (backend-dev, frontend-dev, reviewer, test-writer, architect)
- [x] **`clnode init --with-skills`** — copies skill templates to target project

## Dogfooding Status

clnode has been initialized on itself (`clnode init --with-skills` on this repo).

### What's Done
- [x] `clnode start` — daemon running on port 3100
- [x] `clnode init --with-skills` — hooks + 5 skill templates installed
- [x] Project registered as `clnode` in DuckDB
- [x] First dogfooding run: 3 parallel agents (backend-dev, reviewer, test-writer)
  - backend-dev added `GET /api/stats` endpoint
  - reviewer found intelligence.ts had no query error isolation → fixed with `safeQuery()`
  - test-writer confirmed 100% API client coverage
- [x] Hooks installed in `.claude/settings.local.json`

### Verified (Dogfooding Session 2 — 2026-02-05)
Full end-to-end hook pipeline verified in a live Claude Code session:

- [x] **SessionStart** — session registered in DB automatically
- [x] **SubagentStart** — agent registered, `additionalContext` injected with smart context
- [x] **PostToolUse** — tool calls (Read, Bash, Grep, etc.) logged to activity_log
- [x] **SubagentStop** — agent status set to `completed`, context_summary extracted from transcript
- [x] **UserPromptSubmit** — project context (active agents, completed summaries) auto-attached
- [x] **Context pipeline** — Agent A's summary saved on stop → Agent B receives it on start via `additionalContext`

### Bugs Fixed During Dogfooding
- **BigInt serialization crash** — DuckDB `COUNT(*)` returns BigInt, `JSON.stringify()` fails → fixed with `Number()` wrapper in all count functions
- **context_summary always null** — Claude Code SubagentStop doesn't send `context_summary` field; only sends `agent_transcript_path` → fixed by reading transcript JSONL and extracting last assistant text (with 500ms delay for file flush)

### Claude Code SubagentStop Payload (v2.1.31)
Claude Code does NOT send `context_summary` or `result` in SubagentStop. Actual fields:
- `session_id`, `cwd`, `permission_mode`, `hook_event_name`, `stop_hook_active`
- `agent_id` (short hash like "ae6f7df")
- `agent_transcript_path` (JSONL at `.claude/projects/.../subagents/agent-{id}.jsonl`)
- `agent_type`

### Known Issues
- Hooks require Claude Code session restart after `clnode init`
- Daemon crash during agent execution causes SubagentStop to be missed (hook.sh fails silently)
- Agent killed by ESC or context limit → SubagentStop not fired → zombie in DB (use Kill button in UI or `PATCH /api/agents/:id`)
- `intelligence.ts` queries wrapped in `safeQuery()` for partial success on failure
- Transcript extraction needs 500ms delay (race condition with file write)

### Swarm Efficiency Lessons (Dogfooding Session 3 — 2026-02-05)
- **Agent sizing matters**: one agent writing 14 files is too large → context exhaustion risk. Keep to 5-7 files per agent.
- **Don't agent trivial tasks**: 3-line changes should be done by the Leader directly.
- **Reviewer agent is always worth it**: catches type safety, stale data, missing error handling.
- **True parallelism requires same-message Task calls**: separate messages = sequential execution.
- **clnode's sweet spot**: multi-step chains where Agent B needs Agent A's results (context relay), not embarrassingly parallel work.

## Next Steps

### Remaining Work
- npm publish dry-run (`npm pack` to verify package contents)
- Consider adding `clnode logs` CLI command for daemon log tailing
- Skill rules for structured context entries (`decision`, `blocker`, `handoff` entry types)
- Server-side project filtering for sessions/agents API (currently client-side only)
- Dashboard: debounce could be configurable or use SSE instead of polling
