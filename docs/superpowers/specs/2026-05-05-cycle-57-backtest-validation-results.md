# cycle 57 — sfr/h2h 가중치 재배분 backtest validation 결과 (변경 보류)

**작성**: 2026-05-05 (cycle 57)
**chain**: operational-analysis (heavy — backtest harness 2개 + bootstrap CI)
**상태**: validation 부분 완료. 변경 보류 결정 (R8 결정 기준 1번 미충족).
**근거 spec**: cycle 56 (`2026-05-05-cycle-56-sfr-h2h-weight-rebalance.md`)

---

## 1. 본 cycle 진행 — cycle 56 spec section 4 step 1+2 부분

cycle 56 spec section 4 의 검증 plan 4 step 중 step 1 (backtest harness 실행) + step 2 (bootstrap CI) 부분 완료.

### 변경 코드

| 파일 | 변경 |
|---|---|
| `packages/kbo-data/src/pipeline/backtest-manual-weights-run.ts` | v2.1 후보 A/B/C 가중치 객체 + manualScore 적용 + verdict 라벨 fix |
| `packages/kbo-data/src/pipeline/backtest-bootstrap-ci-run.ts` | v2.1 후보 A/B/C bootstrap resample 추가 + ΔBrier CI 5쌍 출력 + 0배제 표시 |

### 실행 결과 — Wayback Test 2024 N=727

#### manual-weights (point Brier)

| 모델 | Brier | LogLoss | Acc |
|---|---:|---:|---:|
| coin_flip(0.5) | 0.25000 | 0.69315 | 51.44% |
| Manual v1.5 (현재) | 0.24940 | 0.69197 | 53.51% |
| Manual v1.6 | 0.24885 | 0.69084 | 53.09% |
| **Manual v2.1-A** (sfr/h2h 2%) | 0.24854 | 0.69023 | 52.96% |
| **Manual v2.1-B** (sfr 0/h2h 2) | **0.24830** ⭐ | 0.68975 | 52.82% |
| **Manual v2.1-C** (h2h/park/sfr 0) | 0.24885 | 0.69084 | 53.09% |
| Logistic 7-feature | 0.24661 | 0.68635 | 56.40% |

point Brier 만 보면 **v2.1-B 가 가장 낮음** (0.24830, v1.5 대비 -0.00110).

#### bootstrap-ci (B=1000, percentile 95% CI)

| ΔBrier (v15 - X) | point | 95% CI | 0 배제? |
|---|---:|---|---:|
| v15 - v16 | +0.00056 | [-0.00287, +0.00345] | ❌ 0 포함 |
| v15 - v2.1-A | +0.00086 | [-0.00112, +0.00266] | ❌ 0 포함 |
| v15 - v2.1-B | +0.00110 | [-0.00204, +0.00393] | ❌ 0 포함 |
| v15 - v2.1-C | +0.00056 | [-0.00287, +0.00346] | ❌ 0 포함 |
| v15 - log7 | +0.00280 | [-0.00191, +0.00719] | ❌ 0 포함 |

**모든 비교에서 ΔBrier 95% CI 가 0 포함** = 통계 유의 X.

---

## 2. cycle 56 spec section 5 (R8) 결정 기준 적용

| 기준 | 충족 여부 |
|---|---|
| 1. backtest harness 5개 모두 후보 X v1.5 보다 우월 (통계 유의) | ❌ 본 사이클 2 harness 만, 그마저 모두 ΔBrier CI 0 포함 |
| 2. prod 30일 N=62 sfr/h2h bias 95% CI 0 배제 | 미측정 (별도 사이클 carry-over) |
| 3. backtest ΔBrier 95% CI prod 47%→50%+ 환산 범위 포함 | ❌ backtest CI mean +0.00050, prod ΔBrier +0.04160 = 82.5× 격차. CI 가 prod 환산 범위 미포함 |

**1+1 라도 X = 변경 보류 + 박제만** (spec 본문 명시).

→ **결정**: v2.1 후보 적용 **보류**. DEFAULT_WEIGHTS v1.5 유지.

---

## 3. cycle 52 H1 의 H1a/H1b/H1c 후보 평가 갱신

### H1a (sample noise — backtest variance 안)

- **본 backtest** (N=727 + B=1000): v1.5 vs v2.1-B point ΔBrier +0.00110 / 95% CI [-0.00204, +0.00393]. CI 너비 = 0.00597 (point 의 5×).
- **prod ΔBrier** (cycle 17 박제 v1.5 vs v1.6 = +0.04160) 가 backtest CI 상한의 **12.1× 초과**.
- backtest CI mean (+0.00050) vs prod (+0.04160) **82.5× 격차** + 부호 동일.
- **H1a 강한 시그널**: backtest variance 만 보면 후보 차이 = sample noise level. prod 격차의 진짜 원인은 backtest variance 외 다른 source (H2/H3) 의심 강화.

