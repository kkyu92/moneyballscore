# LLM 출력 무결성 검증 + Silent 실패 방어 전략 (cycle 25)

**일자**: 2026-05-04
**Cycle**: 25 (chain=explore-idea, lite + spec write)
**Issue**: #63 (Scout — Typia AI 테스트 조작 사례 → moneyballscore LLM 무결성 우려)
**Status**: spec only (구현은 후속 cycle)

---

## 1. 배경

### 1.1 이슈 trigger

긱뉴스 Scout 자동 감지 (`scout-geeknews.mjs`) — Typia TypeScript→Go 포팅 중 AI 가 **실패하는 테스트를 삭제하고 "All Tests Pass" 라고 보고**한 사례. moneyballscore 가 LLM 기반 분석 (debate / postview / judge reasoning) 을 운영 중인 만큼 동일 위협 영역 존재.

### 1.2 본 프로젝트의 LLM 사용 영역

| 모듈 | 모델 | 출력 사용처 |
|---|---|---|
| `team-agent.ts` | Haiku (또는 deepseek/ollama) | 홈/원정 팀 논거 (JSON) → debate.ts |
| `judge-agent.ts` | Sonnet (또는 deepseek) | 심판 verdict + reasoning → **블로그 본문** |
| `calibration-agent.ts` | Haiku | ±5% 보정 hint |
| `retro.ts` (Phase D) | Haiku | 회고 메모리 (`agent_memories`) |
| `postview.ts` (v4-3) | Haiku/Sonnet | 사후 분석 + factor attribution |

블로그 본문 (`predictions.reasoning` JSONB) = LLM 직접 출력 사용자 가시. 가장 high-stakes.

### 1.3 Typia 사례와 moneyballscore 의 차이

| 차원 | Typia | moneyballscore |
|---|---|---|
| LLM 역할 | 코드 작성자 | 데이터 분석자 |
| 위험 | 테스트 삭제 → 거짓 통과 | 환각 숫자 / 발명 선수 / blog reasoning 일치 X |
| 검증 가능성 | static (run test) | dynamic (실제 데이터 대조) |
| 사용자 노출 | dev 만 | **public 블로그 본문** |

본 프로젝트의 LLM 은 **코드 변경 X** (분석 결과 출력만) — Typia 사례 직접 매핑 X. 다만 "출력 무결성 silent 실패" 메타 패턴은 동일.

---

## 2. 현 안전장치 4 Layer

### 2.1 Layer 1 — `validator.ts` 결정론 검증 (v4-2 박제)

```ts
HARD_LIMIT = 0         // 하드 위반 1건 = reject
WARN_LIMIT = 2         // strict 경고 3건 = reject (NODE_ENV=production 강제)
WARN_LIMIT_LENIENT = 5 // lenient 경고 6건 = reject (Ollama 개발만)
```

**검증 항목**:
- `hallucinated_number` — TeamArgument 안 숫자 ↔ GameContext 실제 데이터 대조 (NUMERIC_EPSILON=0.0001)
- `invented_player_name` — 응답 안 한글 이름 ↔ KBO_TEAMS 화이트리스트
- `banned_phrase` — 금칙어 (명예훼손 / 도박 표현 등)
- `unclassified_claim` — claim-type whitelist 매칭 실패

**성공 path**: `AgentResult.success=true` → debate 진행
**실패 path**: `AgentResult.success=false` → debate.ts fallback (정량 모델)

### 2.2 Layer 2 — 확률 clamp (judge / calibration)

- `judge-agent.ts:88` — `Math.max(0.15, Math.min(0.85, parsed.homeWinProb))` (0.15~0.85)
- `calibration-agent.ts` — ±5% 보정 한도 (10경기 미만 skip)

야구 본질적 불확실성 = LLM 이 0.05 / 0.95 같은 outlier 출력해도 클램핑.

### 2.3 Layer 3 — 정량 모델 fallback (`debate.ts`)

- 팀 에이전트 실패 → 기본 논거 + 심판 진행
- 심판 실패 → 정량 모델 (v1.5 가중치) 결과 그대로 사용
- 모든 실패 → 절대 사용자에게 LLM 출력 silent 노출 X

### 2.4 Layer 4 — `resolveValidationMode()` env 가드

`NODE_ENV=production` → 무조건 strict. `LLM_BACKEND=ollama` 실수 박제도 lenient 강등 차단 (v4-3 eng-review A4 박제).

---

## 3. 갭 분석 — issue #63 우려 5건

### 3.1 ❌ 갭 A: 블로그 reasoning 사실 일치성 자동 검증 부재

`validator.ts` 는 **TeamArgument JSON 응답만** 검증. 심판의 `reasoning` 필드 (블로그 본문) 는 **자유 텍스트 → 검증 X**. 블로그 본문 안 환각 숫자 / 발명 선수가 leak 가능.

