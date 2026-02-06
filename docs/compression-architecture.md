# 에이전트 출력 압축 아키텍처

> clnode의 컨텍스트 폭발 방지 시스템. 에이전트 출력과 컨텍스트 주입, 두 지점에서 압축이 작동한다.

---

## 개요

Claude Code 멀티에이전트에서 Leader의 컨텍스트가 폭발하는 근본 원인은 **에이전트가 반환하는 결과물의 크기**다. 리뷰어가 100줄짜리 리뷰를 반환하고, 백엔드 에이전트가 50줄짜리 작업 보고서를 반환하면, 에이전트 3~4개만 돌려도 Leader의 컨텍스트가 수백 줄씩 쌓인다.

clnode는 두 지점에서 이를 제어한다:

| 압축 지점 | 시점 | 메커니즘 | 제한 |
|-----------|------|----------|------|
| **출력 압축** | SubagentStop (에이전트 종료) | compress-output 스킬 + force-compress.sh 훅 | 10줄 (일반) / 20줄 (리뷰어) |
| **컨텍스트 주입** | SubagentStart (에이전트 시작) | buildSmartContext() — 역할 기반 선별 주입 | 관련 컨텍스트만 선별 |

두 압축은 직렬로 연결된다:

```
에이전트 출력 (10줄 [COMPRESSED])
  → DB 저장 (agents.context_summary)
    → 다음 에이전트 시작 시 buildSmartContext()로 선별 주입
```

---

## 1. 출력 압축: 2겹 구조

에이전트가 Leader에게 반환하는 결과물을 압축한다. **스킬(사전 안내) + 훅(사후 검증)** 2겹으로 구성된다.

### 1겹: compress-output 스킬 (사전 안내)

에이전트 frontmatter에 `skills: [compress-output]`을 선언하면, 에이전트 시작 시 SKILL.md가 시스템 프롬프트에 자동 주입된다. 에이전트는 작업 시작 전에 이미 "결과를 `[COMPRESSED]` 형식으로 반환해야 한다"는 것을 인지한다.

```
에이전트 시작
↓
compress-output SKILL.md가 시스템 프롬프트에 주입
↓
[COMPRESSED] 형식 인지
↓
작업 수행
↓
자발적으로 [COMPRESSED] 형식으로 출력
```

**일반 에이전트** (node-backend, react-frontend, cli-hooks):

```
skills:
  - compress-output     ← 10줄 제한
```

출력 형식:

```
[COMPRESSED] agent_type: <type>
Changed files: file1.ts, file2.ts
Result: (1-3줄 요약)
Decisions: (있으면)
Blockers: (있으면)
```

**리뷰어 에이전트** — 전용 스킬 사용:

```
skills:
  - compress-review     ← 20줄 제한
```

출력 형식:

```
[COMPRESSED] agent_type: reviewer
Files reviewed: file1.ts, file2.ts
Critical: (file:line — 설명)
Warning: (file:line — 설명)
Suggestion: (file:line — 설명)
Verdict: PASS | FAIL (critical/warning 개수)
```

리뷰어를 분리한 이유: 리뷰 결과는 **파일별, 심각도별 구조화**가 필요하다. 일반 에이전트의 "Result: 1-3줄" 형식으로는 Critical/Warning/Suggestion을 구분할 수 없다.

### 2겹: force-compress.sh 훅 (사후 검증)

에이전트가 종료를 시도하면 SubagentStop 훅이 발동한다. transcript에서 `[COMPRESSED]` 마커를 확인하고, 없으면 블로킹한다.

```
SubagentStop 발생
↓
이벤트가 SubagentStop인가? → 아니면 exit 0 (통과)
↓
stop_hook_active=true인가? → 이미 1번 블로킹됨 → exit 0 (통과)
↓
agent_transcript_path에서 [COMPRESSED] grep
↓
├── 마커 있음 → exit 0 (통과)
│
└── 마커 없음 → exit 2 (블로킹)
                 ↓
                 stderr로 압축 형식 안내 전달
                 ↓
                 에이전트가 [COMPRESSED] 형식으로 재출력
                 ↓
                 SubagentStop 재발생 → stop_hook_active=true → exit 0 (통과)
```

핵심 설계 결정:

- **`stop_hook_active=true` 시 무조건 통과**: 무한 블로킹 방지. 최악의 경우에도 2회 시도 후 종료된다.
- **exit 2 = Claude Code의 "block" 프로토콜**: stderr 메시지가 에이전트에게 피드백으로 전달된다.
- **전체 transcript grep**: shell에서 JSONL 마지막 메시지만 파싱하는 것보다 단순하고 실용적이다.

### 두 겹의 관계

```
정상 경로 (테스트 기준 100%):
  스킬 → [COMPRESSED] 출력 → 훅: 마커 감지 → 통과      (1회 호출)

비상 경로 (이론적 폴백):
  스킬 무시 → 미압축 출력 → 훅: 블로킹 → 압축 → 통과   (2회 호출)
```

1겹이 작동하면 2겹은 **확인만 하고 넘어간다**. 추가 비용이 거의 없다.

