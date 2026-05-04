# H4 검증 — Manual 가중합 vs Logistic 학습 모델 비교

**Cycle**: 21 (사용자 N=47 시리즈 1/47)
**Chain**: explore-idea (lite, 코드 + spec — cycle 18/20 패턴 확장)
**Date**: 2026-05-04
**Branch**: `develop-cycle/h4-manual-vs-logistic-cycle21`
**Carry-over from**: cycle 20 spec §3.2 cycle 21 1순위 actionable
**Spec**: `docs/superpowers/specs/2026-05-04-wayback-backtest-reliability-cycle20.md` H4

---

## 1. 가설 H4 — 모델 구조 mismatch

cycle 20 spec 의 6 메타 가설 중 H4:

> backtest = `trainLogistic()` learned weights (coef, intercept).
> prod = `DEFAULT_WEIGHTS` × feature 단순 가중합 + sigmoid.
>
> 같은 feature 라도:
> - logistic 은 feature 간 상호작용을 학습
> - 가중합 manual 은 가산적 (additive). 상호작용 없음.
>
> backtest 가 logistic 으로 sfr null-like 라고 결정 → 가중합 manual 에서도 null-like 라고 가정한 게 맞나? sfr 이 다른 feature 와 상호작용으로 가산적 모델에선 의미 있을 수 있음.

본 cycle = 위 가설을 직접 측정. **Wayback test set (2024) 에 manual 가중합 직접 적용**해서 logistic 학습 모델과 비교.

---

## 2. 구현 — `backtest-manual-weights-run.ts`

`packages/kbo-data/src/pipeline/backtest-manual-weights-run.ts` 신규 (220 줄).

### 2.1 흐름

1. wayback-run.ts 와 동일 fetch (Elo + Wayback season stats + games)
2. Train 2023 / Test 2024 split
3. **Manual 가중합 적용** (Test 2024) — predictor.ts 의 `normalize() × weight / FACTOR_TOTAL + HOME_ADV` 그대로
4. **Logistic 학습 대조군** (4-feature / 7-feature, best-λ ∈ {0, 0.001, 0.01, 0.1})
5. 4 모델 Brier / LogLoss / Accuracy 비교

### 2.2 Manual scoring 함수 (`predictor.ts` 와 동일)

```ts
function manualScore(f: GameFeatures, weights: Record<string, number>): number {
  const factors = computeFactors(f);
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  let weightedSum = 0;
  for (const [key, w] of Object.entries(weights)) {
    weightedSum += (factors[key] ?? 0.5) * w;
  }
  let prob = weightedSum / weightSum + HOME_ADVANTAGE;
  return Math.max(0.15, Math.min(0.85, prob));
}
```

### 2.3 v1.5 / v1.6 두 가중치 비교

| Weight | v1.5 (현재 prod) | v1.6 (Wayback 학습) |
|---|---|---|
| sp_fip | 0.15 | 0.15 |
| sp_xfip | 0.05 | 0.05 |
| lineup_woba | 0.15 | 0.15 |
| bullpen_fip | 0.10 | 0.10 |
| recent_form | 0.10 | 0.10 |
| war | 0.08 | 0.08 |
| **head_to_head** | **0.05** | **0.00** |
| **park_factor** | **0.04** | **0.00** |
| elo | 0.08 | 0.08 |
| **sfr** | **0.05** | **0.00** |
| 합계 | 0.85 | 0.71 |

### 2.4 한계 — 매핑 불가 3 weight

GameFeatures 에 `sp_xfip` / `bullpen_fip` / `war` 없음 → manual 적용 시 0.5 (중립).

- 매핑 가능 weight 합 = 0.62 (sp_fip + lineup_woba + recent_form + h2h + park + elo + sfr)
- 매핑 불가 weight 합 = 0.23 (sp_xfip + bullpen_fip + war = 0.5 중립)

본 manual 모델 ≠ prod 100% 동일. **H4 의 핵심 질문 (가산모델 vs logistic 학습) 자체는 답할 수 있음** — 단 prod 정확 재현 필요시 wayback feature 인프라 확장 필요 (cycle 30+ 후속).

---

## 3. 결과 (Test 2024 N=727)

```
=== 결과 비교 (Test 2024 N=727) ===

  coin_flip(0.5)                Brier 0.25000  LogLoss 0.69315  Acc 51.44%
  Manual v1.5 (h2h/park/sfr ON) Brier 0.24940  LogLoss 0.69197  Acc 53.51%
  Manual v1.6 (h2h/park/sfr OFF) Brier 0.24885  LogLoss 0.69084  Acc 53.09%
  Logistic 4-feature            Brier 0.24980  LogLoss 0.69276  Acc 52.41%
  Logistic 7-feature            Brier 0.24661  LogLoss 0.68635  Acc 56.40%
```

### 3.1 판정 — 시나리오 D (H4 폐기)

- Manual v1.5 - v1.6 ΔBrier = **+0.00056** (v1.6 backtest 에서 미세 우수, |Δ| < 0.001 = noise)
- Manual v1.5 - Logistic 7f ΔBrier = **+0.00280** (Logistic 7f 가 manual 보다 미세 우수)

→ **시나리오 D**: backtest 안에선 모든 모델 (manual v1.5/v1.6, logistic 4/7) Brier 0.247~0.250 범위 — 차이 모두 0.005 이내. 가산모델 vs logistic 의 구조 mismatch 영향력 작음.

**H4 (모델 구조 mismatch) = 약함/폐기**.

### 3.2 진짜 시그널 — prod 38pp 격차가 backtest 에서 재현 안 됨

