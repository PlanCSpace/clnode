# clnode — Claude Code Hook Monitoring Daemon

## 프로젝트 개요
Claude Code의 hook 이벤트를 수집·저장·모니터링하는 데몬 서비스.
Hono 서버 + DuckDB + WebSocket 실시간 브로드캐스트 구조.

## 기술 스택
- **Runtime**: Node.js v22, TypeScript, ESM (type: module)
- **Server**: Hono + @hono/node-server + @hono/node-ws
- **DB**: DuckDB (duckdb-async) — `data/clnode.duckdb`
- **CLI**: commander.js
- **Package Manager**: pnpm

## 디렉토리 구조
```
src/
  cli/index.ts          — CLI 진입점 (clnode start/stop/init/status/ui)
  hooks/hook.sh         — curl 기반 범용 hook 스크립트
  server/
    index.ts            — Hono 서버 진입점 (port 3100)
    db.ts               — DuckDB 연결 + 스키마 초기화
    routes/
      hooks.ts          — POST /hooks/:event (7개 이벤트 핸들러)
      api.ts            — GET /api/* (REST API)
      ws.ts             — WebSocket 브로드캐스트 유틸
    services/
      session.ts        — 세션 CRUD
      agent.ts          — 에이전트 생명주기
      task.ts           — 태스크 상태
      activity.ts       — 활동 로그
      context.ts        — 컨텍스트 저장/검색
      event.ts          — 원시 이벤트 저장
      tooluse.ts        — 도구 사용 기록
templates/
  hooks-config.json     — clnode init이 설치할 hooks 설정 템플릿
data/                   — DuckDB 파일 저장 디렉토리 (gitignore)
```

## DuckDB 스키마 (7개 테이블)
- **sessions**: session_id, project_path, started_at, ended_at, status
- **agents**: agent_id, session_id, parent_agent_id, agent_type, model, started_at, ended_at, status
- **tasks**: task_id, agent_id, session_id, description, status, created_at, updated_at
- **tool_uses**: id(seq), session_id, agent_id, tool_name, tool_input, tool_output, used_at
- **activities**: id(seq), session_id, agent_id, event_type, summary, created_at
- **contexts**: id(seq), session_id, agent_id, key, value, created_at
- **events**: id(seq), session_id, event_type, payload, received_at

## Hook 이벤트 (POST /hooks/:event)
SessionStart, SessionEnd, SubagentStart, SubagentStop, PostToolUse, Stop, UserPromptSubmit

## 주요 명령어
```bash
pnpm dev          # tsx로 개발 서버 실행
pnpm build        # TypeScript 빌드
pnpm start        # 빌드된 서버 실행
pnpm dev:cli      # CLI 개발 모드
```

## CLI 사용법
```bash
clnode start      # 데몬 시작 (백그라운드)
clnode stop       # 데몬 중지
clnode status     # 활성 세션/에이전트 표시
clnode init [path]# 대상 프로젝트에 hooks 설정 설치
clnode ui         # 브라우저에서 Web UI 열기
```

## API 엔드포인트
- `GET /` — 서버 정보
- `GET /ws` — WebSocket 실시간 이벤트
- `GET /api/health` — 헬스체크
- `GET /api/sessions[?active=true]` — 세션 목록
- `GET /api/sessions/:id` — 세션 상세
- `GET /api/sessions/:id/agents` — 세션별 에이전트
- `GET /api/sessions/:id/tasks` — 세션별 태스크
- `GET /api/sessions/:id/activities` — 세션별 활동
- `GET /api/sessions/:id/events` — 세션별 이벤트
- `GET /api/sessions/:id/tools` — 세션별 도구 사용
- `GET /api/agents[?active=true]` — 에이전트 목록
- `GET /api/activities[?limit=50]` — 최근 활동
- `GET /api/events[?limit=100]` — 최근 이벤트
- `GET /api/tools[?limit=50]` — 최근 도구 사용

## 주의사항
- DuckDB에서 DEFAULT나 UPDATE에 `current_timestamp` 대신 `now()` 사용
- hook.sh는 실패해도 Claude Code를 블로킹하지 않음 (curl --max-time 2, || true)
- 서버 포트: 환경변수 CLNODE_PORT (기본 3100)

## Phase 1 상태: ✅ 완료
- [x] 프로젝트 초기화 (package.json, tsconfig, .gitignore)
- [x] DuckDB 스키마 7개 테이블
- [x] Hono 서버 + WebSocket
- [x] Hook 이벤트 핸들러 (7개 이벤트)
- [x] REST API
- [x] 서비스 레이어 (7개 서비스)
- [x] hook.sh 스크립트
- [x] CLI (start/stop/status/init/ui)
- [x] Hook 설정 템플릿
- [x] 빌드 성공 확인
- [x] 서버 기동 + curl 테스트 통과

## 다음 단계 (Phase 2 후보)
- Web UI (React/SolidJS) — src/web/
- 대시보드 페이지
- 에이전트 트리 시각화
- 실시간 WebSocket 업데이트 UI
- 세션 타임라인 뷰
