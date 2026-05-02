# develop-cycle Skill Chain + cycle_state — Design Spec

**작성일**: 2026-05-02
**대상**: 글로벌 `~/.claude/skills/develop-cycle/SKILL.md` (사용자 영역) + 본 리포 `~/.develop-cycle/cycles/` (zero-touch 인프라 재활용)
**연관**: develop-cycle skill, zero-touch 자동화 (`docs/superpowers/specs/2026-05-02-develop-cycle-zero-touch-design.md`), R6 (manual 호출 정책), R7 (자동 머지)

---

## 1. 비전 (사용자 발화 직역)

> "스스로 상황에 맞게 스킬들을 활용하여 프로젝트 개선을 훌륭하게 작업해내는 것 — 사이클 1회 뿐만 아니라 N회까지 스스로 자동화"

이 비전을 두 layer 로 분해:

- **Layer A (사이클 1회 안)**: 진단 → 상황 맞는 superpowers/gstack skill chain 자율 선택 + 실행
- **Layer B (사이클 N회 사이)**: 자동 다음 시작 (zero-touch ✅ 이미 완성) + **사이클 간 풍부 carry-over** (직전 사이클 결과 → 다음 사이클 진단 input)

두 layer 가 합쳐지면 = "인간 개발자처럼 N 사이클 동안 일관된 자율 운영" 비전 도달.

## 2. 명시적 비스코프 (carry-over 폐기 사항)

이전 carry-over "이슈 자동 triage" + 그 brainstorm 중 거친 두 옵션은 **사용자 본질 의도와 다름** 으로 폐기:

- ❌ 외부 trigger (incident → 사이클 시작) — 사용자가 manual `/develop-cycle N` 직접 호출. 외부 trigger 불필요 confirm
- ❌ chain library 외부 추상화 + 분류기 (LLM `claude -p`) — 외부 trigger 가 없으니 외부 분류기도 불필요
- ❌ Layer 1 (incident triage) — Layer 2 (사이클 안 skill chain) 가 핵심 비전

본 spec 은 **사이클 안** + **사이클 사이** 두 layer 만 다룬다.

## 3. 사용자 결정 (확정 4건)

1. **외부 trigger / 분류기 폐기** — manual `/develop-cycle N` + zero-touch 로 충분
2. **Layer A + Layer B 통합 단일 spec** — 비전 도달 path 통합 디자인 (decompose 거절)
3. **Skill chain 선택 = 메인 LLM 자유 추론** — 룰 X. chain pool 정적 정의 + 메인이 진단 결과 보고 자유 선택
4. **cycle_state 위치 = `~/.develop-cycle/cycles/<n>.json` + Med 깊이** — zero-touch 인프라 재활용. file 기반. JSON 단일 객체

## 4. 핵심 추상화 — chain pool

차원 (site/acquisition/model) → **chain** 으로 일반화. 각 chain 은 다음 4 필드:

```
chain {
  name:       chain 이름 (slug)
  trigger:    적용 조건 (자연어, LLM 추론용)
  sequence:   skill 호출 순서 (직렬)
  stop:       멈춤 조건 (성공/실패 판단)
}
```

### 4.1 초기 chain pool 6개

| Chain | 적용 조건 (trigger) | 시퀀스 | 멈춤 조건 |
|---|---|---|---|
| `fix-incident` | 진단 = 버그/에러/silent 실패/regression | `investigate` → 코드 수정 → `ship` | PR 생성 + CI green 또는 root cause 미해결 |
| `explore-idea` | 진단 = 신규 기능 / 큰 방향 미정 / 자연 발화에서 새 product idea | `office-hours` → `plan-ceo-review` → `plan-eng-review` → 구현 → `ship` | spec/plan 박제 또는 사용자 reject |
| `polish-ui` | 진단 = UI 이슈 / 디자인 부채 / 디자인 일관성 균열 | `plan-design-review` → `design-review` → `ship` | UI fix PR 또는 design system 박제 |
| `review-code` | 진단 = 코드 품질 / 테스트 부족 / 복잡도 누적 | `health` → `simplify` → `review` → `ship` | 품질 score 개선 또는 cleanup PR |
| `operational-analysis` | 진단 = 운영 데이터 분석 / 적중률 metric / 패턴 학습 | `weekly-review` → `extract-pattern` → `compound` | 회고 박제 또는 lesson PR |
| `dimension-cycle` (legacy) | 위 어디에도 안 맞음 (default fallback) | 기존 site/acquisition/model 차원 dispatch (현재 디자인 그대로) | 기존 디자인 동일 |

