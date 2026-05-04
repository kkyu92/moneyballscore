# develop-cycle skill 메타 확장 design

**날짜**: 2026-05-04
**작성**: brainstorm 세션 (사용자 + 본 메인)
**비전**: 허브-워커 양방향 무한성장 자동화 (전체 프로젝트 핵심 목표)
**대상 파일**: `~/.claude/skills/develop-cycle/SKILL.md` (글로벌) + `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` (repo draft)

---

## 0. 배경 (왜 확장하나)

현재 SKILL.md (240 줄, 2026-05-02 박제) 의 chain pool = 6개 (`fix-incident` / `explore-idea` / `polish-ui` / `review-code` / `operational-analysis` / `dimension-cycle`). 50 fire 8 사이클 (10~17) 검증 후 사용자 발화:

> "내가 제한한 틀 안에서만 개선 확장을 하는것 같다. 오피스아워 또는 브레인스토밍 등 스킬을 호출하다보면 더 확장해서 기획하는 선택지들이 있지 이런것도 자동으로 좀 채택해서 추가 요금이 발생하지 않고 내가 제한한 목표를 위해 도움이 된다면 더 확장하고 개선해서 작업이 이루어졌으면 좋겠다. 기획,개발,디자인 요소 전부다"

핵심 갭:
1. 메타 스킬 (`/office-hours`, `superpowers:brainstorming`, `/plan-ceo-review` SCOPE EXPANSION) 의 자율 발화 약함 — `explore-idea` chain 안에 박혀 있어 작은 idea 만 결정
2. 워커→허브 양방향 신호 = `lesson` commit prefix 1채널만 자동 dispatch. cycle 회고 / 메타 패턴 / chain pool 진화 후보 모두 누락
3. 디자인 chain = `polish-ui` 1개 (작은 UI fix). `design-consultation` / `design-shotgun` / `plan-design-review` 같은 시스템 디자인 메타 스킬 chain 부재
4. SKILL.md 자체 = manual 갱신만. 누적 메타 발견을 SKILL 에 자가 반영 메커니즘 X. chain pool 진화가 사용자 결정 의존

cycle 19 메타 finding (scout-geeknews 봇 false positive 80%) 도 dispatch 채널 부재로 허브 측 봇 prompt 갱신 input 못 됨.

---

## 1. 비용 가드 (사용자 결정 박제)

| 비용 종류 | 정책 |
|---|---|
| Claude Plan token (Max 요금제) | OK — 효율 신경. 메타 스킬 발화 시 토큰 모니터, fail 시 retro-only fallback |
| 외부 서비스 결제 (Domain / 유료 SaaS / AdSense paid plan / Linear pro) | **자율 결제 절대 금지**. 사용자 carry-over 알림만 |
| 운영 인프라 한도 (Vercel free tier 100 deploy/day / Supabase free / Cloudflare Workers free) | 자율 monitor + **자율 upgrade 금지**. tier 도달 시 cycle outcome=fail + `meta-pattern` dispatch |
| 사용자 시간 | **본 메인이 사용자에게 "이거 해주세요" 자율 요청 금지**. carry-over 박제 채널 (`memory:` subtype=needs) 만 사용 |

비용 가드 위반 차단 메커니즘:
- 본 SKILL 안 외부 paid API 호출 명령 박제 X (코드 path 자체 X)
- 본 SKILL 안 사용자 직접 요청 명령 박제 X (carry-over 채널만)

---

## 2. 아키텍처 변경 요약

```
┌─ chain pool 6 → 9 ─────────────┐    ┌─ dispatch 채널 1 → 4 ──────┐    ┌─ SKILL 진화 manual → 자율+임계 ──┐
│ fix-incident                   │    │ lesson (기존)               │    │ trigger 충족 시 자율 갱신:        │
│ explore-idea                   │    │ + cycle-retro (신규)        │    │  - chain-evolution 5건 누적       │
│ polish-ui                      │    │ + meta-pattern (신규)       │    │  - 같은 chain 5회 연속 fail       │
│ review-code                    │    │ + chain-evolution (신규)    │    │  - 50 사이클 milestone            │
│ operational-analysis           │    │                             │    │  - meta-pattern body 명시         │
│ dimension-cycle                │    │ 단일 transport (기존):       │    │  - chain ≥ 20 사이클 0회 발화     │
│ + expand-scope (신규)          │    │  submit-lesson.yml workflow │    │ → R7 자동 머지 (git revert 회복) │
│ + design-system (신규)         │    │  body subtype: 라인 분류    │    │                                   │
│ + skill-evolution (신규)       │    │                             │    │                                   │
└────────────────────────────────┘    └─────────────────────────────┘    └───────────────────────────────────┘
```