| 측정 | Manual v1.5 | Manual v1.6 | Δ |
|---|---|---|---|
| **Backtest** (N=727, 2024) | Brier 0.2494, Acc 53.51% | Brier 0.2489, Acc 53.09% | ΔBrier +0.0006 / ΔAcc -0.42pp (v1.6 미세 우수) |
| **Prod** (N=16/46, 2026-04~05) | Brier 0.2143, Acc 75.00% | Brier 0.2559, Acc 36.96% | ΔBrier +0.0416 / ΔAcc -38.04pp (v1.5 우수) |

**Backtest ΔBrier (+0.0006) vs Prod ΔBrier (+0.0416) = 78× 크기 차이 + 정반대 방향성**.

이 격차의 원인:
1. **Prod sample size 거대 variance** — N=16 acc=75%, N=46 acc=37%. 표준오차 σ_acc ≈ √(0.5×0.5/N) → σ(N=16) = 12.5pp, σ(N=46) = 7.4pp. 38pp 격차도 ±20pp CI 비중첩 사실 위험. **H1 (sample noise) 가장 강한 시그널**.
2. Backtest test acc 53.09% (v1.6) vs prod v1.6 acc 36.96% — **16pp 격차** = 시즌 말 stats 의 "오라클 효과" + 4월 prod 의 시즌 초 noise. **H2 (look-ahead bias) 강한 시그널**.

### 3.3 H4 폐기 의의

cycle 17 의 회귀 결정 (v1.6 → v1.5) 의 정당성은 **H4 가 아니라 H1/H2 에 있음** — prod sample 의 sample noise + 시즌 초 noise 가 결합되면 아무 모델이나 38pp 격차 가능. cycle 14 H3 (시즌 초 noise) 폐기는 4월 only N=62 격차 39.52pp 측정으로 진행됐지만 **H1 자체 (general sample noise) 는 검증 안 됐음** — bootstrap CI 측정이 본 spec 후속.

---

## 4. 본 cycle 의 한계 + 후속

### 4.1 한계

- 매핑 불가 3 weight (sp_xfip / bullpen_fip / war = 0.23) → prod 100% 재현 X
- Wayback Test 2024 N=727 단일 split → H5 (high variance) 그대로
- best-λ test set 자체 selection (H6 double-dip) 그대로

### 4.2 후속 (cycle 22+) — 본 결과 (시나리오 D) 반영

| 가설 | 검증 | 우선순위 | 추천 cycle |
|---|---|---|---|
| **H1 ΔBrier sample noise** | bootstrap (B=1000) CI 측정 — backtest 의 ΔBrier 95% CI 가 0 포함하는지 + prod ΔBrier (+0.0416) 와 비교 | **1** (본 결과로 가장 강함) | 22 review-code |
| **H2 look-ahead bias** | rolling stats fetch + 시점별 누적 stats backtest | 2 (16pp 격차 시그널) | 23~24 explore-idea (큰 작업 2 cycles) |
| **H5 single split** | 2024→2025 split 또는 k-fold cv (단 2025 wayback stats 미존재) | 3 (H1 다음) | 30+ explore-idea |
| H6 lambda double-dip | best() 제거 + lambda fix | 4 (4 lambda 모두 best 동일 0.01 → 영향 작음) | 25 review-code (lite) |
| H3 distribution shift | 2025 stats 적재 + 시즌별 mean/var 비교 | 5 (시간 의존) | 30+ operational-analysis |

### 4.3 prod ground truth (시간 의존)

cycle ~25 operational-analysis: prod N≥100 도달 시 v1.5 운영 격차 trend 측정. **본 결과 (backtest ΔBrier ≈ 0)** 와 prod ΔBrier (+0.0416) 의 격차가 N 증가에 따라 좁혀지는지 = H1 sample noise 직접 반증/확인.

### 4.4 권장 chain — H1 bootstrap CI (cycle 22)

50 줄 추가 — `backtest-wayback-run.ts` 또는 본 스크립트 변형:

```ts
function bootstrapCI(test_features, test_outcomes, model_v1, model_v2, B=1000) {
  const deltas = [];
  for (let b = 0; b < B; b++) {
    // resample with replacement
    const idx = Array.from({length: test_outcomes.length}, () => Math.floor(Math.random() * test_outcomes.length));
    const resample_features = idx.map(i => test_features[i]);
    const resample_outcomes = idx.map(i => test_outcomes[i]);
    const pred1 = resample_features.map(f => model_v1(f));
    const pred2 = resample_features.map(f => model_v2(f));
    const b1 = computeMetrics(pred1, resample_outcomes).brier;
    const b2 = computeMetrics(pred2, resample_outcomes).brier;
    deltas.push(b1 - b2);
  }
  deltas.sort();
  return {
    mean: deltas.reduce((a,b) => a+b, 0) / B,
    ci95: [deltas[Math.floor(0.025*B)], deltas[Math.floor(0.975*B)]]
  };
}
```

만약 95% CI 가 0 포함 → H1 강한 확정. backtest 의 ΔBrier 자체가 통계적으로 무의미 → prod 격차 의 원인 sample noise 가 가장 직접적.

---

## 5. cycle 21 retro 재정리 (회고)

본 cycle 가 `cycle_state.execution.outcome` 결정 후 `~/.develop-cycle/cycles/21.json` 박제. **retro.next_recommended_chain = `review-code`** (H1 bootstrap CI lite, ~70줄 변형 스크립트). 본 결과 시나리오 D = H1 sample noise 가 가장 강한 시그널 → cycle 22 우선.

chain tally 21 후 예상: explore-idea 4/21 = 19% (cycle 18/20/21 누적). 다양성 측면 polish-ui (2/21=10%) 또는 dimension-cycle (0/21=0%) 가 더 적지만 H1 actionable 의 직접성 우선.
