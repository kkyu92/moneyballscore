# Wayback 백테스트 신뢰성 메타 재검토

**Cycle**: 20 (사용자 N=48 시리즈 1/48)
**Chain**: explore-idea (lite — spec md 박제, 구현은 후속 cycles)
**Date**: 2026-05-04
**Branch**: `develop-cycle/wayback-backtest-reliability-cycle20`
**Carry-over from**: cycle 17/18/19 retro 1순위 3 사이클 연속

---

## 1. 진단 — Wayback 결론과 prod 결과가 정반대

### 1.1 Wayback backtest 결론 (`packages/shared/src/index.ts:75-93` 주석 박제)

```
2026-04-21 Wayback logistic 백테스트 (Train 2023 N=722 / Test 2024 N=727):
  wobaDiff*20   coef 0.548 z=2.10 ⭐ p<0.05 (유일 개별 유의)
  fipDiff/2     coef 0.301 z=0.72 borderline 양성 (방향 정확)
  sfrDiff/20    coef 0.101 z=0.37 null-like (CI [-0.44, 0.64])
  h2hShift      coef -0.009 z=-0.02 null-like (kH2h sweep monotone worsening)
  parkShift/10  coef -0.022 z=-0.13 null-like (CI [-0.34, 0.30])

조정: sfr/head_to_head/park_factor → 0 (null-like 3종 제거) = v1.6 가중치
한계: Test feature 7-feature Brier 0.24661 vs 4-feature 0.24980 (Δ-0.00319)
       coin_flip 0.25000 와 모두 거의 동일
```

→ v1.6 = **h2h/park/sfr 가중치 0%**.

### 1.2 Prod 결과 (cycle 14/16, N=62, 2026-04-22~05-03)

```
v1.5 (h2h 5% / park 4% / sfr 5%): N=16  acc=75.00%  Brier=0.2143
v1.6 (h2h 0% / park 0% / sfr 0%): N=46  acc=36.96%  Brier=0.2559
격차 38.04pp / CI95 비중첩 / Brier +0.0416 악화
```

cycle 16 4월 only N=62: 격차 39.52pp (시즌 초 noise 가설 H3 폐기).
cycle 15 LLM SYSTEM_PROMPT prompt constraint 적용 후에도 prod 격차 동일 (LLM 갭 가설 청산).

→ **Wayback 결론 (h2h/park/sfr null-like) 와 prod 결과 (h2h/park/sfr > 0 가중치가 38pp 우수) 가 정반대**.

### 1.3 cycle 17 회귀 결정의 메타 의심 두 줄

`packages/shared/src/index.ts:94-95` 주석:

> "1 시즌 train / 1 시즌 test 한계 + 시점 distribution shift 의심"

본 spec md = 위 두 줄을 **6 가설로 풀어쓰기 + 검증 path 정리**.

---

## 2. 메타 가설 6 — Wayback 결과 신뢰성을 깎는 후보들

### H1. ΔBrier 0.003 은 통계적 noise 안

7-feature Brier 0.24661 vs 4-feature 0.24980 = **Δ -0.00319**. coin_flip(0.5) Brier 0.25000.

- 7-feature 가 4-feature 보다 0.13% 우수, coin flip 보다 1.4% 우수.
- N=727 의 Brier 표준오차 추정: σ_Brier ≈ √(p(1-p)/N) ≈ √(0.25/727) ≈ 0.0186 → **|ΔBrier| 가 1σ 이내**.
- 즉 7-feature 가 4-feature 보다 우수하다고 결론 내릴 통계적 power 부족.

**검증 path**: `backtest-wayback-run.ts` 에 bootstrap (B=1000) 추가 → ΔBrier 의 95% CI 측정. CI 가 0 을 포함하면 H1 확정.

### H2. 시즌 말 stats 사용 = look-ahead bias

`fetchAllSeasonTeamStats([2023, 2024])` 가 시즌 말 누적 stats 을 모든 경기에 동일하게 사용.

- 4월 경기 prediction 시 사용한 wOBA/FIP/SFR = 9월 시즌 말 통계 (실제로 4월 시점엔 알 수 없음).
- 시즌 말 stats 은 그 팀의 실제 능력 수준을 더 정확히 반영 (큰 N) → "오라클 feature".
- **prod 4월 prediction = 4월 까지 누적 통계 (소 N, 시즌 초 noise)**. backtest 와 input 분포 다름.
- backtest 의 wOBA 유의미 (z=2.10) 는 "오라클 feature" 의 우수성. 4월 prod 의 wOBA 는 N=20~30 누적 → 신뢰도 낮음.