새 chain 추가 = SKILL.md 의 chain pool table 에 한 행 추가 (정적, 코드 변경 X). 메인이 SKILL.md 의 chain pool 인지하고 있으니 자동 후보 확장.

### 4.2 책임 경계 (chain 도입의 의미)

- chain pool = **도구상자**. 어떤 chain 들이 사용 가능한지 명시
- 선택 = **메인 자율 추론** (LLM). 진단 결과 + chain pool 보고 자유 선택. 룰 X
- 실행 = **chain sequence 직렬 호출** (메인이 Skill 도구 또는 Agent 도구로). chain 안 sub-skill 실패 시 stop 조건 따라 회고

## 5. Layer A — chain 자유 선택 메커니즘

메인 (Opus 4.7) 이 develop-cycle 사이클 1회의 진단 단계에서:

1. **풀 스캔** — CLAUDE.md 필수 스캔 + 직전 3 cycle_state read
2. **key_findings 추출** — scan 결과 요약 + 주요 발견
3. **chain pool table 인지** — SKILL.md 정적 정의 인지 (skill 컨텍스트 안)
4. **chain 자유 선택** — 진단 결과 + chain pool 보고 LLM 추론으로 결정. 선택 이유 박제
5. **chain 시퀀스 직렬 실행** — Skill 도구 (메인 컨텍스트, 가벼운 step) 또는 Agent 도구 (subagent 컨텍스트, context isolation 필요한 무거운 step) 메인 자율 선택. chain 안 각 step 의 결과 cycle_state 에 박제
6. **commit + PR** — chain 결과를 4 prefix (feat/fix/feedback/policy/lesson 등) 따라 commit + branch + PR. R7 자동 머지

## 6. Layer B — cycle_state JSON

### 6.1 위치 + 포맷

- **위치**: `~/.develop-cycle/cycles/<n>.json` — 사이클 번호별 단일 JSON 객체
- **인프라 재활용**: zero-touch 가 이미 `~/.develop-cycle/signal` 사용 중. 같은 디렉토리에 `cycles/` 추가
- **포맷**: 단일 JSON 객체 (jsonl X, 한 사이클 = 한 파일)

### 6.2 스키마 (Med 깊이)

```json
{
  "cycle_n": 12,
  "started_at": "2026-05-02T11:00:00Z",
  "ended_at": "2026-05-02T11:45:00Z",
  "diagnosis": {
    "scan_summary": "git log 15개 / migration 021 / TODOS 5건 carry-over / 어제 적중률 60%",
    "key_findings": [
      "live-update cron 5/2 silent skip 발견",
      "AdSense Publisher ID 발급 대기 (사용자 영역)"
    ],
    "input_from_prev_cycles": [
      "cycle 11: chain=fix-incident, outcome=success, fixed Sentry alert silent",
      "cycle 10: chain=polish-ui, outcome=partial, PR #42 머지 대기"
    ]
  },
  "chain_selected": "fix-incident",
  "chain_reason": "live-update cron silent skip = silent 실패 패턴 (사례 7 류). investigate → ship chain 적합",
  "execution": {
    "skills_invoked": ["investigate", "ship"],
    "results": {
      "investigate": "root cause = cloudflare worker schedule 5분 단위 → KBO API rate limit",
      "ship": "PR #45 생성, CI green, R7 자동 머지 대기"
    },
    "outcome": "success"
  },
  "commit_hash": "abc1234",
  "pr_number": 45,
  "retro": {
    "summary": "live-update silent skip 차단. cloudflare worker rate limit 회피 패턴 박제.",
    "todos_added": ["KBO API 응답 시간 monitoring 1주 누적 후 cron 빈도 재조정"],
    "next_recommended_chain": "operational-analysis",
    "next_recommended_reason": "1주 데이터 누적 후 적중률 영향 분석 가치"
  }
}
```

### 6.3 필드 의미

