---
plan_n: 15
topic: factor 11/12 forward measurement + Fancy Stats Elo baseline + Statcast 신규 factor 13+ 후보
target_chain: explore-idea
status: completed — all phases shipped cycle 1036 (v2.0-backtest-evidence.md + plan #15 completed_at 2026-05-29). v2.0 upgrade 불필요 결론 (cycle 1460) 으로 factor 11/12 forward measurement 추가 분석 불필요. 본 autoplan-review = 역사 기록으로 보존.
expiry: 2026-08-04T00:00:00Z
created_at: 2026-05-28
parent_plan: 14
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  baseline_v18: "n=25 verified / accuracy 44.00% (2026-05-28 cycle 1021 C1c Step B 측정)"
  baseline_v21B_shadow: "n=47 verified / accuracy 51.06% (cohort_n=0 walk-forward degenerate 단 production cohort 측정)"
  baseline_v20_shadow: "n=0 verified / day 1 누적 시작 (cycle 1019 C1a 박제, ETA 2026-08-04 n=150)"
  rubric_evaluation: |
    가치: high (shadow factor 11/12 +7pp 차이 evidence 누적 시 v2.0 production ship 결정 input)
    시간 비용: large (n=150 wait = 68일 + Statcast scraper 작업)
    risk: 1 (소표본 noise — n=25/47/0 비교 결정 X)
    자율 가능: partial (harness 본 메인 자율 fire / Fancy Stats Elo manual parser 본 메인 자율 / Statcast scraper 본 메인 자율 + 6주 forward 측정 wait)
    의존성: 단일 (plan #14 C1a/C1b ship 결과 활용)
---

# Plan #15 — factor 11/12 forward + Fancy Stats Elo baseline + Statcast 신규 factor 후보

cycle 1021 carry-over — plan #14 C1b harness (cohort_n=0 walk-forward degenerate) 후속 + factor 13+ 후보 도입 검토.

## Problem

plan #14 C1b harness 가 ship 됐지만 (PR #1335) 1회 fire 결과 = walk-forward degenerate (rule_definition_date 2026-05-12 vs v1.8 시작 5/13, train set ≈ 0). 실제 evidence pack 0 — n=150 forward cohort wait 또는 expanding/rolling time CV pattern 대체 필요. 또한 Fancy Stats Elo baseline = public API 부재로 manual fetch + parser carry-over. Statcast-식 신규 factor 후보 (xwOBA / Barrel% / Hard Hit%) 는 KBO Pitch-by-pitch 미수집 = 별도 scraper.

## Scope (initial)

3 sub-step 분리:

- **C1d Fancy Stats Elo manual parser** — public API 부재, manual fetch + cheerio parse 패턴 (cycle 1013 v2.1-B-shadow 정합). backtest harness 안 baseline column 활성화.
- **C1e walk-forward 대체 pattern** — expanding window OOS (train=v1.7-revert / test=v1.8) 또는 rolling time CV (5/12 leakage 차단). 소표본 (n=25) 도 evidence pack 시도.
- **C1f Statcast-식 신규 factor 13+ 후보 도입 검토** — KBO Pitch-by-pitch 미수집 → (a) MLB Statcast API 이식 (별도 plan scope) (b) KBO Fancy Stats batted ball 데이터 활용 (LD%/GB%/FB% 등 proxy)

## Architecture (initial)

- **C1d**: `packages/kbo-data/src/scrapers/fancy-stats-elo.ts` 신규 (cheerio parser 패턴) + `packages/kbo-data/src/backtest/backtest-v2-helpers.ts` 안 Fancy Stats Elo column 활성 + retry/timeout 정합
- **C1e**: `packages/kbo-data/src/backtest/walk-forward-helpers.ts` 안 expanding window + rolling time CV pattern 함수 추가 + `scripts/backtest-v2-candidate.ts` 안 `--cv-pattern` flag 추가
- **C1f**: `docs/decisions/statcast-factor-13-scope.md` 박제 (1-pager — MLB 이식 vs KBO Fancy proxy 비교). 사용자 결정 wait. 결정 후 scraper 작업 시작.

## Steps (chain 단위)

### Phase 1 — C1d Fancy Stats Elo manual parser

1. `packages/kbo-data/src/scrapers/fancy-stats-elo.ts` 신규 — `https://www.kbofancystats.com/team/elo` 패턴 (또는 정확한 URL 검색) cheerio parse. retry 3 + timeout 10s + 2s rate-limit
2. unit test (mock HTML fixture)
3. `backtest-v2-helpers.ts` 안 `fancy_stats_elo_brier` column 활성 (현 null fallback → 실제 측정)
4. backtest harness 1회 fire → 결과 박제 (`docs/research/v2.0-backtest-evidence.md` 갱신)
5. commit `feat(scraper): Fancy Stats Elo manual parser + backtest harness baseline column 활성` + branch develop-cycle/plan-15-c1d + PR + R7 머지

### Phase 2 — C1e walk-forward 대체 pattern

1. `packages/kbo-data/src/backtest/walk-forward-helpers.ts` 안 `expandingWindowSplit()` + `rollingTimeCV()` 함수 추가
2. `scripts/backtest-v2-candidate.ts` 안 `--cv-pattern=walk-forward|expanding|rolling` flag 추가
3. **자가 의심 명시**: 소표본 (n=25) 평가 = "결정 X / evidence pack only" 라벨 강제 (cycle 887 plan #8 패턴 정합)
4. backtest harness expanding window fire → 결과 박제 (`docs/research/v2.0-backtest-evidence.md` 갱신, 패턴별 결과 분리 column)
5. unit test (expanding/rolling split deterministic)
6. commit `feat(research): backtest harness expanding window + rolling time CV pattern` + branch develop-cycle/plan-15-c1e + PR + R7 머지

### Phase 3 — C1f Statcast-식 factor 13+ 후보 검토 (1-pager)

1. `docs/decisions/statcast-factor-13-scope.md` 박제 — (a) MLB Statcast API 이식 비용 (`statsapi.mlb.com` 형식, 단 MLB-KBO 매핑 X = 한국 선수에 적용 어려움) vs (b) KBO Fancy Stats batted ball 데이터 활용 비용 비교 + 추천 + 사용자 결정 wait
2. 사용자 결정 시점 = n=150 도달 (ETA 2026-08-04) 또는 v2.0 production ship 결정 시점 중 먼저
3. commit `docs(decisions): Statcast factor 13+ scope 1-pager` + branch develop-cycle/plan-15-c1f + PR + R7 머지

## Risks

- **C1d**: Fancy Stats HTML 구조 변경 시 silent break (kbo-scraper-alert 패턴 정합 — cycle 858 박제)
- **C1e**: 소표본 결정 X = 룰 강제. 자가 의심 박제 누락 시 noise 결정 위험
- **C1f**: lock-in 차단 = 1-pager only, 페이지/scraper 박제 X (plan #14 C3 commitment escalation 차단 정합)

## Success criteria

- C1d: Fancy Stats Elo column 활성 + backtest harness 결과 박제
- C1e: expanding window + rolling time CV 패턴 + 자가 의심 명시 박제
- C1f: 1-pager 박제 + 사용자 결정 wait

## Cross-model perspective + autoplan 4축 review 통합

본 plan = plan #14 carry-over scope. autoplan 4축 review skip (parent_plan #14 이미 review 통과 evidence 활용).

## Decision Audit Trail

cycle 1021 (2026-05-28): plan #14 C1b 첫 fire 결과 = walk-forward degenerate (cohort_n=0). C1d/C1e/C1f 3 sub-step 분리 plan 박제.

## 자가 의심 (plan #8 패턴 정합)

- v1.8 (clean) n=25 vs v2.1-B-shadow n=47 비교 결정 X — 소표본 noise
- v2.0-shadow n=0 = forward cohort wait (ETA 2026-08-04 n=150)
- 본 plan 의 sub-step 결과 모두 "evidence pack only" 라벨 강제 — production ship 결정 input 으로만 사용

## autoplan 사후 review (2026-05-28 — cycle 1021 후속)

본 plan = parent_plan #14 carry-over 라 autoplan 4축 review skip 선언했으나
**사용자 옵션 B 채택으로 사후 fire**. Codex unavailable (ChatGPT account 안
gpt-5.3-codex 미지원) → subagent-only `[codex-unavailable]` 모드. CEO + Eng
subagent 2 voice 발견 통합.

### 강한 발견 (총 10건)

**CRITICAL (4건)**:
- **CEO-1 premise lie (C1d)** — `Fancy Stats Elo public API 부재` claim 거짓.
  `fetchEloRatings()` 가 `packages/kbo-data/src/scrapers/fancy-stats.ts:438` 에
  이미 존재. C1d 진짜 가치 = silent-drift fix (`status='completed' → 'final'`),
  parser 신규 X. 자가 의심 룰 (CLAUDE.md feedback_question_own_defaults) 위반
- **CEO-3 wrong problem** — v2.0 후보 accuracy -3.7pp = REFUTES v2.0. 더 많은
  harness 짓는 대신 candidate weights 재설계 필요. 6-month regret = n=150 wait
  후 still underperform, 68일 sunk cost
- **Eng-C1 expanding mode theatre** — `scripts/backtest-v2-candidate.ts:122-128`
  `cohort = split.test` 만, train set 자체 X 사용. walk-forward 와 동일 결과.
  label 자체 misleading
- **Eng-C2 test fixture coupling 실패** — `backtest-v2-helpers.test.ts:80,111,132`
  fixture 안 `status: 'final'` hard-coded. unit test 가 silent drift 'completed'
  → 'final' bug 못 잡음. harness fire 가 catch (cohort_n=0)

**HIGH (4건)**:
- **CEO-2 autoplan skip self-justifying** — parent_plan #14 review 가 plan #15
  sub-step 측정 불가능 (plan #15 = #14 후속 발견). skip = circular
- **CEO-5 zero user value** — 3 PR 모두 backend, 사용자 가시 X. 모델 정확도
  +0 evidence
- **Eng-H1 HOME_ADVANTAGE × 400 dimensionally wrong** —
  `backtest-v2-helpers.ts:41` `0.015 × 400 = 6 Elo points` = 0.86% prob shift
  (실측 1.5% 의 절반). 올바른 = 24 Elo point. **Elo Brier 0.2526 baseline 잘못
  측정 — 다시 측정 필요**
- **Eng-H2/H3/H4 silent drift family 8/9/10/11 확장** — scraper silent fail /
  window > span silent all / empty cohort silent doc 박제

**MEDIUM (2건)**:
- **CEO-4 C1f 1-pager too easy deferral** — Statcast 결정 trigger (n=150 또는
  v2.0 ship) = 둘 다 같은 blocked event. 캘린더 bound trigger 필요
- **CEO-6 walk-forward leakage** — Eng-C1 와 연결. expanding window
  scoring-rule boundary mixing = sophisticated way to lie to ourselves faster

### 후속 fix carry-over (별도 PR)

1. **CRITICAL Eng-H1 fix** — HOME_ADVANTAGE × 400 → HOME_ELO_BONUS = 24 박제 +
   computeEloProb test 추가 (`computeEloProb(1500, 1500) ≈ 0.515` assertion).
   본 fix 후 Elo Brier 재측정 (현 0.2526 잘못)
2. **CRITICAL Eng-C1 fix** — expanding mode rename 또는 제거. 현 `cohort =
   split.test` 만 사용 = mislabel. 또는 실제 train weights 학습 layer 추가
3. **CRITICAL Eng-C2 fix** — ALLOWED_STATUS 단일 source const + integration
   test (실제 DB row status 검증)
4. **HIGH Eng-H2/H3/H4 fix** — scraper silent fail 시 STATUS banner / window
   > span warning / empty cohort throw
5. **HIGH CEO-3 reframe** — v2.0 후보 kill-switch criterion 추가 (n=60 시점
   여전히 -2pp 하회 시 weights 폐기 + 재설계)
6. **MEDIUM CEO-4 reframe** — Statcast 1-pager 캘린더 bound (예: 2026-06-30)
   trigger 박제

### 사용자 결정 wait (taste)

- v2.0 후보 weights kill-switch 적용 여부 (CEO-3 fix #5)
- expanding mode 제거 vs train weights 학습 layer 추가 (Eng-C1 fix #2)
- Statcast 1-pager 캘린더 trigger 추가 여부 (CEO-4 fix #6)

### 자가 의심 차단 룰 정합 (cycle 124 박제)

본 review = 사후 retrospective audit (3 PR 모두 merged). 본 메인 자가 의심
차단 룰 = 사용자 결정만 stop 신호. autoplan 사후 fire 결과 = lessons learned
박제 + carry-over fix PR 박제 (사용자 결정 후 fire).

### Dual voice 한계

Codex unavailable → subagent-only. cross-model consensus 측정 불가. 본 review
강도 = single-voice limit. Codex 사용 가능 환경 (gpt-5.3-codex 지원 plan) 시
재 fire 권장.