**검증 path**: `backtest-wayback-run.ts` 변형 — 각 경기 시점 까지 누적 stats 만 사용 (rolling). 4월 경기는 4월 까지 stats / 9월 경기는 9월 까지 stats. 이 새 backtest 의 wOBA 유의성이 z=2.10 → 작은 z 로 바뀌면 H2 확정.

### H3. Distribution shift 2024→2026

KBO 룰/볼/팀 ros 변화 가능성:
- 2024 → 2025 외국인 선수 교체 비율 (우리는 30%+ 추정 — 데이터 필요)
- 볼 반발 계수 조정 (KBO 매년 발표) — 2026 시즌 미지
- DH 룰, 비디오 판독 등 미세 변화

backtest 모델 = 2023 train / 2024 test 학습 가중치. 2026 prod 에 적용 시 distribution drift.

**검증 path**:
1. 2024 → 2025 rolling: 2025 시즌 stats 추가 후 2024 train + 2025 test 또는 2025 자체 backtest. v1.5 vs v1.6 가중치 적용 시 어느 게 우수한지 측정.
2. 시즌별 feature mean / variance 비교 (wOBA, FIP, SFR 의 league avg + std 가 시즌별 얼마나 변하는지).

### H4. Logistic regression vs 가중합 manual model — 모델 구조 mismatch

backtest = `trainLogistic()` learned weights (coef, intercept).
prod = `DEFAULT_WEIGHTS` × feature 단순 가중합 + sigmoid (또는 더 단순한 합).

같은 feature 라도:
- logistic 은 feature 간 상호작용을 학습 (특정 feature 가 다른 feature 와 함께 의미 있는 경우 높은 z 도 가능)
- 가중합 manual 은 가산적 (additive). 상호작용 없음.

backtest 가 logistic 으로 sfr null-like 라고 결정 → 가중합 manual 에서도 null-like 라고 가정한 게 맞나? sfr 이 다른 feature 와 상호작용으로 가산적 모델에선 의미 있을 수 있음.

**검증 path**: `backtest-wayback-run.ts` 의 학습 단계 제거. 대신 prod 의 DEFAULT_WEIGHTS (v1.5 / v1.6 두 시나리오) 직접 적용 → 2024 test 의 Brier 측정. 만약 v1.5 가중치 가 logistic 학습 가중치보다 우수하면 H4 확정.

이건 본 spec 의 가장 직접적 검증. cycle 21+ explore-idea 또는 review-code 의 backtest 확장 step.

### H5. N=727 single test set — train/test split 의 우연

Wayback split 한 번 (2023→2024). 2023→2025, 2024→2025 등 다른 split 결과가 있었으면 일관성 측정 가능. 단 한 split 의 결과로 가중치 결정 = high variance.

**검증 path**: rolling window 또는 k-fold cross validation. 가능한 split:
- 2023→2024 (현재)
- 2024→2025 (2025 stats 필요)
- 2023+2024 → 2025 (combined train)
- LOOCV (시즌 단위)

각 split 의 sfr/h2h/park coefficient + Brier delta 비교.

### H6. Backtest 가 "best-of-many" 모델 선택 후 결과 보고 = double-dipping

`backtest-wayback-run.ts:148-166` 의 `best()` 함수 — λ ∈ {0, 0.001, 0.01, 0.1} 4 lambda 중 test Brier 가장 작은 모델 선택.

- 정상 ML 의 hyperparameter 선택은 validation set (train 분할) 에서. test 는 final eval 만.
- 본 backtest 는 **test set 자체에서 lambda selection** → λ 선택이 test set 정보 누설.
- 4 후보 중 best 선택 → multiple comparison bias. Brier 0.24661 은 over-fit 가능성 배제 못함.

**검증 path**: lambda fix (0.01 default) 또는 train 의 k-fold cv 로 lambda 선택 후 test 단일 평가. Brier 가 더 나빠질 가능성.

---

## 3. 본 cycle 의 한계 — spec 만 박제, 구현 X

위 6 가설 모두 backtest-wayback-run.ts 변형 또는 신규 backtest 구현 필요. 본 cycle 20 = explore-idea (lite) 으로 spec md 단일 commit.

### 3.1 우선순위 (다음 cycle 후보)

| 가설 | 검증 비용 | 정보 가치 | 우선순위 | 추천 chain |
|---|---|---|---|---|
| H4 (logistic vs manual) | 낮음 (50줄 스크립트) | **매우 높음** — prod 모델 자체 평가 | 1 | review-code or explore-idea |
| H1 (ΔBrier noise) | 낮음 (bootstrap 추가) | 높음 — 결론 강도 측정 | 2 | review-code |
| H6 (lambda double-dip) | 낮음 (best() 제거) | 중 — over-fit 보강 | 3 | review-code |
| H2 (look-ahead bias) | 중 (rolling stats fetch 인프라) | **매우 높음** — prod 에 가까운 backtest | 4 | explore-idea |
| H3 (distribution shift) | 높음 (2025 stats 적재) | 중 — 시간 의존 | 5 | operational-analysis |
| H5 (single split) | 높음 (다중 split) | 중 — H1/H2/H4 후 결정 | 6 | explore-idea |