| 필드 | 책임 |
|---|---|
| `diagnosis.scan_summary` | 풀 스캔 압축 요약 (1~2 줄) |
| `diagnosis.key_findings` | 메인이 진단에서 주목한 발견 list |
| `diagnosis.input_from_prev_cycles` | 직전 3 cycle_state 의 chain + outcome 압축 (중복 회피 / 흐름 파악용) |
| `chain_selected` | chain pool 의 어느 chain 골랐나 (slug) |
| `chain_reason` | 왜 그 chain 골랐나 (LLM 추론 trace) |
| `execution.skills_invoked` | chain 시퀀스 실제 호출 list |
| `execution.results` | skill 별 outcome (한 줄 박제) |
| `execution.outcome` | `success` / `fail` / `partial` |
| `commit_hash` / `pr_number` | git/GH 산출물 link |
| `retro.summary` | 회고 1~2줄 |
| `retro.todos_added` | 신규 todo (TODOS.md 와 별개로 cycle_state 에도 박제) |
| `retro.next_recommended_chain` | 다음 사이클 권장 (참고용, 강제 X) |
| `retro.next_recommended_reason` | 권장 이유 |

## 7. 다음 사이클 진단 input

다음 사이클의 진단 단계가 직전 3 cycle_state read (N=3 = 사용자 default 와 매칭. 흐름 파악 + 중복 회피 충분, 4+ 는 진단 prompt 비대화):

1. `~/.develop-cycle/cycles/<n-1>.json`, `<n-2>.json`, `<n-3>.json` read (없으면 skip)
2. 각 파일에서 `chain_selected` + `execution.outcome` + `retro.summary` + `retro.next_recommended_chain` 추출
3. `diagnosis.input_from_prev_cycles` 에 압축 박제 (위 스키마 예시)
4. **중복 chain 회피 신호**: 직전 3 사이클 모두 같은 chain 이면 다른 chain 우선 (LLM 추론 input)
5. **next_recommended_chain 힌트**: 직전 사이클의 권장이 있으면 진단 input. 강제 X (메인 자율 결정 우선)

## 8. SKILL.md 4 단계 갱신

| 단계 | 현재 SKILL.md | 갱신 후 |
|---|---|---|
| **진단** | 풀 스캔 (CLAUDE.md / git log / TODOS / migrations / agents) | + 직전 3 cycle_state read + chain pool table 인지 + key_findings 박제 |
| **차원 선택** | site / acquisition / model 자율 | **chain 자유 선택** (chain pool 6개 table) — chain_selected + chain_reason 박제 |
| **팀원 dispatch** | 차원별 subagent (general-purpose 또는 Plan/Explore) | chain 시퀀스 직렬 호출 (Skill 도구 / Agent 도구). chain 안 각 step 결과 박제 |
| **회고** | 텍스트 박제 (commit message + handoff save) | + cycle_state JSON 작성 (`~/.develop-cycle/cycles/<n>.json`) + retro.next_recommended_chain 박제 |

## 9. 호환성

### 9.1 기존 차원 사이클 호환