---

## 2. 컨텍스트 주입: buildSmartContext()

에이전트 B가 시작될 때, 이전 에이전트 A의 결과를 자동 주입한다. 단순히 "최근 10건"을 주입하는 것이 아니라, **역할 기반 6단계 선별**을 수행한다.

```
Agent B 시작 (SubagentStart)
↓
buildSmartContext(sessionId, agentName, agentType, parentAgentId)
↓
1. Sibling Agent Results — 같은 부모의 형제 에이전트 완료 결과
2. Same-type History — 동일 타입 이전 에이전트 (선행 작업 학습)
3. Cross-Session Context — 이전 세션 결과 (프로젝트 메모리)
4. Tagged Context — 태그 매칭 (entry_type, tags[])
5. Fallback: Recent Context — 위 모두 없으면 최근 10건
6. Assigned Tasks — 할당된 태스크 + plan 코멘트
↓
additionalContext로 Agent B에 주입
```

**선별의 의미**: 백엔드 에이전트가 시작될 때 프론트엔드 에이전트의 상세 결과를 받을 필요는 없다. Sibling 결과만 주입되므로, 관련 없는 컨텍스트가 들어오지 않는다.

---

## 3. 전체 데이터 흐름

```
Agent A 작업 완료
↓
[COMPRESSED] 형식으로 출력 (10줄)           ← 1겹: compress-output 스킬
↓
SubagentStop 훅 발동
├── force-compress.sh: [COMPRESSED] 확인    ← 2겹: force-compress.sh 훅
└── hooks.ts → extractFromTranscript()
    ↓
    transcript JSONL에서 마지막 assistant 텍스트 추출
    ↓
    agents.context_summary에 저장 (DB)
↓
Agent B 시작 (SubagentStart)
↓
hooks.ts → buildSmartContext()
├── DB에서 Agent A의 context_summary 조회
├── 역할 기반 6단계 선별
└── additionalContext로 Agent B에 주입
↓
Agent B는 Agent A의 압축된 결과를 컨텍스트로 받음
Leader는 관여하지 않음 — 컨텍스트 폭발 없음
```

---

## 4. 적용 현황

| 에이전트 | 압축 스킬 | 줄 제한 | 모델 |
|----------|----------|--------|------|
| node-backend | compress-output | 10줄 | Sonnet |
| react-frontend | compress-output | 10줄 | Sonnet |
| cli-hooks | compress-output | 10줄 | Sonnet |
| reviewer | compress-review | 20줄 | Opus |
| clnode-curator | compress-output | 10줄 | — |

---

## 5. 설계 결정 기록

### 왜 서버 측 압축(compressSummary)을 제거했나

이전에는 `SubagentStop` 처리 시 서버에서 `compressSummary()`로 1000자 제한을 적용했다:

- Strategy 1: `## Summary` 섹션만 추출
- Strategy 2: 앞 700자 + `...` + 뒤 250자

에이전트 자체 압축(compress-output 스킬)이 10줄 제한으로 충분히 짧은 결과를 반환하므로, 서버 측 압축은 redundant해졌다. 10줄 × ~80자 = ~800자이므로 1000자 제한에 도달할 일이 없다.

제거 커밋: `9e4030a refactor: remove compressSummary() — replaced by agent self-compression`

### 왜 리뷰어를 별도 스킬로 분리했나

리뷰 결과는 심각도별 구조화(Critical/Warning/Suggestion + Verdict)가 필수다. 일반 compress-output의 "Result: 1-3줄"로는 이 구조를 표현할 수 없다. 20줄 상한도 리뷰 범위(5-7 파일)에 맞게 설정했다.

### 왜 글자 수가 아닌 줄 수로 제한하나

- 줄 수 제한이 LLM에게 더 직관적이다 — "10줄 이내로 써라"는 명확하다.
- 글자 수는 토크나이저에 따라 체감이 다르다.
- 줄 수 제한이 구조화된 출력(파일 목록, 결정 사항 등)과 자연스럽게 맞는다.

### 왜 force-compress.sh에서 전체 transcript를 grep하나

마지막 assistant 메시지만 검사하는 것이 더 정확하지만, shell에서 JSONL을 역순 파싱하려면 복잡도가 올라간다. 전체 grep은 이론적 오탐(에이전트가 `[COMPRESSED]`를 논의만 하는 경우) 가능성이 있으나, 스킬 준수율 100%에서 실용적 문제가 없다.

---

## 6. 파일 위치

| 파일 | 역할 |
|------|------|
| `.claude/skills/compress-output/SKILL.md` | 일반 에이전트 출력 압축 스킬 |
| `.claude/skills/compress-review/SKILL.md` | 리뷰어 전용 출력 압축 스킬 |
| `scripts/force-compress.sh` | SubagentStop 훅 — 압축 검증 |
| `src/server/routes/hooks.ts` | extractFromTranscript(), SubagentStop 처리 |
| `src/server/services/intelligence.ts` | buildSmartContext() — 컨텍스트 주입 엔진 |
| `.claude/agents/*.md` | 에이전트 정의 (skills 선언) |