### H1b (factor data quality)

본 사이클 미측정. cycle 56 spec section 6 표 참조 — 별도 cycle (review-code chain) `kbo-fancy.ts` SFR scrape 재검증 / `kbo-data` h2h 5경기 표본 변경.

### H1c (debate ensemble interaction)

본 사이클 미측정. v2.0-debate (LLM judge) 가 sfr/h2h underweight 가능성. judge prompt 재검토 별도 cycle.

---

## 4. cycle 21 격차 78× 박제 vs 본 사이클 82.5×

cycle 21: backtest ΔBrier (v1.5-v1.6) +0.00056 / prod +0.04160 = 78×

본 cycle 57: backtest CI mean (v15-v16) +0.00050 / prod +0.04160 = **82.5×**

→ 거의 동일 격차. cycle 21 결론 (sample noise + Wayback 신뢰성 낮음) 재확인.

prod variance 미반영 (prod N=46, cycle 17 시점). cycle 52 N=62 까지 누적했지만 ΔBrier 자체 재측정 X — 별도 사이클 carry-over.

---

## 5. carry-over (cycle 58+ 분배)

### 본 사이클 미진행 (cycle 56 spec section 4 step 2~4 중 일부)

| step | 항목 | carry-over |
|---|---|---|
| step 1 | 5 backtest harness 전부 | 본 사이클 2/5 (manual-weights / bootstrap-ci). 잔여 3/5 (grid / wayback / logistic) — 별도 사이클 |
| step 2 | prod 30일 N=62 sfr/h2h bias bootstrap CI | 미측정 — 별도 사이클 (operational-analysis chain) |
| step 3 | 결정 기준 표 (spec section 4) 5 시나리오 | step 1+2 완료 후 적용 가능 |
| step 4 | shadow A/B 인프라 (cycle 60+ 옵션) | step 3 가 결정 불가 시 (현재 step 3 으로 변경 보류 결정 가능) |

### 본 사이클 결정 = 변경 보류 → cycle 56 spec section 10 폐기 조건

| 폐기 조건 | 본 사이클 충족 여부 |
|---|---|
| cycle 57 backtest 결과 모든 후보 (A/B/C) v1.5 보다 동등/열등 | **부분 충족** — point Brier 는 모두 v1.5 보다 낮으나 95% CI 모두 0 포함 = 통계 유의 X (사실상 동등) |
| prod 30일 N=62 sfr/h2h bias 95% CI 0 포함 | 미측정 |
| cycle 60+ prod N≥120 추가 측정에서 sfr/h2h bias avg < 0.05 | 미측정 |

→ 본 cycle 57 만으론 spec 폐기 X. prod CI 측정 (별도 cycle) 결과 함께 봐야 최종 폐기 가능.

---

## 6. 본 cycle 57 outcome

- **chain**: operational-analysis (heavy)
- **outcome**: success (lesson 박제 = chain stop 조건 충족)
- **변경 ship**: backtest harness 2개 (코드만, 운영 영향 X) + lesson spec
- **결정**: DEFAULT_WEIGHTS v1.5 유지 (변경 보류)
- **R5/R8 적용**: backtest CI + bootstrap 측정 → 직관 0회, 데이터로만 결정 → R8 준수. 가짜 신뢰 차단 (point Brier 만 보고 변경 X — CI 측정 후 통계 유의 X 확인) → R5 준수

---

## 7. 다음 사이클 (cycle 58) 추천 chain

### 1순위 — operational-analysis (prod 30일 N=62 sfr/h2h bias bootstrap CI)

cycle 56 spec section 4 step 2. 본 사이클 미진행. prod CI 0 포함/배제 결과 따라 cycle 56 spec 폐기 (H1a 확정) 또는 H1b/H1c 별도 검증 진행.

### 2순위 — review-code (kbo-fancy.ts SFR scrape 재검증)

H1b 후보 검증. 데이터 quality 가 가중치 무관 원인일 가능성.

### 3순위 — fix-incident (잔여 GH issue 있을 시)

본 사이클 시점 open hub-dispatch issues 0건. 추가 발생 시 우선.

---

## 8. R5/R8 적용 박제

- **R5 (체크포인트 주장 검증)**: 본 spec 의 cycle 17 박제 (+0.04160 prod ΔBrier) + cycle 21 격차 78× + cycle 52 sfr -0.233 / h2h -0.161 모두 git history + DB query 가능. point Brier 만 보고 변경 X — bootstrap CI 측정 후 통계 유의 X 확인 = R5 가짜 신뢰 차단
- **R8 (데이터로만 이야기)**: 가중치 변경 결정은 backtest harness 2개 + bootstrap B=1000 CI 측정 결과로만 → 직관 0회. v2.1-B point Brier 가장 낮음 (0.24830) 발견했음에도 CI 0 포함 = 통계 유의 X 인지하고 변경 X