`dimension-cycle` chain (default fallback) 으로 등록 — 위 5개 chain 적용 안 되면 기존 site/acquisition/model 차원 dispatch 그대로. 기존 첫 시범 fire (PR #31 site) + 2nd fire (model n47) 와 동일 흐름.

### 9.2 zero-touch 호환

- signal file 포맷 그대로: `<n>\nOK\n\n<next_n>` (변경 X)
- watch.sh / install.sh / plist 변경 X
- cycles/ 디렉토리만 새로 사용 (signal 과 같은 부모 `~/.develop-cycle/`)

### 9.3 handoff carry-over 와 책임 분리

| 메커니즘 | 단위 | 내용 | 위치 |
|---|---|---|---|
| handoff save | 세션 단위 | 세션 전체 요약 + 다음 세션 첫 명령 | `~/.gstack/projects/<slug>/checkpoints/` |
| cycle_state | 사이클 단위 | 사이클 1회 메타 (chain / 결과) | `~/.develop-cycle/cycles/<n>.json` |
| git commit | 변경 단위 | 코드 변경 사실 | git history |
| TODOS.md | 사용자 가시 | 백로그 | repo root |

cycle_state 는 develop-cycle skill 자체 운영 메타. handoff 보다 좁고 git commit 보다 풍부.

## 10. 실패 모드 & 안전장치

| 실패 | 안전장치 |
|---|---|
| chain pool 적용 조건 모호 (어느 chain 도 안 맞음) | default `dimension-cycle` 폴백. 또는 메인이 chain 만들어 박제 (다음 PR) |
| chain 안 sub-skill 실패 (예: `investigate` 가 root cause 못 찾음) | cycle_state outcome=`fail` + retro 에 fail reason 박제 + 다음 사이클 회피 신호 (input_from_prev_cycles) |
| cycle_state JSON write 실패 (filesystem 에러 등) | 메인이 handoff save 호출 (안전망). zero-touch signal 은 OK 박제 (다음 사이클 진행) |
| 메인이 chain 선택 잘못 (진단 misread) | 사용자 끼어들기로 next_n=0 박제 (zero-touch stop). 또는 R5 (체크포인트 주장 검증) 다음 세션에서 회고 |
| 직전 cycle_state read 실패 (파일 없음 / 손상) | input_from_prev_cycles = [] 빈 배열. 신규 시작처럼 진행 |
| 동일 chain 3회 연속 (중복 패턴) | 메인이 chain pool 의 다른 chain 우선 추론 (LLM input) |

## 11. 테스트 plan

### 11.1 Unit (chain pool / cycle_state)

- chain pool table 에 6개 chain 정의 + 적용 조건 명확
- cycle_state JSON schema validation (필드 누락 / 타입 / 중첩)
- 직전 3 cycle_state read 함수 (파일 없을 때 / 손상 시 / 정상 시)

### 11.2 Integration (chain dry-run)

- 6개 chain 각각 dry-run (실제 skill 호출 안 하고 메인이 진단 시나리오 보고 어떤 chain 고르는지 trace)
  - 시나리오 A: "Sentry alert" → expected `fix-incident`
  - 시나리오 B: "사용자 자연 발화 = 큰 기능 idea" → expected `explore-idea`
  - 시나리오 C: "design 일관성 균열" → expected `polish-ui`
  - 시나리오 D: "복잡도 / 테스트 부족" → expected `review-code`
  - 시나리오 E: "1주 운영 분석" → expected `operational-analysis`
  - 시나리오 F: "위 5개 안 맞음" → expected `dimension-cycle` (default)

### 11.3 통합 시뮬 (3 사이클 연속)

- zero-touch 와 결합. signal file → tmux send-keys → 다음 사이클 시작 → cycle_state read → chain 선택 → 실행 → cycle_state write → signal 다시 write
- 3 사이클 연속 다른 chain 선택 확인 (중복 회피 검증)
- cycle_state.next_recommended_chain 이 다음 진단 input 로 들어가는지 확인

### 11.4 호환성 검증

- 기존 차원 사이클 (`dimension-cycle` chain) 동일 흐름인지 PR #31 (site) / 2nd fire (model) 형태와 비교
- handoff carry-over 와 cycle_state 책임 분리 확인 (중복 정보 없음)

## 12. 산출물

### 12.1 코드 / 설정

- `~/.claude/skills/develop-cycle/SKILL.md` 큰 갱신 (Layer A 4 단계 + Layer B cycle_state)
- `~/.develop-cycle/cycles/.gitkeep` (디렉토리 박제, zero-touch install.sh 가 mkdir)

### 12.2 문서 / spec

- 본 spec 파일 (`docs/superpowers/specs/2026-05-02-develop-cycle-skill-chain-design.md`)
- 다음 단계 plan (`docs/superpowers/plans/2026-05-02-develop-cycle-skill-chain.md`) — writing-plans skill 호출

### 12.3 테스트

- chain pool dry-run 시나리오 6 (위 11.2)
- cycle_state schema validation script (선택)
- 통합 시뮬 (위 11.3) — 사용자 영역 첫 fire 후 검증

## 13. 작업 분량 추정

- spec 작성 (이 문서) — 완료
- plan 작성 — 다음 단계 (writing-plans)
- SKILL.md 갱신 — 1~2 시간 (Layer A + B + chain pool table + cycle_state read/write 로직 박제)
- 시나리오 dry-run trace — 30분
- 통합 시뮬 (zero-touch 결합) — 사용자 영역 첫 fire 의존 (자연 검증)
- 총 작업 분량 — 본 메인 영역 ~2 시간 + 사용자 영역 첫 fire 검증

## 14. 다음 단계

본 spec 사용자 검토 → writing-plans skill 호출 → 구현 plan 생성 → executing-plans → SKILL.md 갱신 commit + push → 사용자 영역 첫 fire 시 자연 검증.