### 3.2 cycle 21 추천 actionable

**H4 검증 = 가장 직접적**. 50 줄 변형 스크립트:
```
backtest-manual-weights-run.ts  (신규)
  - 2024 test set fetch
  - DEFAULT_WEIGHTS 직접 적용 (v1.5 / v1.6 두 시나리오)
  - Brier / accuracy 측정
  - logistic Brier 와 비교
```

만약 v1.5 가중치가 2024 test 에서도 v1.6 보다 우수 → Wayback 결론은 logistic 모델 선택의 산물 = prod manual model 에 generalize 안 됨 = **H4 확정 + Wayback backtest 의존도 폐기**.

만약 v1.5 가중치가 2024 test 에서 v1.6 보다 열등 → 2024 vs 2026 distribution shift (H3) 또는 timing bias (H2) 가 prod 격차의 주 원인. Wayback 자체는 신뢰성 있음.

### 3.3 prod N≥100 직접 측정 의존도 상향

cycle 17 retro 4순위 carry-over: "v1.7-revert 1주 운영 검증 — N≥30 도달 시 v1.5 prod 75% 재확인". 본 spec 의 결론:

> Wayback backtest 신뢰성 메타 의심 6 가설 동안 **prod N 누적이 더 권위 있는 측정**. cycle 25+ operational-analysis 의 N≥100 측정 = backtest 신뢰성 평가의 ground truth.

prod 격차 (38pp) 가 N=62 에서 측정됨. N=100, N=200 시점 격차 trend 가:
- 격차 줄어들면 → small N noise 가능성 (cycle 14 H3 폐기 후 두 번째 noise 가설)
- 격차 유지/확대면 → backtest 6 가설 중 하나 (특히 H4) 확정 신호

---

## 4. cycle 21 진단 input (cycle 20 retro 박제)

본 cycle 의 산출 = 6 가설 list + 검증 path. cycle 21 의 진단이 본 spec 을 source 로 활용 시:

- chain 후보 1: **review-code** — H4 검증 스크립트 (50 줄) + Brier 비교 표 박제
- chain 후보 2: **review-code** — H1 bootstrap 추가 (`backtest-wayback-run.ts` 변형 50줄)
- chain 후보 3: **explore-idea** — H2 rolling stats backtest (큰 작업, 2~3 cycles)
- chain 후보 4: **operational-analysis** — prod N≥100 도달 시 격차 trend 측정 (시간 의존, cycle ~25)

cycle 21 의 chain 선택은 메인 자율. 본 spec 은 입력 source.

---

## 5. 메모리 박제 후보 (선택)

`feedback_backtest_reliability_meta.md` (신규):
- 룰: backtest 결과로 prod 가중치 결정 시 = 모델 구조 일치 + N 충분 + train/test distribution 일치 + multiple comparison 무 + bootstrap CI 명시 5 조건 모두 충족 후 행동
- Why: cycle 14 H3 폐기 + cycle 16 시즌 4월 격차 39.52pp + cycle 17 v1.5 회귀 — Wayback backtest 단일 결과 의존이 prod 38pp 손실의 직접 원인
- How to apply: 다음 backtest 결과 기반 가중치 변경 PR 작성 시 5 조건 체크리스트 명시. 미충족 항목 있으면 prod 직접 측정 N≥100 까지 보류.

본 메모리 박제는 본 cycle 20 PR 외 별도 commit 으로 분리 (R4 자율 commit 정책 — 사이클당 단일 PR 원칙 vs 메모리 별도 / 본 cycle 은 spec md 단일 PR 만).

---

## 6. 결론

cycle 17/18/19 retro 1순위 carry-over (Wayback 신뢰성 재검토) 본 cycle 20 에서 **6 메타 가설 + 검증 path 박제**로 청산. 진짜 검증은 cycle 21+ 의 backtest 변형 구현.

핵심 finding: **Wayback backtest 가 logistic regression 선택의 산물일 가능성** (H4) — prod manual 가중합 모델과 구조 mismatch. 검증 비용 낮음 (50 줄 스크립트). cycle 21 review-code 후보 1.

최종 권위 ground truth = prod N≥100 격차 trend (cycle ~25 operational-analysis). 본 spec 6 가설 중 어느 것이 prod 격차의 주 원인인지 판정.