---

## 3. 신규 chain 3개 spec

### 3.1 `expand-scope` chain (7번째)

| 항목 | spec |
|---|---|
| **목적** | 메타 스킬 (`/office-hours`, `/plan-ceo-review` SCOPE EXPANSION, `superpowers:brainstorming`) 의 자율 발화 — 작은 fix 가 아닌 큰 기획 / 새 product 방향 / 영역 architecture 재검토 |
| **trigger (OR)** | (1) 직전 4 사이클 모두 small fix (`fix-incident`/`polish-ui`/`review-code` 만, `explore-idea`/`dimension-cycle` 0회) (2) GH issue body 에 architecture/refactor/redesign/scope 키워드 (3) `meta-pattern` dispatch 누적 = "이 영역 재검토 필요" (4) 사용자 호출 N = milestone (예: 50/100) (5) TODOS.md "큰 방향" 항목 4주 이상 미진행 |
| **시퀀스** | `/office-hours` → `/plan-ceo-review` (**SCOPE EXPANSION 모드 강제**) → `superpowers:brainstorming` → spec write (`docs/superpowers/specs/YYYY-MM-DD-<scope>-design.md`) → 사용자 review 게이트 (PR draft) 또는 즉시 `superpowers:writing-plans` → 구현 → `/ship` |
| **stop** | (a) spec 박제 + ship PR 생성 (success) / (b) spec 만 박제 + 사용자 review 대기 (partial) / (c) office-hours 결과 = "확장 가치 부족" 결론 → retro-only lesson commit (retro-only) |
| **commit prefix** | `feat:` (구현까지) / `lesson:` (retro-only) / `docs(spec):` (spec 만) |
| **branch** | `develop-cycle/expand-scope-<slug>` |
| **fail 모드** | office-hours 자체 fail → outcome=fail + retro 회피 신호 박제 |

### 3.2 `design-system` chain (8번째)

| 항목 | spec |
|---|---|
| **목적** | 디자인 메타 스킬 (`/design-consultation`, `/design-shotgun`, `/plan-design-review`) 의 자율 발화 — 시스템 레벨 디자인 (DESIGN.md 갱신, 컴포넌트 시스템, 변형 다수 분석). `polish-ui` 는 작은 UI fix 로 유지 |
| **trigger (OR)** | (1) `DESIGN.md` 마지막 갱신 후 ≥ 4주 (2) 새 라우트/기능 area 디자인 spec 부재 (예: `/search` 디자인 시스템 명시 X) (3) 사용자 자연 발화 ("디자인 좀 다듬어" / "shotgun 돌려줘") (4) `meta-pattern` dispatch = "design chain 0회 N 사이클" (5) DESIGN.md vs 실제 컴포넌트 균열 grep 감지 |
| **시퀀스** | `/design-consultation` → `/design-shotgun` (변형 3-5개) → `/plan-design-review` → (선택) `/design-html` (mockup 검증) → 구현 → `/design-review` (live audit) → `/ship` |
| **stop** | (a) design system PR (DESIGN.md 갱신 + 컴포넌트 리팩) (success) / (b) consultation + shotgun 까지 (mockup spec 박제, 구현 별도) (partial) / (c) consultation 결과 = "현 디자인 충분" → retro-only |
| **commit prefix** | `feat:` 또는 `feat(design):` / `lesson:` (retro-only) / `docs(spec):` (mockup spec) |
| **branch** | `develop-cycle/design-system-<slug>` |
| **fail 모드** | design-shotgun 변형 생성 실패 → outcome=fail. `polish-ui` 자동 fallback 옵션 |

### 3.3 `skill-evolution` chain (9번째 — 자동 발화)

