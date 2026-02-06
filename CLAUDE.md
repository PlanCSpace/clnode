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

Using Claude Code's built-in features — **hooks**, **agents**, **skills**, and
**rules** — clnode builds a swarm mode layer on top of vanilla Claude Code:

- **hooks** intercept agent lifecycle events and route context through DuckDB
- **agents** define subagent roles (clnode-reviewer, clnode-curator, or custom via `/clnode-agents`)
- **skills** provide user-invoked commands and agent-preloaded behaviors (/compress-output, /compress-review)
- **rules** enforce project-wide conventions (auto-loaded every conversation)
- **DuckDB** acts as shared memory between agents (the communication channel)

When Agent B starts, the SubagentStart hook automatically injects Agent A's
results via `additionalContext` — no Leader relay needed. The Leader stays lean,
only making high-level decisions instead of carrying every intermediate result.

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
- **Test**: Vitest
- **Package Manager**: pnpm

## Directory Structure
```
src/
  cli/index.ts          — CLI entry point (clnode start/stop/init/status/ui/logs)
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
      task.ts           — Task state tracking (5-stage)
      comment.ts        — Task comments CRUD
      activity.ts       — Activity log (details JSON)
      intelligence.ts   — Smart context injection + todo enforcer
  web/                  — React SPA (Dashboard, Agents, Context, Tasks, Activity)
    components/Layout.tsx — embed mode (?embed=true): hides sidebar + transparent background
    lib/ProjectContext.tsx — URL ?project=<id> parameter for initial project selection
vscode-extension/       — VSCode Extension (standalone package)
  src/
    extension.ts        — activate: sidebar + status bar + command registration
    sidebar-view.ts     — WebviewViewProvider: custom HTML sidebar (stats + nav + project selector)
    webview/panel.ts    — WebviewPanel: iframe webview in editor area
    webview/html-provider.ts — iframe HTML generation (?embed=true&project=<id>)
    auto-init.ts        — workspace auto-init + project registration
    daemon.ts           — daemon health check + start/stop
    api-client.ts       — REST client
    status-bar.ts       — status bar item
templates/
  hooks-config.json     — Hooks config template
  agents/               — 2 agent role definitions (clnode-curator, clnode-reviewer)
  agent-memory/         — Seed MEMORY.md files for agents (clnode-curator, clnode-reviewer)
  skills/               — Skills (compress-output, compress-review, clnode-agents)
  rules/                — Swarm rules (team)
```

## DuckDB Schema (8 tables)
- **projects**: id, name, path (UNIQUE), created_at
- **sessions**: id, project_id, started_at, ended_at, status
- **agents**: id, session_id, agent_name, agent_type, parent_agent_id, status, started_at, completed_at, context_summary, input_tokens, output_tokens
- **context_entries**: id, session_id, agent_id, entry_type, content, tags[], created_at
- **file_changes**: id, session_id, agent_id, file_path, change_type, created_at
- **tasks**: id, project_id, title, description, status, assigned_to, tags[], created_at, updated_at
- **task_comments**: id, task_id, author, comment_type, content, created_at
- **activity_log**: id, session_id, agent_id, event_type, details JSON, created_at

## Hook Events
| Event | Purpose |
|-------|---------|
| SessionStart | Register session, link to project |
| SubagentStart | Register agent, return additionalContext (smart context injection) |
| SubagentStop | Finalize agent, extract context_summary from transcript |
| PostToolUse | Track file changes (Edit/Write) |
| UserPromptSubmit | Return project context (active agents, open tasks, decisions) |
| RegisterProject | Register project in DB (used by `clnode init`) |

## CLI Commands
```bash
clnode start            # Start daemon (background)
clnode stop             # Stop daemon
clnode status           # Show active sessions/agents
clnode init [path]      # Install hooks + agents/skills/rules + register project
clnode ui               # Open Web UI in browser
clnode logs [-n N] [-f] # View daemon logs
```

## Development Commands
```bash
pnpm dev          # Dev server with tsx
pnpm build        # TypeScript + Vite build
pnpm test         # Run tests
pnpm test:watch   # Watch mode
```

## Important Notes
- Use `now()` instead of `current_timestamp` in DuckDB
- DuckDB `COUNT(*)` returns BigInt → wrap with `Number()`
- DuckDB VARCHAR[] needs literal construction, not bind params
- hook.sh exits 0 even on failure (never blocks Claude Code)
- hook.sh has 3s curl timeout, requires `jq`
- Server port: env var CLNODE_PORT (default 3100)

## VSCode Extension

### Architecture
```
VSCode Extension (lightweight client)
├── Sidebar WebviewView — custom HTML (stats 2x2 grid + nav buttons + project selector)
├── Editor WebviewPanel — embeds Web UI via iframe (?embed=true&project=<id>)
├── Status Bar — "clnode: N agents" or "clnode: offline"
└── Auto-Init — installs hooks + registers project on workspace open
     ↓ HTTP/WS
clnode daemon (already running)
```

### Key Design Decisions
- **No embedded server**: Extension is a pure HTTP client connecting to the daemon
- **iframe embed**: Reuses Web UI as-is. `?embed=true` hides sidebar + transparent background
- **Custom sidebar HTML**: Theme-compatible via VSCode CSS variables (`var(--vscode-foreground)`, etc.)
- **Responsive sidebar**: CSS container query for automatic 1/2/4 column layout
- **Auto project selection**: Matches workspace path against DB projects.path
- **CJS output**: VSCode extensions must use CommonJS (`format: 'cjs'`)

### Extension Build & Deploy
```bash
cd vscode-extension
pnpm build                                              # esbuild → dist/extension.js (CJS)
pnpm package                                            # vsce package → .vsix
code --install-extension clnode-vscode-*.vsix --force   # VSCode: Cmd+Shift+P → "Developer: Reload Window"
```

### Important Notes (Extension)
- `npx clnode start` runs from npm cache → use `node dist/server/index.js` directly for local dev
- After Web UI changes: `pnpm build` (root) → restart daemon → rebuild extension → install → VSCode reload
- Beware `window.open()` name collision: use `openPage()` etc. in webview
- Extension list icon must be PNG (not SVG): convert with `rsvg-convert`
- `acquireVsCodeApi()` can only be called once per webview
- Use `vscode.getState()`/`vscode.setState()` in sidebar webview to persist selection state
- `container-type: inline-size` is required for `@container` queries to work
- `autoInitWorkspace` always calls `registerProject` regardless of hooks/agents presence

## Known Issues
- Hooks require Claude Code session restart after `clnode init`
- Agent killed by ESC or context limit → SubagentStop not fired → zombie in DB (use Kill button in UI)
- Transcript extraction needs 500ms delay (race condition with file write)
- VSCode Extension requires Reload Window after install (no hot reload)

## Agent Management

`clnode init` installs two default agents: **clnode-reviewer** (code review) and **clnode-curator** (knowledge curation).

To discover installed agents/skills/rules or create custom agents, use the `/clnode-agents` skill.
It provides interactive discovery (scan `.claude/` directory) and a scaffolding generator
that creates properly structured agent files with frontmatter, compress-output skill, and updates team.md.

## Swarm Best Practices
- **Agent sizing**: Keep to 5-7 files per agent to avoid context exhaustion
- **Don't agent trivial tasks**: 3-line changes should be done by Leader directly
- **Reviewer is worth it**: Always catches type safety, stale data, missing error handling
- **True parallelism**: Requires same-message Task calls (separate messages = sequential)
- **clnode's sweet spot**: Multi-step chains where Agent B needs Agent A's results
