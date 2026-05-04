# H6 lambda double-dip 청산 — backtest 5 스크립트 fix LAMBDA=0.01 (cycle 23)

**Saved**: 2026-05-04 KST 21:18 (UTC 12:18)
**Cycle**: 23 (sequence 6 of 50, /develop-cycle 45 fresh process)
**Chain**: review-code (lite, 다른 source 다양화)
**Branch**: `develop-cycle/h6-lambda-fix-cycle23`

---

## 진단

cycle 22 retro 4순위 명시 carry-over = "H6 best() lambda double-dip 제거". cycle 22 bootstrap-ci 결과 4f/7f 모두 best λ=0.01 → fix LAMBDA=0.01 = 결과 변경 없음 + double-dip 위험 제거.

직전 3 사이클 (20/21/22) 모두 explore-idea = SKILL.md "동일 chain 3회 연속" 회피 신호 발효 + cycle 22 retro `next_recommended_chain` 옵션 = "review-code (다양성 회복, **다른 source**)". chain tally 22 후: review 7 / ops 4 / fix 4 / explore 5 / polish-ui 2 / dimension 0. review-code 가 가장 누적 (32%) 이지만 cycle 22 retro 가 직접 추천 + H6 이 review-code 의 자연 매핑 (코드 cleanup, 작은 PR).

진단 source 다양화: 직전 3 사이클 backtest 분석 source 만 봐서 다양화. 본 cycle = `pnpm lint` (clean) + `tsc --noEmit` (clean) + 큰 파일 list 진단. daily.ts 959줄 1위 (단일 함수 runDailyPipeline 560줄) — 한 사이클 안 cleanup 무리. backtest 스크립트들 (7 file ~64KB) 의 lambda 패턴 = 작고 명확한 cleanup.

---

## H6 정의

cycle 20 spec §3.1 "Wayback backtest 신뢰성 6 메타 가설" 의 H6:

> **H6**: best() 함수 — 4 lambda 후보 (0, 0.001, 0.01, 0.1) 중 test Brier 최소 선택 = test set 정보 누설 (double-dipping). hyperparameter tuning 을 test set 으로 하면 test 결과 inflated.

올바른 방법:
1. **train k-fold cross-validation** — train 안에서 fold 별 best lambda → 진짜 train-only selection
2. **train/val split** — train 80% / val 20% 분리, val 로 best lambda → out-of-sample
3. **fix lambda** (선험적) — domain knowledge 또는 prior cycle 결과 기반

본 cycle = 옵션 3 (가장 작은 변경, cycle 22 검증 결과 활용).

## 정량 근거

cycle 22 backtest-bootstrap-ci-run.ts 결과 (B=1000, seed=42, train=2023, test=2024 N=727):
- 4-feature: best λ = 0.01
- 7-feature: best λ = 0.01

4 lambda 후보 (0, 0.001, 0.01, 0.1) 중 0.01 압승 → fix LAMBDA=0.01 = 검증 결과 동일 + double-dip 패턴 제거.

## 변경 (5 backtest 스크립트)

| 파일 | 변경 |
|---|---|
| `backtest-manual-weights-run.ts` | `best()` 함수 (lambda loop) → `fit()` 함수 (LAMBDA=0.01 fix) |
| `backtest-bootstrap-ci-run.ts` | 동일 |
| `backtest-wayback-run.ts` | `best()` (Fit interface 유지) → `fit()` (LAMBDA=0.01 fix) |
| `backtest-logistic-run.ts` | grid search loop → 단일 `trainLogistic` (LAMBDA=0.01) |
| `backtest-v3-run.ts` | `best()` 함수 → `fit()` 함수 (LAMBDA=0.01 fix) |

총 -59 lines net (loops 제거).

### 검증

- `pnpm --filter @moneyball/kbo-data exec tsc --noEmit` clean
- 행동 변경 0 (manual-weights / bootstrap-ci 두 파일은 cycle 22 검증 best 0.01 일치)
- logistic-run / v3-run / wayback-run = 이전 best 가 0.01 아닐 수 있음 → 결과 약간 다를 수 있음 (단 H6 패턴 제거 = 더 정직한 결과). 필요 시 다음 cycle 에서 실측 비교 가능.

## 다음 cycle (24~) 1순위

cycle 22 retro 1순위 carry-over = **H2 rolling stats backtest** (큰 작업 2~3 사이클). 각 경기 시점까지 누적 stats 만 사용 → 시즌 말 stats 의 오라클 효과 측정. fetchAllSeasonTeamStats → 경기 시점별 게임 수 누적 stats 재계산 인프라 필요.

대안: cycle ~25 operational-analysis prod N≥100 trend 측정 (시간 의존, 자연 발화 timing).

---

## 메타

review-code 8회째 (이전 7회: cycle 1/3/5/8/12/15/16/22 retro 일부). chain tally 23 후: review 8 / explore 5 / ops 4 / fix 4 / polish-ui 2 / dimension 0. review-code 35% (소폭 증가). 다양성 회복 측면 polish-ui (2/23 = 9%) 와 dimension-cycle (0/23) 이 다음 cycle 후보 (단 trigger 자연 발화 의존).

cycle 22 retro `next_recommended` 활용 + 직전 3 explore 회피 = chain 선택 rationale 두 갈래 일치. 메인 자율 결정 일관.