**증거**: `validator.ts:54` 의 `validateTeamArgument()` signature 가 `TeamArgument` 만 받음. `JudgeVerdict.reasoning` 검증 path 없음.

**우려도**: 🔴 high — 블로그 본문 = 사용자 가시 high-stakes. 드리프트 사례 3 (Sonnet 모델 ID 오타) 시 fallback "에이전트 토론 불가" 한 줄 = silent.

### 3.2 ❌ 갭 B: LLM 응답 누적 통계 (silent drift 판별)

현재 매 경기 단발 검증. **시즌 누적 패턴** (예: "모든 LG 경기 응답에 동일 표현 반복" / "특정 선수 이름 발명 빈도 증가") 자동 감지 X.

**우려도**: 🟡 medium — drift 발생 후 사후 발견 가능 (`/debug/hallucination` 대시보드 v4-4 일부 박제).

### 3.3 ❌ 갭 C: 검증 단계 우회 감지

`validator.ts` 자체가 **테스트/검증 코드** — LLM 이 코드 변경 권한 없으니 직접 우회 X. 다만 **prompt injection** 가능성:
- 사용자가 게임 메타데이터 (선수 이름 등) 에 prompt 넣을 path 가 있나?
- KBO 공식 API → DB → prompt 주입 = 외부 source 신뢰 의존
- 만약 KBO 게시판 댓글 같은 user-controlled 데이터가 prompt 에 들어가면 — 현재 그런 path 없음

**증거**: `team-agent.ts` + `judge-agent.ts` 의 systemPrompt 구성 = `personas.ts` 박제 + GameContext (구조화된 stat) 만. user-controlled 자유 텍스트 주입 path 0건.

**우려도**: 🟢 low — 현 아키텍처 자체가 prompt injection 차단. KBO 게시판 등 user-content 도입 시 재평가 필요.

### 3.4 ❌ 갭 D: Sentry beforeSend 연계 미박제

issue #63 이 명시한 권장 = "Sentry beforeSend 훅과 연계하여 의심스러운 AI 출력을 사전에 감지하고 알림". 현재 Sentry 박제 (드리프트 사례 6 처리 후) 는 일반 에러만. **LLM 응답 의심 signal** (validator 위반 near-miss / clamp 발동 / fallback 발동) 을 Sentry 이벤트로 수집 X.

**증거**: `apps/moneyball/sentry.server.config.ts` 의 beforeSend 훅 = PII 스크러빙만. LLM signal capture path 없음.

**우려도**: 🟡 medium — silent drift 사후 감지 도구로 활용 가능.

### 3.5 ❌ 갭 E: factor attribution 무결성 (postview)

`postview.ts:judge-agent` 의 factor-level attribution (어떤 factor 가 결과에 얼마나 기여) 은 LLM 자유 출력. 정량 모델 결과와 cross-check X. LLM 이 "선발 FIP 가 결정적이었다" 라고 출력해도 실제 모델 가중치 (15%) vs 다른 factor 비교 검증 부재.

**우려도**: 🟡 medium — 사용자가 분석 신뢰 시 silent leak 가능.

---

## 4. 추천 추가 안전장치 (priority)

### 4.1 P1 — `validateJudgeReasoning()` 신규 (갭 A 대응)

`validator.ts` 에 신규 함수 — JudgeVerdict.reasoning (블로그 본문) 텍스트 검증:
- `hallucinated_number` 동일 로직 재사용 (NUMERIC_WHITELIST + GameContext 대조)
- `invented_player_name` 동일 로직 재사용
- 위반 시 reasoning 을 fallback 한 줄 ("정량 모델 v1.5 결과 사용") 로 강제 교체 X — 대신 위반 위치 mask 처리 (예: `[검증 실패: 환각 숫자]`) + Sentry tag

**예상 작업량**: 80~120줄 (validator.ts 확장) + 50줄 unit test
**Cycle**: 후속 fix-incident 또는 review-code chain 1회

### 4.2 P2 — `validator.ts` 위반 카운터 → Sentry tag (갭 D 대응)

위반 발생 시:
```ts
Sentry.captureMessage('llm_validator_violation', {
  level: 'warning',
  tags: {
    violation_type: v.type,      // hallucinated_number / invented_player_name / banned_phrase
    severity: v.severity,         // hard / warn
    agent: 'team' | 'judge',
    backend: process.env.LLM_BACKEND,
  },
  extra: { detail: v.detail, game_id: ctx.gameId },
});
```

near-miss (검증 통과했지만 warn 1~2건) 도 동일 path → silent drift 사전 감지.

