# cycle 835 operational-analysis (lite) — TODOS.md vs CLAUDE.md silent stale drift

> **⚠️ STALE 부분 (cycle 1460 결정 후, 2026-07-06)** — v1.8 유지 확정. 본 lesson § "n=150 도달 시 (예상 cycle 840~850): operational-analysis (heavy) — v2.0 backtest harness 실행" 예측 라인만 superseded (v2.0 upgrade 불필요 확정). 실제 n=150 crossing = cycle 1447 (n=161, 예측 cycle 840~850 보다 ~600 cycle 늦음), 이후 cycle 1460 재입증 (Brier <1pp) 으로 upgrade 불필요 결론. TODOS.md vs CLAUDE.md drift 진단 methodology 는 유효 — historical archive 로 보존.

**Date**: 2026-05-21
**Cycle**: 835
**Chain**: operational-analysis (lite, 14d gap + alternation lock break)

## 발견

`TODOS.md` 의 "🎯 모델 v2.0 업그레이드 트래킹" 섹션이 **cycle 387 (2026-05-14)** 갱신 시점에서 정지. 현재 cycle 835 시점까지 **448 cycle / 약 7일 미갱신**. 반면 `CLAUDE.md` "예측 엔진 가중치" 섹션은 **cycle 775 (2026-05-19)** 갱신 권위.

### 권위 mismatch

| 지표 | TODOS.md (cycle 387) | CLAUDE.md (cycle 775) | drift |
|---|---|---|---|
| 검증 건수 | 99건 | 124건 (real n=94) | +25건 / +30% |
| 전체 적중률 | 49.5% | 47.6% / real 48.9% | -1.9pp / +0.4pp |
| Brier | 0.2587 | v1.8 0.2241 | (v1.5/v1.6/v1.7 미측정 carry) |
| v1.8 라벨 | 60% (5건, quant-only fallback) | 43.3% (30건, credit-fail 22 + real-debate 8) | 5→30건 / gap +9.1pp |
| v1.6 라벨 | 37.0% (46건, anomaly) | 37.0% (46건, anomaly) | 동일 |
| v1.7-revert | 53.1% (32건) | 53.1% (32건) | 동일 |
| v1.5 | 75% (16건) | 75.0% (16건) | 동일 |

### 임계 mismatch

- TODOS.md: "예측 건수 100건 임계 도달 시 v2.0 확정"
- CLAUDE.md: "v2.0 임계 n=150 까지 26건 부족"
- 실제 권위 = **n=150** (CLAUDE.md cycle 775). TODOS.md 100건 임계는 stale.

## 원인

- TODOS.md 갱신 책임자 부재 — cycle-retro dispatch 자체는 commit history 박제하지만 TODOS.md 의 단일 metric 섹션 자동 sync X
- CLAUDE.md 는 `policy:` retro commit + sweep N 박제 통해 자연 갱신 (cycle 651/775/799/803/810/815/817/822/825/827/828/829/830/831/832/833 등)
- 결과 = TODOS.md 가 비공식 stale snapshot, CLAUDE.md 가 권위 source

## 대응

1. **본 cycle = lesson 박제만** (operational-analysis lite scope, 신규 코드 X)
2. **다음 cycle 후보** = `review-code (heavy)` sweep — TODOS.md "🎯 모델 v2.0 업그레이드 트래킹" 섹션 CLAUDE.md cycle 775 권위와 sync
   - n=99 → n=124 (real n=94)
   - 100건 임계 → 150건 임계
   - v1.8 5건 → 30건 (credit-fail 22 + real-debate 8)
   - 전체 적중률 49.5% → 47.6% / real 48.9%
3. **메타 lesson** — TODOS.md "Resolved Lessons" / "🎯 트래킹" 섹션 자체가 silent drift family (사례 11+1, "운영 문서 vs 코드 권위 silent drift"). 사례 3/4/6/7/8/9/10/11 운영 코드/인프라 silent drift family 와 다른 layer = 운영 문서 silent stale drift. cycle-retro dispatch 자동 sync 채널 부재 = 구조적 약점.

## 측정 결과 — v2.0 임계 진척 (CLAUDE.md cycle 775 기준)

- n=124 / 150 → **82.7% 진척 / 26건 부족**
- credit 복구 (5/16) 이후 v1.8 real-debate 8건 누적
- credit-fail 22건 (cycle 775 시점, 5/13~5/19 fallback 기간) → 향후 누적 차단 (PR #372 family fix 작동)
- 직전 cycle 775 시점 측정 후 **6일 경과** = 새 신선 데이터 누적 가능 (KBO 시즌 active, 매일 5경기)
- 26건 부족 → 일평균 5경기 × 6일 = **약 30 게임 누적 = n=150 임계 도달 직전**

## v2.0 가중치 후보 (CLAUDE.md 기준, cycle 231 측정)

| 팩터 | 현재 (v1.8) | v2.0 후보 | Δ |
|---|---|---|---|
| elo | 10% | 13% | +0.30 (최강) |
| bullpen_fip | 10% | 14% | +0.26 |
| recent_form | 10% | 13% | +0.20 |
| lineup_woba | 15% | 12% | +0.06 |
| sp_fip | 15% | 8% | -0.15 |
| war | 8% | 5% | -0.12 |
| head_to_head | 3% | 3% | (이미 cycle 335 v1.8 적용) |
| park_factor | 4% | 2% | -0.15 |
| sp_xfip | 5% | 3% | -0.15 |
| sfr | 5% | 5% | 중립 (재검토 필요) |

n=150 임계 도달 즉시 v2.0 backtest harness 실행 → bootstrap CI 측정 → Brier diff 평가 → 가중치 확정. 임계 미달 시점에 op-analysis heavy 실행은 표본 부족 risk.

## 다음 op-analysis trigger

- **즉시 (cycle 836+)**: review-code (heavy) — TODOS.md sync
- **n=150 도달 시 (예상 cycle 840~850)**: operational-analysis (heavy) — v2.0 backtest harness 실행
- **30-cycle 주기 보정 (cycle 860 도달)**: operational-analysis (lite) 자동 fire trigger

## 메타 — silent stale drift family layer 박제

| Layer | 사례 | 박제 |
|---|---|---|
| 운영 코드 silent | 사례 3 (model_version overflow) / 4 (homeCode 반쪽) / 6 (Sentry server) / 7 (KBO API 필드) / 11 (predict_final window_too_late) | CLAUDE.md 드리프트 사례 |
| 운영 인프라 silent | 사례 8 (KBO Referer) / 9 (vercel CLI .gitignore) | CLAUDE.md 드리프트 사례 |
| 빌드 시스템 silent | 사례 10 (twitter-image runtime re-export) | CLAUDE.md 드리프트 사례 |
| **운영 문서 silent stale** (신규) | **cycle 835 = TODOS.md cycle 387 stale 448 cycle** | **본 lesson** |

운영 문서 stale drift = 사용자 가시 metric loss 없음 BUT 다음 plan/decision 작성 시 잘못된 baseline 인용 risk. cycle-retro dispatch 자동 sync 채널 박제 = 후속 chain-evolution 후보 (memory: subtype=chain-evolution, "todos-md-sync" chain spec — 매 cycle-retro 끝에 TODOS.md "🎯 트래킹" 섹션 diff 자동 박제 또는 권위 source 단일화).
