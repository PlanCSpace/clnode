# Team Workflow Rules (Swarm Mode)

## Team Structure

```
Leader (Main Session / Opus)
├── node-backend (Sonnet) — Hono server, DuckDB, services, hook events
├── react-frontend (Sonnet) — Web UI pages, components, API client
├── cli-hooks (Sonnet) — CLI commands, hook.sh, templates, init
└── reviewer (Opus) — code review across all domains
```

## Development Flow

1. **Plan**: Leader explores codebase and creates plan
2. **Distribute**: Leader spawns domain agents with task assignments
3. **Implement**: Agents complete work and return reports
4. **Review**: Leader spawns reviewer to check agents' work
5. **Report**: Leader summarizes all results to user

## Parallel vs Sequential

### Parallelizable when:
- Tasks have no file-level dependencies
- Independent domain work (e.g., backend + frontend)

### Must be sequential when:
- One task depends on another's output
- Schema/API changes must come before consumers
- Review must happen after implementation

## Context Optimization

- **Agents**: report concisely — changed files list and key decisions only
- **Reviewer**: report by priority — critical / warning / suggestion
- **Leader**: summarize to user in 3-5 lines per agent, do NOT relay full agent output

## Cost Optimization

- Use Opus for Leader, reviewer, and architectural decisions
- Use Sonnet for implementation agents (node-backend, react-frontend, cli-hooks)
- Use Haiku for simple, mechanical tasks only

## Progress Reporting

- Report to user after each phase starts
- Report to user after each phase completes
- Include summary of completed work and next steps

## Review Loop Protocol

After fixes are made, **do NOT auto-trigger re-review** — always confirm with user.

```
Implement → Review → Fix → Ask user "Re-review?"
                              ├─ "yes" → Run reviewer again
                              └─ "no" → End (add needs_review tag)
```

### Rules

1. After fixes complete, Leader MUST ask user if re-review is needed
2. If user wants to stop, add `[needs_review]` tag to the task
3. Prevent infinite loops: only repeat when user explicitly says "continue"