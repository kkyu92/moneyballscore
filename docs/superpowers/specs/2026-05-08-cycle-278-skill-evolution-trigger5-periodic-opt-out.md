# Cycle 278 — skill-evolution 19회째: trigger 5 영구 opt-out 자체 주기 보정 trigger 보유 chain 추가

## Problem

본 cycle 278 = skill-evolution 마커 박제 (cycle 277 retro 끝) 후 자동 발화. 마커 박제 사유 = trigger 5 충족 (직전 20 사이클 chain pool 1개 0회 발화). 발화 이력:

직전 20 cycle (258~277) chain 분포:
- review-code: 9/20 (45%)
- explore-idea: 5/20 (25%)
- polish-ui: 2/20 (10%)
- info-architecture-review: 2/20 (10%)
- fix-incident: 2/20 (10%)
- **operational-analysis: 0/20 (0%)** ← trigger 5 충족 chain

**근본 진단 — false positive**:

cycle 230 ~ 257 op-analysis 발화 위치:
- cycle 231: operational-analysis heavy success
- cycle 256: operational-analysis success ← cycle 255 25-cycle 주기 trigger 박제 직후 정확히 25 cycle 후 fire

cycle 256 success 직후 cycle 257~278 = 22 cycle 미발화. 이는 **cycle 255 박제 룰 (op-analysis 25-cycle 주기 보정 trigger) 의 정상 동작**. 25 cycle 주기 안에서 1회 발화 보장 메커니즘이 0회 발화를 차단하는 게 본 chain 의 의도된 발화 패턴.

그런데 trigger 5 평가 윈도우 (직전 20 cycle, cycle 252 박제) 가 op-analysis 의 주기 (25 cycle) 보다 좁음 → op-analysis 가 정확히 의도대로 25 cycle 주기 1회 발화해도 직전 20 cycle 윈도우 안 0회 발화 가능 → trigger 5 false positive 발화 → skill-evolution 강제 fire.

**유사 chain — fix-incident**:

cycle 257 박제 = fix-incident 20-cycle 주기 보정 trigger 추가. 만약 cycle 277 시점 fix-incident 가 본 주기 trigger 정상 작동으로 cycle ~270 안 1회 발화 후 다음 발화 미정 시기에 trigger 5 평가 = false positive 가능성. fix-incident 도 동일 패턴 잠재.

**3차 문제**: 매 false positive trigger 5 충족 → skill-evolution 강제 fire → SKILL.md 갱신 영역 부재 (의도된 결과) → spec only / retro-only outcome. 이는 cycle 68 박제 trigger 5 false positive cooldown (N=10) 으로 일부 차단됐지만 cooldown 만료 후 재충족 무한 loop 가능.

## Changes

### 1. trigger 5 영구 opt-out 확장 (cycle 257 룰 일반화)

기존 (cycle 257 박제):
- `dimension-cycle` (구조적 0회 정상 — 다른 trigger 없을 때만 fallback)
- `expand-scope` (희귀 조건)
- `design-system` (희귀 조건)

추가 (cycle 278 박제):
- `operational-analysis` — 자체 25-cycle 주기 보정 trigger 보유 (cycle 255 박제). 정상 발화 패턴 = 25 cycle 주기 1회. 직전 20 cycle 윈도우 안 0회 발화 가능 (정상)
- `fix-incident` — 자체 20-cycle 주기 보정 trigger 보유 (cycle 257 박제). 정상 발화 패턴 = 20 cycle 주기 1회 (또는 reactive 발화). 직전 20 cycle 윈도우 경계상 0회 발화 가능 (정상)

**근거 통합**: 자체 주기 보정 trigger 가 0회 발화 차단 메커니즘. trigger 5 가 동일 메커니즘 중복 검사 = noise. 주기 trigger 가 fire 보장하므로 trigger 5 평가 제외해도 chain 시야 균형 보장됨.

### 2. SKILL.md chain pool table — skill-evolution row 갱신

trigger 5 영구 opt-out 박제 위치 (line 69):

```diff
- **영구 의도 chain opt-out (trigger 5 평가 제외, cycle 257 박제)**: `dimension-cycle` / `expand-scope` / `design-system` — 이 3개 chain 은 구조적으로 0회 정상 (...) trigger 5 평가 시 이 3개 chain 제외 (0회 발화여도 trigger 5 미충족으로 처리)
+ **영구 의도 chain opt-out (trigger 5 평가 제외, cycle 278 박제)**: `dimension-cycle` / `expand-scope` / `design-system` / `operational-analysis` / `fix-incident` — 이 5개 chain 은 0회 발화 정상 (앞 3개 = 구조적 / 뒤 2개 = 자체 주기 보정 trigger 보유 — cycle 255 op-analysis 25-cycle / cycle 257 fix-incident 20-cycle). trigger 5 평가 시 이 5개 chain 제외 (0회 발화여도 trigger 5 미충족으로 처리). 자체 주기 trigger 가 fire 보장하므로 trigger 5 중복 검사 noise 차단.
```

### 3. SKILL.md trigger 5 평가 명령 (line 422) 명시 갱신

```diff
- | 5 | 직전 20 사이클 동안 chain pool 의 chain 1개가 0회 발화 | 직전 20 cycle_state JSON 의 `chain_selected` distinct count vs chain pool 9개 비교 |
+ | 5 | 직전 20 사이클 동안 chain pool 의 chain 1개가 0회 발화 (영구 opt-out 5개 제외) | 직전 20 cycle_state JSON 의 `chain_selected` distinct count vs chain pool 4개 (review-code / explore-idea / polish-ui / info-architecture-review) 비교 |
```

### 4. frontmatter description 갱신

- skill-evolution 19회 반영 (cycle 278 추가)
- PASS_ship 144 (cycle 277 기준) 갱신

## Rationale

cycle 255: op-analysis 25-cycle 주기 trigger 추가 → cycle 256 fire 보장.
cycle 257: fix-incident 20-cycle 주기 trigger 추가 + 영구 opt-out 3개.
cycle 278: 영구 opt-out 5개로 확장 — 자체 주기 보정 trigger 가 0회 발화 차단 메커니즘인 chain 추가.

**일반화된 룰**: trigger 5 평가 시 다음 chain 제외:
1. 구조적 0회 정상 chain (dimension-cycle / expand-scope / design-system)
2. 자체 주기 보정 trigger 보유 chain (operational-analysis / fix-incident)

본 일반화는 cycle 61/135 인정 (구조적) + cycle 255/257 박제 (주기 보정 trigger) 의 합리적 통합. 미래 chain 추가 시 자체 주기 trigger 보유 시 자동 opt-out 후보 명시.

## MIGRATION-PATH.md

cycle 278 entry append (SKILL.md 외부 파일, append only — cycle 252 박제 룰).
