# Team Workflow Rules (Swarm Mode)

## Team Hierarchy (3-Tier)

```
YUNWON_LEE (Tech Lead / Main Session)
├── SOOMIN_JEON (Backend Lead / Opus)
│   ├── CHANHYEOK_KANG (Backend Core / Sonnet) — model, repository, service
│   └── IKJIN_GO (Backend API / Sonnet) — controller, swagger, dto
├── TAEHWA_KANG (Frontend Lead / Opus)
│   ├── MINJEONG_SEOK (Frontend API / Sonnet) — api/openApi (types, fetches, hooks)
│   └── HEEJIN_LEE (Frontend Component / Sonnet) — pages, components
└── QA (sequential)
    ├── PILHO_JEONG (QA Test Writer / Sonnet)
    └── SEONGYONG_YE (Test Runner / Haiku)
```

## Development Flow

1. **Plan**: YUNWON_LEE explores codebase and creates plan
2. **Distribute**: YUNWON_LEE spawns SOOMIN_JEON and/or TAEHWA_KANG with task assignment
3. **Sub-team work**: Each Lead decides how many implementers to spawn, manages review cycle internally
   - Implementer completes work → SendMessage to Lead
   - Lead reviews → approves or requests fix
   - Review cycle repeats until approved
   - Lead shuts down implementers → returns final report to YUNWON_LEE
4. **QA**: YUNWON_LEE spawns PILHO_JEONG → SEONGYONG_YE (sequential)
5. **Cleanup**: YUNWON_LEE calls `Teammate` `cleanup`

## Swarm Tools

| Tool | Purpose |
|------|---------|
| `Task` (team_name="orbis", name=\<member\>) | Spawn sub-agent |
| `SendMessage` | Inter-agent messaging |
| `TaskCreate` / `TaskUpdate` / `TaskList` | Task tracking |
| `Teammate` (cleanup) | Clean up team resources (after all work is done) |

**Team Setup:**
- Team definition is persistent: `.claude/agents/`, `.claude/rules/`, `.claude/skills/` (reused across sessions)
- `~/.claude/teams/orbis/` is runtime state (message routing between live agents)
- At session start: call `Teammate` `spawnTeam` with `team_name="orbis"` to initialize runtime
- After `spawnTeam`, spawn agents with `team_name="orbis"` in the `Task` tool
- At session end: call `Teammate` `cleanup` to remove stale runtime state

## Who Spawns Whom

| Spawner | Spawns | Condition |
|---------|--------|-----------|
| YUNWON_LEE | SOOMIN_JEON, TAEHWA_KANG | Always (1 or both depending on task) |
| SOOMIN_JEON | CHANHYEOK_KANG, IKJIN_GO | Lead decides based on task scope (0~2) |
| TAEHWA_KANG | MINJEONG_SEOK, HEEJIN_LEE | Lead decides based on task scope (0~2) |
| YUNWON_LEE | PILHO_JEONG, SEONGYONG_YE | QA phase (sequential) |

## Communication Flow

```
YUNWON_LEE ←→ SOOMIN_JEON ←→ CHANHYEOK_KANG / IKJIN_GO
YUNWON_LEE ←→ TAEHWA_KANG ←→ MINJEONG_SEOK / HEEJIN_LEE
```

- Implementers communicate ONLY with their Lead (not with YUNWON_LEE directly)
- Leads communicate with YUNWON_LEE and their implementers
- YUNWON_LEE never communicates directly with implementers

## Parallel Processing (Leader Judgment)

### Parallelizable when:
- API spec already exists or can be trivially defined
- Backend and frontend have no dependencies on each other
- Independent domain work across sub-teams

### Must be sequential when:
- New API design is required (frontend needs backend spec)
- DB schema changes must come first
- Frontend depends on backend implementation output

### Leader discretion:
- YUNWON_LEE decides parallel vs sequential after exploration
- If independent: spawn SOOMIN_JEON + TAEHWA_KANG in parallel
- If dependent: spawn SOOMIN_JEON first → then TAEHWA_KANG
- Report reasoning to user

## Cost Optimization

- Leads decide implementer count — small tasks may need 0 implementers (Lead does it directly)
- Use Haiku for test execution only (SEONGYONG_YE)
- Use Sonnet for implementation and QA test writing
- Use Opus for Leads and architectural decisions

## Context Optimization

- **Implementers**: report to Lead concisely — changed files list and key decisions only
- **Leads**: report to YUNWON_LEE concisely — summary of all changes, review results, issues found
- **YUNWON_LEE**: summarize to user in 3-5 lines per sub-team, do NOT relay full agent output

## Execution Method

### Workflow
```
User ──→ YUNWON_LEE
              │
              ├── Explore codebase (Task tool with Explore subagent)
              ├── Create plan
              │
              ├── PARALLEL (if independent):
              │   ├── Task(team_name="orbis", name="soomin-jeon", model="opus", prompt="...")
              │   │   └── (SOOMIN_JEON internally spawns implementers, manages review cycle)
              │   └── Task(team_name="orbis", name="taehwa-kang", model="opus", prompt="...")
              │       └── (TAEHWA_KANG internally spawns implementers, manages review cycle)
              │
              ├── SEQUENTIAL: QA
              │   ├── Task(team_name="orbis", name="pilho-jeong", model="sonnet", prompt="...")
              │   └── Task(team_name="orbis", name="seongyong-ye", model="haiku", prompt="...")
              │
              ├── Report to user
              └── Teammate(cleanup)
```

### Progress Reporting (MANDATORY)
- Report to user after each phase starts
- Report to user after each phase completes
- Include summary of completed work and next steps

## E2E Testing (QA)

### Test Writing (PILHO_JEONG - Sonnet)
- Write E2E test code in `frontend/e2e/` directory
- Follow existing test patterns
- No comments in test code

### Test Execution (SEONGYONG_YE - Haiku)
- Run: `cd frontend && npm run test:e2e`
- Base URL: `https://orbis.oneflux.io` (Cloudflare tunnel)
- DO NOT start local servers (already running)
- Report test results back to YUNWON_LEE