| 항목 | spec |
|---|---|
| **목적** | SKILL.md 자가 진화 — chain pool 자체 확장 / 진단 source 추가 / stop 조건 박제 / trigger 임계 갱신. 메인 자율 발화 X = trigger 자동 평가 |
| **trigger (OR — 자동 평가)** | (1) `chain-evolution` subtype commit 5건 누적 (전체 git history 누적) (2) 같은 chain 5회 연속 outcome=fail (3) `cycle_n % 50 == 0` (milestone) (4) `meta-pattern` body 에 "SKILL 갱신 필요" 명시 (5) **직전 20 사이클 동안** chain pool 의 chain 1개가 0회 발화 |
| **trigger 평가 위치** | 매 사이클 retro 단계 마지막 step. 충족 시 → 다음 사이클이 `skill-evolution` 강제 발화 (signal next_n 박제 + zero-touch 자동 fire) |
| **시퀀스** | (1) 트리거 증거 수집 → (2) 갱신 영역 list → (3) `/office-hours` (skill 갱신 영역 brainstorming) → (4) spec write (`docs/superpowers/specs/YYYY-MM-DD-skill-evolution-N.md`) → (5) `~/.claude/skills/develop-cycle/SKILL.md` Edit → (6) `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` Edit (동기) → (7) `pnpm test` (smoke) → (8) commit `feat(skill):` + branch `develop-cycle/skill-evolution-N` → (9) PR + R7 자동 머지 → (10) `meta-pattern` dispatch (변경 diff 요약 + 영향 범위) |
| **stop** | (a) SKILL.md 변경 PR 박제 + R7 머지 (success) / (b) spec 만 박제 + 사용자 review 대기 (partial) / (c) brainstorm 결과 "현 SKILL 충분" → retro-only |
| **commit prefix** | `feat(skill):` (변경) / `lesson:` (retro-only) |
| **branch** | `develop-cycle/skill-evolution-N` (N = cycle_n) |
| **fail 모드** | smoke test fail → PR 생성 X. retro-only outcome=fail. trigger 조건 그대로 → 다음 사이클 재시도 |

### 3.4 발화 빈도 가드 (모든 신규 chain)

- 한 사이클에 `expand-scope` + `design-system` + `skill-evolution` 동시 발화 X — 메타 chain 1회/사이클
- `expand-scope` / `design-system` 모두 **본 chain 의 직전 발화 사이클** outcome ≠ success 면 다음 사이클 회피 (자가 의심 X = R3 정신). 예: `expand-scope` 가 cycle 30 에서 fail → cycle 31~ 어떤 시점이든 `expand-scope` 회피, 다음 발화는 다른 chain 이 1회 success 후 가능
- `skill-evolution` = 직전 3 사이클이 `skill-evolution` 이면 회피 (무한 self-trigger 차단, R3 정신)
- 토큰 가드: 메타 스킬 발화 시 sub-skill 호출 ≤ 4 (office-hours / ceo / brainstorming / writing-plans = 4 max)

---

## 4. 4채널 dispatch spec

### 4.1 통합 transport

기존 `submit-lesson.yml` workflow 가 이미 4 prefix (`lesson:` / `policy:` / `feedback:` / `memory:`) 모두 허브 dispatch (2026-04-29 Phase 4a D4 박제). 신규 workflow X — body 의 **`subtype:` 라인** 으로 4채널 분류. 허브 측 (PlayBook) 단일 `worker-lesson` 채널이 subtype 보고 routing.

### 4.2 4채널 spec

| 채널 | trigger | payload (commit body) | commit prefix + subtype | 빈도 가드 |
|---|---|---|---|---|
| **lesson** (기존) | 박제할 학습 발견 | lesson markdown (사례 / 원인 / 대응 / 박제 위치) | `lesson:` + `subtype: lesson` | 자율 (사이클 1+ 가능) |
| **cycle-retro** (신규) | 매 사이클 끝 자율 | `cycle_n` / `chain_selected` / `outcome` / `retro.summary` / `next_recommended_chain` + 본 메인 한줄 메타 | `policy:` + `subtype: cycle-retro` | **매 사이클 1회 강제** |
| **meta-pattern** (신규) | N ≥ 5 누적 발견 자율 판단 | 패턴 description + 증거 (cycle_n list) + 추천 행동 | `memory:` + `subtype: meta-pattern` | **임계 충족 시만** (잡음 차단) |
| **chain-evolution** (신규) | 자율 chain 후보 판단 | 신규 chain spec — slug / trigger / 시퀀스 / stop 조건 / 발화 예시 | `memory:` + `subtype: chain-evolution` | **자율** (5건 누적 → § 3.3 SKILL 진화 trigger) |

### 4.3 commit body 표준 형식 예시

```
memory: chain-evolution security-audit chain 후보

subtype: chain-evolution
slug: security-audit
trigger:
  - GH issue body 에 security/audit/CVE 키워드
  - Sentry alert 에 sensitive data leak
  - dependabot vulnerability alert
sequence: /cso → /security-review → spec write → ship
stop: security PR 박제 또는 retro-only
evidence:
  - cycle 23: fix-incident chain 으로 처리됐지만 cso 시야 부재
  - cycle 25: 동일 영역 두 번째 발생
  - cycle 27: pattern 명확
recommendation: chain pool 9번째 추가 가치
```

