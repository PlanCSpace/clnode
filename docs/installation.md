# clnode 설치 가이드

> Claude Code 멀티에이전트 협업을 위한 swarm intelligence 플러그인

## For LLM Agents

이 가이드는 Claude Code 에이전트가 따라할 수 있도록 작성되었습니다.

### 1. 설치

```bash
npx clnode init .
```

이 명령어 하나로:
- hooks 설정 (에이전트 간 컨텍스트 공유)
- agents 템플릿 복사 (node-backend, react-frontend, reviewer 등)
- skills 템플릿 복사 (compress-context, session-usage)
- rules 템플릿 복사 (team workflow 규칙)
- 데몬 자동 시작 (localhost:3100)
- 프로젝트 등록

### 2. 확인

설치가 성공하면 다음 메시지가 출력됩니다:
```
[clnode] Setup complete!
[clnode] Restart your Claude Code session to activate hooks.
```

### 3. Claude Code 세션 재시작

**중요:** hooks는 세션 시작 시에만 로드됩니다.
현재 세션을 종료(`/exit` 또는 ESC)하고 다시 `claude`를 실행하세요.

### 4. 동작 확인

재시작 후 프롬프트를 입력하면 시스템 메시지에 다음이 표시됩니다:
```
[clnode project context]
## Open Tasks
...
```

이 메시지가 보이면 clnode가 정상 작동 중입니다.

---

## 설치된 템플릿

### Agents (`.claude/agents/`)
| 에이전트 | 역할 |
|----------|------|
| node-backend | Hono 서버, DuckDB, 서비스 레이어 |
| react-frontend | React 19 + Vite + TailwindCSS |
| cli-hooks | CLI, hook.sh, 템플릿 |
| reviewer | 코드 리뷰 (전 도메인) |

### Skills (`.claude/skills/`)
| 스킬 | 용도 |
|------|------|
| compress-context | 긴 에이전트 컨텍스트 압축 |
| session-usage | 세션 토큰 사용량 분석 |

### Rules (`.claude/rules/`)
| 규칙 | 내용 |
|------|------|
| team.md | 팀 워크플로우, 리뷰 프로토콜 |

---

## 추가 명령어

```bash
# 상태 확인
npx clnode status

# Web UI 열기
npx clnode ui

# 로그 확인
npx clnode logs -f

# 데몬 중지
npx clnode stop
```

---

## 문제 해결

### hooks가 작동하지 않음
1. Claude Code 세션을 재시작했는지 확인
2. `npx clnode status`로 데몬 실행 확인
3. `.claude/settings.local.json`에 hooks 설정 있는지 확인

### DuckDB 에러
```bash
cd ~/.npm/_npx/.../node_modules/clnode
npm rebuild duckdb
```

### jq 없음 에러
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq
```
