# clnode — Claude Code Hook Monitoring Daemon

## Overview
A daemon service that collects, stores, and monitors Claude Code hook events.
Architecture: Hono server + DuckDB + WebSocket real-time broadcast.

## Tech Stack
- **Runtime**: Node.js v22, TypeScript, ESM (type: module)
- **Server**: Hono + @hono/node-server + @hono/node-ws
- **DB**: DuckDB (duckdb-async) — `data/clnode.duckdb`
- **CLI**: commander.js
- **Package Manager**: pnpm

## Directory Structure
```
src/
  cli/index.ts          — CLI entry point (clnode start/stop/init/status/ui)
  hooks/hook.sh         — curl-based universal hook script
  server/
    index.ts            — Hono server entry point (port 3100)
    db.ts               — DuckDB connection + schema initialization
    routes/
      hooks.ts          — POST /hooks/:event (7 event handlers)
      api.ts            — GET /api/* (REST API)
      ws.ts             — WebSocket broadcast utility
    services/
      session.ts        — Session CRUD
      agent.ts          — Agent lifecycle
      task.ts           — Task state tracking
      activity.ts       — Activity log
      context.ts        — Context storage/retrieval
      event.ts          — Raw event storage
      tooluse.ts        — Tool usage records
templates/
  hooks-config.json     — Hooks config template installed by `clnode init`
data/                   — DuckDB file storage (gitignored)
```

## DuckDB Schema (7 tables)
- **sessions**: session_id, project_path, started_at, ended_at, status
- **agents**: agent_id, session_id, parent_agent_id, agent_type, model, started_at, ended_at, status
- **tasks**: task_id, agent_id, session_id, description, status, created_at, updated_at
- **tool_uses**: id(seq), session_id, agent_id, tool_name, tool_input, tool_output, used_at
- **activities**: id(seq), session_id, agent_id, event_type, summary, created_at
- **contexts**: id(seq), session_id, agent_id, key, value, created_at
- **events**: id(seq), session_id, event_type, payload, received_at

## Hook Events (POST /hooks/:event)
SessionStart, SessionEnd, SubagentStart, SubagentStop, PostToolUse, Stop, UserPromptSubmit

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
clnode init [path] # Install hooks config to target project
clnode ui          # Open Web UI in browser
```

## API Endpoints
- `GET /` — Server info
- `GET /ws` — WebSocket real-time events
- `GET /api/health` — Health check
- `GET /api/sessions[?active=true]` — Session list
- `GET /api/sessions/:id` — Session detail
- `GET /api/sessions/:id/agents` — Agents by session
- `GET /api/sessions/:id/tasks` — Tasks by session
- `GET /api/sessions/:id/activities` — Activities by session
- `GET /api/sessions/:id/events` — Events by session
- `GET /api/sessions/:id/tools` — Tool uses by session
- `GET /api/agents[?active=true]` — Agent list
- `GET /api/activities[?limit=50]` — Recent activities
- `GET /api/events[?limit=100]` — Recent events
- `GET /api/tools[?limit=50]` — Recent tool uses

## Important Notes
- Use `now()` instead of `current_timestamp` in DuckDB DEFAULT and UPDATE clauses
- hook.sh never blocks Claude Code on failure (curl --max-time 2, || true)
- Server port: env var CLNODE_PORT (default 3100)

## Phase 1 Status: Complete
- [x] Project init (package.json, tsconfig, .gitignore)
- [x] DuckDB schema (7 tables)
- [x] Hono server + WebSocket
- [x] Hook event handlers (7 events)
- [x] REST API
- [x] Service layer (7 services)
- [x] hook.sh script
- [x] CLI (start/stop/status/init/ui)
- [x] Hook config template
- [x] Build verified
- [x] Server boot + curl test passed

## Next Steps (Phase 2 Candidates)
- Web UI (React/Solid) — src/web/
- Dashboard page
- Agent tree visualization
- Real-time WebSocket update UI
- Session timeline view