### 4.4 단일 사이클 dispatch 한도

- **단일 사이클 lesson channel dispatch ≤ 2 commit** (cycle-retro 1 강제 + 메타 류 1 자율 = max 2)
- 매 사이클 4건 dispatch = 잡음 가드
- `meta-pattern` + `chain-evolution` 둘 다 한 사이클에 발화 X (자율 1택)

### 4.5 자가 발화 위치 (skill 시퀀스 안)

```
사이클 단계 4 (회고)
  ├── cycle_state JSON write           (~/.develop-cycle/cycles/<n>.json)
  ├── (1) cycle-retro commit          ← 강제 dispatch (매 사이클)
  ├── 본 메인 자가 평가
  │     - 5+ 누적 메타 발견 있나?  → (2) meta-pattern commit
  │     - 신규 chain 후보 명확한가? → (3) chain-evolution commit
  │     - 둘 다 X                  → 추가 dispatch X
  ├── lesson 발견 시               → (4) lesson commit (자율)
  ├── skill-evolution trigger 평가
  ├── zero-touch signal file 작성
  └── R7 자동 머지
```

---

## 5. SKILL.md 자가 진화 안전장치

| risk | 안전장치 |
|---|---|
| SKILL.md 잘못 변경 → N 사이클 오작동 누적 | git history 자동 백업. 사용자가 `git revert <commit>` 1회 복구 |
| `skill-evolution` 자체 fail | outcome=fail. trigger 조건 그대로 → 다음 사이클 재시도 (자동) |
| 임계 너무 자주 충족 (잡음) | 임계값 자체가 자가 진화 대상. 본 메인이 5 → 10 갱신 가능 |
| `skill-evolution` 무한 self-trigger | 직전 3 사이클이 `skill-evolution` 이면 회피 (R3 정신) |
| 사용자가 모르게 SKILL 변경 | meta-pattern dispatch 가 변경 알림 (사용자 visible). 변경 commit `feat(skill):` 도 main visible. PR 도 자동 머지 전 잠시 노출 |
| smoke test fail (pnpm test red) | PR 생성 X. retro-only outcome=fail. 다음 사이클 재시도 |

### 5.1 글로벌 cp 동기

| 위치 | 역할 |
|---|---|
| `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` | repo 안 source of truth. `feat(skill):` commit 의 변경 대상 |
| `~/.claude/skills/develop-cycle/SKILL.md` | 글로벌 (Skill 도구 로드 위치). draft 와 동기 필수 |

`skill-evolution` 사이클은 두 위치 모두 Edit. cycle_state.execution.results 에 양쪽 변경 hash 박제.

---

## 6. 호환성

| 영역 | 변경 | 기존 영향 |
|---|---|---|
| chain pool 6개 | 모두 유지 + 3개 추가 | 기존 chain trigger / 시퀀스 변경 X |
| `submit-lesson.yml` workflow | 변경 X (4 prefix 그대로) | 기존 lesson dispatch 영향 X. 신규 3채널 = body `subtype:` 라인 추가만 |
| zero-touch signal file 포맷 | 변경 X | watch.sh 변경 X |
| handoff carry-over vs cycle_state 책임 분리 | 변경 X | 기존 메커니즘 그대로 |
| R7 자동 머지 정책 | 적용 (`skill-evolution` 포함) | 기존 정책 그대로 |
| 컨텍스트 % 자가 판단 무시 (D-2) | 적용 그대로 | 매 사이클 fresh process 변경 X |

---

## 7. 실패 모드 종합

