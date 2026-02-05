# clnode 설치 가이드

> Claude Code 멀티에이전트 협업을 위한 swarm intelligence 플러그인

## For LLM Agents

이 가이드의 지시사항을 순서대로 실행하세요.

### Step 1: 포트 확인

사용자에게 질문하세요: "clnode 데몬 포트를 지정하시겠습니까? (기본: 3100)"

- 사용자가 포트 번호를 입력하면 → 해당 포트 사용
- 사용자가 입력하지 않거나 "기본" 또는 "엔터"라고 하면 → 3100 사용

### Step 2: 설치 실행

포트가 기본값(3100)이면:
```bash
npx clnode init .
```

포트가 다른 값이면 (예: 3101):
```bash
npx clnode init . --port 3101
```

### Step 3: 설치 확인

다음 메시지가 출력되면 성공:
```
[clnode] Setup complete!
[clnode] Restart your Claude Code session to activate hooks.
```

### Step 4: 세션 재시작 안내

사용자에게 알려주세요:
"설치 완료! hooks를 활성화하려면 현재 세션을 종료하고 다시 시작하세요. `/exit` 또는 ESC로 종료 후 `claude`를 다시 실행하세요."

### Step 5: 재시작 후 확인

재시작 후 프롬프트를 입력하면 시스템 메시지에 다음이 표시됩니다:
```
[clnode project context]
...
```

이 메시지가 보이면 clnode가 정상 작동 중입니다.

---

## 설치된 템플릿

### 기본 설치 (모든 프로젝트용)

**Skills (`.claude/skills/`)**
| 스킬 | 용도 |
|------|------|
| compress-context | 긴 에이전트 컨텍스트 압축 |
| session-usage | 세션 토큰 사용량 분석 |

**Rules (`.claude/rules/`)**
| 규칙 | 내용 |
|------|------|
| clnode-usage.md | clnode 기능 사용법, 컨텍스트 압축 규칙 |

### --with-agents 옵션 (clnode 개발용)

**Agents (`.claude/agents/`)**
| 에이전트 | 역할 |
|----------|------|
| node-backend | Hono 서버, DuckDB, 서비스 레이어 |
| react-frontend | React 19 + Vite + TailwindCSS |
| cli-hooks | CLI, hook.sh, 템플릿 |
| reviewer | 코드 리뷰 (전 도메인) |

**추가 Rules**
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
