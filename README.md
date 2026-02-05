<p align="center">
  <img src="docs/screenshots/01-dashboard.png" alt="clnode Dashboard" width="800">
</p>

<h1 align="center">clnode</h1>

<p align="center">
  <strong>Claude Code Swarm Intelligence Plugin</strong><br>
  Turn one Claude Code session into a coordinated dev team
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#features">Features</a> •
  <a href="#web-ui">Web UI</a> •
  <a href="#cli">CLI</a>
</p>

<p align="center">
  <a href="./README.ko.md">한국어</a> •
  <a href="./docs/GUIDE.en.md">User Guide</a> •
  <a href="./docs/GUIDE.md">사용 가이드 (한국어)</a>
</p>

---

## Why clnode?

Claude Code's multi-agent mode has a fundamental limitation: **agents can't communicate with each other**. Every result must flow through the Leader agent, and after a few review cycles, the Leader's context explodes.

clnode solves this by using Claude Code's own hook system to create a shared memory layer:

```
Agent A finishes → summary saved to DB
Agent B starts   → receives A's summary automatically
Leader           → stays lean, only makes decisions
```

No wrapper. No custom framework. Just a plugin that fills the gap.

## Quick Start

```bash
# Install
git clone https://github.com/SierraDevsec/clnode.git
cd clnode && pnpm install && pnpm build

# Run
clnode start                    # Start daemon
clnode init /path/to/project    # Initialize your project
clnode ui                       # Open dashboard
```

**Restart your Claude Code session** after init — hooks activate on session start.

## How It Works

<p align="center">
  <img src="docs/screenshots/02-agents.png" alt="Agent Tree" width="800">
</p>

clnode intercepts Claude Code's agent lifecycle events via hooks:

1. **SubagentStart** → Inject previous agents' context via `additionalContext`
2. **SubagentStop** → Extract and save agent's work summary
3. **PostToolUse** → Track file changes (Edit/Write)
4. **UserPromptSubmit** → Auto-attach project context to prompts

Agents communicate **through time**, not through the Leader. Agent A leaves a summary in DuckDB. Agent B starts later and receives it automatically.

## Features

### Smart Context Injection

Not just recent context — **relevant** context:

| Type | Description |
|------|-------------|
| **Sibling Summaries** | Results from agents with the same parent |
| **Same-Type History** | What previous agents of the same role accomplished |
| **Cross-Session** | Summaries from previous sessions on the same project |
| **Tagged Context** | Entries explicitly tagged for specific agents |

### Todo Enforcer

Agents stopping with incomplete tasks get flagged — no silent failures.

### Prompt Auto-Attach

Every user prompt automatically receives:
- Active agents and their status
- Open tasks (prioritized by status)
- Recent decisions and blockers
- Completed agent summaries

## Web UI

Real-time dashboard at `http://localhost:3100`:

| Page | Description |
|------|-------------|
| **Dashboard** | Stats, charts, active sessions |
| **Agents** | Agent tree with parent-child hierarchy |
| **Context** | Full-text search across entries |
| **Tasks** | 5-stage kanban board |
| **Activity** | Live event log via WebSocket |

## CLI

```bash
clnode start              # Start daemon (port 3100)
clnode stop               # Stop daemon
clnode status             # Show active sessions/agents
clnode init [path]        # Install hooks
clnode init --with-skills # Also install agent templates
clnode ui                 # Open Web UI
clnode logs [-f]          # View/follow daemon logs
```

## Requirements

- **Node.js** ≥ 22
- **jq** — `brew install jq` / `apt install jq`
- **curl** — pre-installed on most systems

## Architecture

```
src/
├── cli/           CLI commands
├── hooks/         hook.sh (stdin→stdout)
├── server/
│   ├── routes/    hooks.ts, api.ts, ws.ts
│   └── services/  intelligence.ts, agent.ts, session.ts, ...
└── web/           React 19 + TailwindCSS 4

templates/
├── hooks-config.json
├── skills/        Agent role templates
└── rules/         Swarm context rules
```

**Tech Stack**: Node.js 22, TypeScript, Hono, DuckDB, React 19, Vite 7, TailwindCSS 4

## License

Source Available — free for non-commercial use. Commercial use requires a license. See [LICENSE](./LICENSE).

---

<p align="center">
  Built for developers who want their AI to work like a team, not a chatbot.
</p>