| 실패 | 안전장치 | 출처 섹션 |
|---|---|---|
| `expand-scope` / `design-system` trigger 임계 모호 | 다른 chain fallback (`fix-incident` 또는 `dimension-cycle`) | § 3 |
| 메타 스킬 (office-hours/ceo-review) 자체 fail | outcome=fail + 다음 사이클 회피 신호 | § 3 |
| 메타 chain 1사이클 동시 발화 | 발화 빈도 가드 (1택) | § 3.4 |
| 4채널 dispatch silent skip | 단일 transport (`submit-lesson.yml`) — #34 PR `/commits` API fallback 이미 squash 안전 | § 4 |
| `meta-pattern` + `chain-evolution` 한 사이클 동시 | 자율 1택 (잡음 가드) | § 4.4 |
| `skill-evolution` 무한 self-trigger | 직전 3 사이클 = `skill-evolution` 회피 (R3) | § 3.4 |
| SKILL.md 잘못 변경 누적 | git history + `git revert` 1회 복구 | § 5 |
| smoke test (pnpm test) fail | PR 생성 X. outcome=fail. 다음 사이클 재시도 | § 5 |
| 외부 SaaS 자율 결제 시도 | 본 SKILL 안 paid API 호출 명령 박제 절대 X | § 1 |
| 사용자에게 "이거 해주세요" 자율 요청 | carry-over 박제 채널만. 직접 요청 명령 박제 X | § 1 |
| Vercel/Supabase free tier 한도 도달 | `meta-pattern` dispatch + cycle outcome=fail. 자율 upgrade X | § 1 |
| **사이클 hang (cycle 24 사례)** | **watch.sh 에 timeout (예: 30분) 후 자동 kill + interrupted cycle_state 박제 로직 검토 — 본 spec 이행 후 별도 cycle 에서 처리** | cycle 24 박제 |

---

## 8. 마이그레이션 path (단계적 발화)

| 단계 | 시점 | 발화 |
|---|---|---|
| 0 | 본 spec 머지 직후 | chain pool 6 → 9 즉시. 첫 사이클부터 `cycle-retro` commit 강제 |
| 1 | N ≥ 5 사이클 | `meta-pattern` / `chain-evolution` dispatch 가능 (자율 판단) |
| 2 | N ≥ 20 사이클 | `skill-evolution` 첫 발화 가능 (chain 0회 발화 trigger) |
| 3 | N = 50 milestone | `skill-evolution` 자동 발화 (50 milestone trigger) |
| 4 | N ≥ 100 누적 | 본 SKILL 가 자가 진화 N회 누적. chain pool 자체 변경 가능 |

---

## 9. spec write 안전 절차 (working tree 충돌 회피)

50 fire 백그라운드 진행 중 + 사이클이 `docs/superpowers/specs/` 안에 spec 박제. 본 메인 spec write 시 충돌 회피:

```bash
# 1. dc-watch 정지 (새 사이클 spawn 차단)
launchctl unload ~/Library/LaunchAgents/com.kkyu.dc-watch.plist

# 2. 진행 중 사이클 끝 monitoring (또는 hung 시 강제 종료 + 수동 cycle_state 박제)

# 3. main checkout + pull
git checkout main && git pull origin main --ff-only

# 4. 본 spec 전용 branch (develop-cycle/<slug> prefix 로 R7 자동 적용)
git checkout -b develop-cycle/meta-expansion-spec

# 5. spec write
# docs/superpowers/specs/2026-05-04-develop-cycle-meta-expansion-design.md

# 6. commit + push + PR + R7 자동 머지
git add docs/superpowers/specs/2026-05-04-develop-cycle-meta-expansion-design.md
git commit -m "docs(spec): develop-cycle meta-expansion design"
git push -u origin develop-cycle/meta-expansion-spec
gh pr create ...
gh pr merge <num> --squash --auto --delete-branch

# 7. 사용자가 새 /develop-cycle N 호출 시 = 새 9 chain pool 로 재개
```

---

## 10. 다음 단계 (본 spec 머지 후)

1. **plan write** (`superpowers:writing-plans` skill) — 본 spec 의 implementation plan
2. **SKILL.md 갱신 작업** — 본 plan 따라 `~/.claude/skills/develop-cycle/SKILL.md` + `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md` 양쪽 Edit
3. **smoke test** — 본 SKILL 변경이 다른 영역 영향 X 검증 (`pnpm test`)
4. **PR + R7 자동 머지**
5. **사용자가 `/develop-cycle N` 호출** — 새 9 chain pool 로 재개. 첫 사이클부터 `cycle-retro` commit 강제 → 4채널 dispatch 작동 확인

---

## 11. 참조

- 기존 SKILL.md: `~/.claude/skills/develop-cycle/SKILL.md` (240 줄, 2026-05-02)
- 기존 draft: `docs/superpowers/specs/2026-05-02-develop-cycle-SKILL-md-draft.md`
- CLAUDE.md R6 (develop-cycle skill 도입), R7 (자동 머지)
- 메모리: `feedback_session_quality_rules.md` (R3 재질문에 답 바꾸지 않기)
- cycle 19 메타 finding: scout-geeknews 봇 false positive 80% (5/5 sample 중 1건만 진짜 gap)
- cycle 24 박제 (`~/.develop-cycle/cycles/24.json`): hang 발견 + 강제 종료 사례. § 7 의 "사이클 hang 안전장치" trigger 사례
