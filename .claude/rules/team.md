# Team Workflow Rules (Swarm Mode)

## Team Hierarchy (2-Tier)

```
YUNWON_LEE (Tech Lead / Main Session)
├── JIWON_PARK (Server Lead / Opus)
│   ├── DONGHYUN_KIM (Server Core / Sonnet) — db, services, routes
│   └── YUNA_CHOI (CLI & Hooks / Sonnet) — cli, hooks, templates
└── QA (sequential)
    └── MINJAE_OH (QA Tester / Sonnet)
```

## Development Flow

1. **Plan**: YUNWON_LEE explores codebase and creates plan
2. **Distribute**: YUNWON_LEE spawns JIWON_PARK with task assignment
3. **Sub-team work**: JIWON_PARK decides implementer spawning, manages review cycle internally
   - Implementer completes work → SendMessage to Lead
   - Lead reviews → approves or requests fix
   - Lead shuts down implementers → returns final report to YUNWON_LEE
4. **QA**: YUNWON_LEE spawns MINJAE_OH for testing
5. **Cleanup**: YUNWON_LEE calls `Teammate` `cleanup`

## Swarm Tools

| Tool | Purpose |
|------|---------|
| `Task` (team_name="clnode", name=\<member\>) | Spawn sub-agent |
| `SendMessage` | Inter-agent messaging |
| `TaskCreate` / `TaskUpdate` / `TaskList` | Task tracking |
| `Teammate` (cleanup) | Clean up team resources |

## Who Spawns Whom

| Spawner | Spawns | Condition |
|---------|--------|-----------|
| YUNWON_LEE | JIWON_PARK | Server-side work needed |
| JIWON_PARK | DONGHYUN_KIM, YUNA_CHOI | Lead decides based on task scope (0~2) |
| YUNWON_LEE | MINJAE_OH | QA phase |

## Communication Flow

```
YUNWON_LEE ←→ JIWON_PARK ←→ DONGHYUN_KIM / YUNA_CHOI
```

- Implementers communicate ONLY with their Lead (not with YUNWON_LEE directly)
- Lead communicates with YUNWON_LEE and their implementers
- YUNWON_LEE never communicates directly with implementers

## Cost Optimization

- Leads decide implementer count — small tasks may need 0 implementers (Lead does it directly)
- Use Sonnet for implementation and QA
- Use Opus for Lead and architectural decisions

## Context Optimization

- **Implementers**: report to Lead concisely — changed files list and key decisions only
- **Lead**: report to YUNWON_LEE concisely — summary of all changes, review results, issues found
- **YUNWON_LEE**: summarize to user in 3-5 lines

## Execution Method

### Workflow
```
User ──→ YUNWON_LEE
              │
              ├── Explore codebase (Task tool with Explore subagent)
              ├── Create plan
              │
              ├── Task(team_name="clnode", name="jiwon-park", model="opus", prompt="...")
              │   └── (JIWON_PARK internally spawns implementers, manages review cycle)
              │
              ├── SEQUENTIAL: QA
              │   └── Task(team_name="clnode", name="minjae-oh", model="sonnet", prompt="...")
              │
              ├── Report to user
              └── Teammate(cleanup)
```

### Progress Reporting (MANDATORY)
- Report to user after each phase starts
- Report to user after each phase completes
- Include summary of completed work and next steps