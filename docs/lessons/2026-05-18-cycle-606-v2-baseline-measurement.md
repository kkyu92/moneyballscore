# v2.0 전진 Step A — n=119 baseline 정확 측정

**Cycle**: 606 (2026-05-18)
**Chain**: operational-analysis (lite)
**Outcome**: SUCCESS (baseline 박제, 신규 코드 X)

---

## 발화 맥락

- cycle 605 spec (`docs/superpowers/specs/2026-05-18-cycle-605-v2-transition-roadmap.md`) Step A 카리오버 evidence 명시
- operational-analysis 마지막 발화 cycle 516 = 90 cycle gap (25-cycle gap trigger 강력 충족)
- 2-chain alternation lock 미발동 (직전 8 distinct=3: review-code 6 + skill-evolution 1 + explore-idea 1)
- lite mode 강제 — 신선 데이터 ≥7일, 결정 기준 측정 완료, n=150 미도달

## 측정 결과 (predictions table, `verified_at IS NOT NULL`)

총 verified n = **119**

| scoring_rule | model_version | n | accuracy | avg_confidence |
|---|---|---|---|---|
| v1.6 | v2.0-debate | 46 | **37.0%** | 0.518 |
| v1.7-revert | v2.0-debate | 32 | **53.1%** | 0.507 |
| v1.8 | v1.8 (credit-fail) | 17 | **29.4%** | 0.389 |
| v1.5 | v2.0-debate | 16 | **75.0%** | 0.574 |
| v1.8 | v2.0-debate (real-debate) | 8 | **50.0%** | 0.398 |

## v1.8 sub-cohort 분해 (n=25)

- **credit-fail (`model_version='v1.8'`)**: 17건, 29.4% — silent fallback path (PR #372 family fix 작동: real-debate 실패 시 mv='v1.8' 강등 라벨)
- **real-debate (`model_version='v2.0-debate'`, `debate_version='v2-persona4'`)**: 8건, 50.0%
- `factors.agentError` 박제 0/25 — silent fallback 시 agentError 미박제 (H5 분류 진단엔 metadata 채널 부재 → cloudflare-worker / Sentry 우선)

## cycle 605 spec carry-over 정정

| 항목 | cycle 605 spec 추정 | cycle 606 실측 | 차이 |
|---|---|---|---|
| 총 n | 119 (추정) | 119 | 일치 |
| v1.8 credit-fail | 15 | 17 | +2 |
| v1.8 real-debate | 10 | 8 | -2 |

cycle 542 측정 → cycle 605 spec → cycle 606 baseline 사이 분류 변동 2건. 5/16-5/17 추가 verify 시 mv 분류 재조정 가능성. **v1.8 총 25건 일치 — 분모 변동 X**.

## v2.0 임계 갭

- **현 n=119**
- **임계 n=150**
- **잔존 31건**

W23 (5/19~5/25) ~ W24 (5/26~6/1) 2주 후 도달 추정 (KBO 시즌 진행 5건/일 가정).

## scoring_rule 분리 분해 (전체 119건)

- **현 가중치 (v1.8 scoring_rule, 25건)**: 36.0% — credit-fail noise 포함
- **real-debate sub-cohort 분리 (8건)**: 50.0% — n 부족, 결정 영향 X
- **v1.7-revert (32건)**: 53.1% — strongest sub-cohort
- **v1.5 (16건)**: 75.0% — early small n inflation 가능

## 다음 cycle 후속

- **Step B (cycle 605 spec 명시, fix-incident heavy)**: H5 (rate limit + 동시 호출) 검증 — `agentError detail 분류` (Sentry breadcrumbs / cloudflare-worker 로그 우선), cron stagger 실험
- **operational-analysis 5건 단위 baseline**: n=125 / n=130 / n=135 / n=140 / n=145 단계별 lite 재측정 가능
- **Step C (n=150 도달 시, operational-analysis heavy)**: backtest harness 위 factor 정보가치 재측정 + v2.0 가중치 확정

## 박제 evidence path

- 측정 스크립트 (one-off): `/tmp/baseline_v2.ts` (커밋 X, 재실행 시 본 lesson 의 query 재현 가능)
- TODOS.md "v2.0 가중치 트래킹" 섹션 갱신 후보 (사용자 review 시)

## 관련

- `docs/superpowers/specs/2026-05-18-cycle-605-v2-transition-roadmap.md`
- `docs/superpowers/specs/2026-05-18-cycle-557-v18-credit-hypothesis-falsification.md`
- `docs/superpowers/specs/2026-05-18-cycle-549-v18-weekday-credit-fail-hypothesis.md`
- `~/.develop-cycle/cycles/542.json`
- `~/.develop-cycle/cycles/605.json`
