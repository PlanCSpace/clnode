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

## Task Workflow

태스크는 6단계 칸반으로 관리됩니다:

```
Idea → Planned → Pending → In Progress → Needs Review → Completed
```

### 상태 전환 규칙

| 현재 상태 | 다음 상태 | 트리거 |
|-----------|-----------|--------|
| Idea | Planned | 플랜 코멘트 추가 시 |
| Planned | In Progress | "이거 진행해줘" + assigned_to 설정 |
| In Progress | Needs Review | 구현 완료 후 |
| Needs Review | Completed | 리뷰 PASS 시 |
| Needs Review | In Progress | 리뷰에서 수정사항 발견 시 |

### 리뷰 수정사항 처리 (필수)

리뷰에서 **Warning** 또는 **Critical** 이 나오면:
1. 태스크를 **In Progress**로 되돌림
2. 수정사항 **반드시** 처리
3. 다시 **Needs Review**로 이동
4. 재리뷰 진행

**Suggestion**은 선택적이지만, 처리 권장.

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
4. **리뷰 Warning/Critical은 반드시 수정** — Suggestion만 선택적