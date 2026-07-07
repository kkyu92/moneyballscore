# op-analysis heavy — Brier drift 원인 분석 (2026-07-03)

**scope**: v1.8 pre_game cohort n=161 chronological (verified_at asc).
**baseline**: cycle 1447 lite → Brier 0.2995 (n=161) vs 직전 n=118 Brier 0.2730 drift.

## overall

- n = 161
- accuracy = 60.9%
- Brier = 0.2995

## pre/post threshold split (n=118 baseline vs n=43 drift period)

| segment | n | acc | Brier | bootstrap 95% CI |
|---|---|---|---|---|
| pre (첫 118) | 118 | 58.5% | 0.2730 | [0.2439, 0.3023] |
| post (드리프트 43) | 43 | 67.4% | 0.3723 | [0.3198, 0.4257] |

**CI overlap**: NO — pre CI [0.2439, 0.3023] vs post CI [0.3198, 0.4257]. 통계 유의성 있음 (진짜 drift).

## rolling window Brier (window=30)

| idx | verified_at | window Brier |
|---|---|---|
| 30 | 2026-05-29 | 0.2465 |
| 36 | 2026-05-30 | 0.2297 |
| 42 | 2026-05-31 | 0.2503 |
| 48 | 2026-06-03 | 0.2412 |
| 54 | 2026-06-04 | 0.2255 |
| 60 | 2026-06-05 | 0.2261 |
| 66 | 2026-06-06 | 0.2300 |
| 72 | 2026-06-09 | 0.2375 |
| 78 | 2026-06-12 | 0.2653 |
| 84 | 2026-06-13 | 0.2653 |
| 90 | 2026-06-14 | 0.3037 |
| 96 | 2026-06-17 | 0.3167 |
| 102 | 2026-06-18 | 0.3300 |
| 108 | 2026-06-19 | 0.3300 |
| 114 | 2026-06-21 | 0.3433 |
| 120 | 2026-06-23 | 0.3300 |
| 126 | 2026-06-24 | 0.3433 |
| 132 | 2026-06-25 | 0.3433 |
| 138 | 2026-06-26 | 0.3567 |
| 144 | 2026-06-28 | 0.3433 |
| 150 | 2026-06-30 | 0.3700 |
| 156 | 2026-07-01 | 0.3480 |
| 161 | 2026-07-02 | 0.3747 |

## confidence tier subgroup (pre vs post)

| tier | pre n | pre acc | pre Brier | post n | post acc | post Brier | Brier Δ |
|---|---|---|---|---|---|---|---|
| low | 74 | 55.4% | 0.2970 | 41 | 70.7% | 0.3729 | +0.0760 |
| mid | 25 | 60.0% | 0.2420 | 1 | 0.0% | 0.3364 | +0.0944 |
| high | 19 | 68.4% | 0.2204 | 1 | 0.0% | 0.3844 | +0.1640 |

## marginal Brier (drift period only)

- marginal Brier (post 43 게임 단독) = 0.3723
- 대비 base Brier 0.2730 (pre 118 게임) — Δ 0.0994

## 핵심 발견 (findings)

1. **통계 유의성 있음** — pre/post 95% bootstrap CI 겹침 없음 ([0.2439, 0.3023] vs [0.3198, 0.4257]). 표본 노이즈 X, 진짜 drift.

2. **Rolling window 로 drift 시점 식별** — 2026-06-12 부근 (idx 78) 부터 window Brier 0.26 → 0.30+ 진입. 2026-06-14 (idx 90) 이후 0.30 이상 sustained.

3. **Confidence tier collapse** — post 43게임 중 **42건 (97.7%) 이 LOW tier (conf < 0.55)** 로 붕괴. pre 는 74/118=63% 만 low. mid+high+veryhigh 는 post 에 2건뿐 (pre 44건 → post 2건, -95%).

4. **Accuracy 상승 vs Brier 악화 역설** — post acc 67.4% (pre 58.5% 대비 +9pp) 인데 Brier 0.3723 (pre 0.2730 대비 +0.10). 모델이 winner 는 더 잘 맞추는데 confidence 는 near-coin-flip (~0.50) 로 압축 → Brier 계산 시 correct/wrong 무관 (conf-target)² ≈ 0.25 flat 근접. low tier Brier 0.3729 = 실측 conf 가 0.50 이상 (~0.55 근접) 이면 winner 잡을 때도 Brier 큰 값 유지.

