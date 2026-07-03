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

5. **원인 가설** (추정, 후속 조사 필요):
   - a. 가중치 normalize/clip 로직에 최근 데이터 특성이 confidence spread 축소 유발
   - b. 미드시즌 팀 밸런싱 (7월 초 = ASG 전후) 실측 equilibrium
   - c. 개별 factor input 이 shrinkage (예: ELO 편차 감소, wOBA/FIP 팀간 격차 축소)
   - d. 특정 코드 변경 (2026-06-12 부근 commit) 에 의한 side effect

## R8 사용자 결정 근거

- **v1.8 유지 옵션**: acc 67% 유지되므로 winner 판정은 개선. Brier 는 나빠졌지만 사용자 가시 layer (승부예측) 는 acc 로 판단 시 문제 X.
- **v2.0 rebalance 옵션**: confidence spread 회복이 우선순위 — 단순 가중치 재조정 만으로는 부족. spread 압축 원인 (가설 5.a-d) 파악 후 rebalance 해야 유효.
- **v2.1-B reject 확정**: cycle 1447 baseline (v2.1-B n=52 Brier 0.4635) 대비 v1.8 여전히 우월. reject 신호 유지.

**후속 조사 candidate** (사용자 결정 후):
- rolling window 재분석 (window=15 로 좁혀 drift 시점 정밀 pinpoint)
- 2026-06-10 ~ 2026-06-14 사이 commit sweep (predictor / weight / factor 관련 diff)
- 개별 factor 별 pre/post 편차 측정 (ELO / wOBA / FIP)

---

자동 생성 — op-analysis (heavy) Brier drift 원인 분석. R8 사용자 결정 (v2.0 rebalance / v1.8 유지 / v2.1-B reject) 근거 evidence.