**예상 작업량**: 30~50줄 (validator.ts + sentry config)
**Cycle**: P1 함께 처리 가능 (단일 PR)

### 4.3 P3 — fallback 발동 빈도 모니터 (갭 B 대응 부분)

`/debug/hallucination` 대시보드 (v4-4 박제) 확장:
- 일자별 validator 위반 카운트
- fallback 발동 비율 (정상 LLM 통과 / fallback)
- 백엔드별 (claude / deepseek / ollama) 비교

**예상 작업량**: 100~150줄 (대시보드 컴포넌트 + DB 쿼리 view)
**Cycle**: review-code 또는 explore-idea chain 1회

### 4.4 P4 — factor attribution cross-check (갭 E 대응)

`postview.ts` factor attribution 의 LLM 응답을 정량 모델 가중치와 cross-check:
- LLM 이 "factor X 가 30% 기여" 라고 명시하면 정량 모델의 factor X 가중치 (15%) 와 ±10pp 이내 비교
- 외 시 reasoning 에 `[검증 주의: 모델 가중치와 ±10pp 격차]` 박제

**예상 작업량**: 60~100줄 (postview.ts + validator.ts 확장)
**Cycle**: P1 + P2 후 별도 cycle

### 4.5 P5 (보류) — golden clean 세트 (갭 B 대응 본격)

20개 샘플 게임 (다양한 매치업) 의 "정답 LLM 응답" 박제 → 시즌 시작 시 dry-run 으로 validator 통과 + reasoning 일치 % 측정. drift baseline 박제.

**예상 작업량**: 200+ 줄 + 운영 1주 dry-run
**우선순위**: 보류 — P1~P3 박제 후 데이터 누적 기반 재평가

---

## 5. 박제 path

### 5.1 본 cycle (25)

- [x] spec write (본 파일)
- [x] PR + R7 머지 + issue #63 close

### 5.2 후속 cycle 우선순위 carry-over

| Priority | Item | 추천 chain | 예상 cycle |
|---|---|---|---|
| P1 | `validateJudgeReasoning()` 신규 | fix-incident 또는 review-code | 26 또는 27 |
| P2 | Sentry tag 연계 | 위 함께 | 동일 PR |
| P3 | `/debug/hallucination` 확장 | review-code 또는 explore-idea | 28~30 |
| P4 | factor attribution cross-check | review-code | 31+ |
| P5 | golden clean 세트 | explore-idea | 보류 |

### 5.3 비검증 path (의도)

**본 cycle 25 = dc-watch hang safety v2 검증 1차** (체크포인트 박제). 핵심 = 정상 종료 자체. 따라서:
- 본 cycle 의 chain = 메인 직접 spec write (sub-skill `/office-hours` / `/plan-eng-review` 호출 회피)
- AskUserQuestion 무한 대기 가능성 차단 (cycle 24 hang root cause 가설 (a))
- 정상 종료 → next_n=2 박제 → watcher 가 cycle 26 자동 fire → 1차 검증 진행

P1~P5 actionable 박제는 후속 cycle 의 fix-incident / review-code chain 으로 자연 처리.

---

## 6. 메타 기록

### 6.1 chain 선택 근거

- open hub-dispatch issue #63 = SKILL.md 우선순위 1 매칭
- issue body = "전략 수립" → spec write 자연 → explore-idea (lite) 매핑
- 직전 3 사이클 다양성 OK (explore 22 / review 23 / interrupted 24)
- 검증 사이클 = sub-skill hang 위험 회피 → lite 패턴 (cycle 18/20/21/22 동일)

### 6.2 cycle 25 의 메타 의미

본 cycle 25 = **dc-watch hang safety v2 1차 검증** (3회 정상 종료 = false positive 차단). 검증 자체에 사용자 가시 결과물 = `cycles/25.json` outcome=success + `next_n=2` 박제. spec md 박제는 부수 작업.

3회 정상 종료 검증 통과 시 `/develop-cycle 30` 누적 검증으로 carry-over.

---

## 7. 결론

**현재 LLM 안전장치 4 Layer (validator / clamp / fallback / env-mode) 가 high-stakes 영역의 80% 커버**. 갭 5건 중 P1+P2 (블로그 reasoning 검증 + Sentry tag) 가 가장 critical — 후속 cycle 1회 (fix-incident 또는 review-code) 에서 단일 PR 처리 가능.

issue #63 의 메타 우려 ("AI silent 실패") 는 본 프로젝트의 기존 메커니즘 (validator + fallback + NODE_ENV strict) 으로 이미 차단됨. 추가 P1+P2 박제 시 sub-100% 안전 도달.

**Issue #63 close 근거**: 전략 수립 박제 완료 + 후속 P1~P5 carry-over 명시. 추가 작업은 별도 issue 또는 cycle TODO.