5. **원인 확인 (cycle 1455 추가)** — CREDIT_EXHAUSTED.
   - 2026-06-12 ~ 현재: Anthropic API credits 소진 → debate_fallback_quant 경로.
   - DB 실측: `confidence=0.300` EXACT 값 전체 173 rows (pre 는 0.55~0.62 varied).
   - `debate.ts` fallback verdict: `{ homeWinProb: quantitativeProb, confidence: 0.3 }`.
   - `confidence=0.3` 은 LLM 미사용 marker. 실제 quant homeWinProb 은 0.467~0.547.
   - Brier 측정에서 `confidence=0.3` → `Math.max(0.5, 0.3)=0.5` → 모든 예측 Brier ≈ 0.25.
   - **모델 실력 문제 X**. API 크레딧 재충전 시 즉시 회복 예상.

## cycle 1455 코드 fix

### daily.ts `home_win_prob` 박제

```typescript
// 기존: home_win_prob 미박제 (KBO 항상 NULL)
// 변경: home_win_prob: finalHomeProb (quant/debate verdict prob)
```

- `resolveWinnerProb` 가 `home_win_prob != null` 시 우선 사용 → Brier 정확화.
- debate_fallback_quant 기간: finalHomeProb = quant prob (0.47~0.55) 반영.
- confidence=0.3 marker 유지 (CREDIT_EXHAUSTED 감지 채널 보존).

### 173 rows backfill 완료

`scripts/backfill-home-win-prob.ts --apply`:
- 173 rows: `home_win_prob = reasoning.homeWinProb` 업데이트.
- 이후 Brier 측정: quant homeWinProb 기반 (더 정확).

## R8 사용자 결정 근거 (업데이트)

> **⚠️ STALE — 본 섹션 recommendation 은 cycle 1460 결정 (v1.8 유지 확정) 으로 superseded. 아래 "cycle 1460 postmortem" 참조.**

- **v1.8 유지**: Brier drift = API 크레딧 소진 artifact. 크레딧 재충전 시 회복.
  acc 67.4% 상승은 실제 모델 성능 개선 신호 (quant model 이 정확도 유지 + 상승).
- ~~**v2.0 rebalance**: n=161 도달, threshold 충족. 단 현재 debate=0 상태에서
  v2.0 calibration 측정 불가. 크레딧 재충전 → 새 n=20+ 측정 후 결정 권장.~~ **← stale (cycle 1460: v2.0 rebalance 불필요 확정)**
- **v2.1-B reject 확정**: Brier 0.4635 vs v1.8 0.2730. reject 유지.

~~**사용자 action 필요 (최우선)**: Anthropic API credits 충전 (Plans & Billing).~~ **← stale (Fable plan S2c: CREDIT_EXHAUSTED 는 Brier drift 원인 X, 측정 오류가 원인. 크레딧 재충전 필요성 소멸)**
- ~~충전 후 즉시 정상 debate 재개 → confidence 분산 회복 → Brier 자연 회복.~~
- ~~충전 없이 v2.0 rebalance 측정 불가.~~

---

cycle 1454 자동 생성 + cycle 1455 root cause 확인 및 fix 박제.

## cycle 1460 postmortem — v1.8 유지 확정 (2026-07-06)

본 문서 R8 recommendation "Anthropic 크레딧 충전 후 v2.0 rebalance 측정 진행 권장" 은 **stale**. cycle 1460 plan #16 2차 fire (Fable plan) 결과 다음 확정:

- Brier DEFAULT 0.2443 vs Learned 0.2458 (expanding window OOS n=27→178) → 최대 차이 0.15% < 1pp 임계
- 사용자 가시 winner-centric Brier 0.3568 = **측정 오류** (Fable plan S2c evidence). home_win_prob 기반 Brier pre/post = 0.24/0.24 안정 = 실제 모델 정상
- **최종 결정**: v1.8 유지. 전면 가중치 재조정 불필요. v2.0 rebalance 착수 불필요.
- v2.1-B shadow (Brier 0.4635, n=52) reject 확정 유지.

본 분석 자체 (drift 통계 유의성 / rolling window / tier collapse / CREDIT_EXHAUSTED 원인) 은 historical evidence 로 유효. R8 권장 사항만 cycle 1460 결정 정합 갱신 (v2.0 rebalance 진행 X).