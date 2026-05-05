# cycle 56 — sfr/h2h systematic bias 가중치 재배분 spec (carry-over)

**작성**: 2026-05-05 (cycle 56)
**chain**: explore-idea (lite — spec only)
**상태**: 박제만, 구현 보류 (cycle 57+ backtest 실행 후 결정)
**근거 cycle**: 52 (정량 anti-signal) + 21 (backtest vs prod 78× 격차)

---

## 1. 컨텍스트 — 두 데이터의 충돌

### 1-A. 운영 측정 (cycle 52, 2026-05-05 박제, prod DB REST 직접 query)

표본: 30일 (2026-04-05~05-05), pre_game / model=v2.0-debate, **N=62 verified**

| factor | error_count | avg_bias |
|---|---:|---:|
| recent_form | 56 | -0.058 |
| **sfr** | 45 | **-0.233** ⚠️ |
| **head_to_head** | 40 | **-0.161** ⚠️ |
| bullpen_fip | 30 | 0.011 |
| sp_fip | 22 | -0.019 |

- 30일 적중률 **47%** (29/62) = coin flip -3.2%p
- confidence max = **0.680** (0.65+ bucket = 1.2%)
- v2.0-debate vs v1.5 baseline 부재 (carry-over H3)

### 1-B. Backtest 측정 (cycle 21 박제, `backtest-bootstrap-ci-run.ts:5-13`)

- backtest ΔBrier (manual v1.5 − v1.6) = **+0.00056** (~zero)
- prod ΔBrier (manual v1.5 − v1.6) = **+0.04160**
- 격차 **78×** + **정반대 방향**
- cycle 21 H1 = sample noise (가장 강한 후보)
- prod N=46 (cycle 17 박제) → cycle 52 N=62 (16건 추가)

### 1-C. v1.5 vs v1.6 역사 (`packages/shared/src/index.ts:90-99` 주석)

| 가중치 | sp_fip | sp_xfip | woba | bullpen | form | war | h2h | park | elo | sfr |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **v1.5 (현재)** | 15% | 5% | 15% | 10% | 10% | 8% | **5%** | 4% | 8% | **5%** |
| v1.6 (Wayback) | — | — | — | — | — | — | **0%** | **0%** | — | **0%** |

v1.6 = Wayback backtest 가 도출한 "h2h/park/sfr 제거" 모델. prod 적용 시 정반대 (worse) → v1.5 회귀. cycle 18+ "Wayback 신뢰성 재검토" carry-over.

### 1-D. 두 데이터의 충돌 정리

- **prod evidence (cycle 52)**: sfr/h2h 가 systematic underestimate. 가중치를 **줄이거나 제거** 방향
- **backtest evidence (cycle 21)**: backtest 자체가 prod 와 78× 격차 + 정반대 → backtest 결과 신뢰 자체가 낮음
- **공통 결론**: sfr/h2h 둘 다 운영에서 신호가 약하거나 잘못 잡힘 (방향 일치)
- **구분점**: 변경 방향은 같으나 "얼마나 줄일지" + "신뢰 가능한 검증 방법" 미정

---

## 2. 가설 (H1 carry-over)

> sfr/h2h 가중치 5% 가 prod 운영에서 systematic underestimate 를 만든다. 가중치 축소 또는 제거가 47% → 50%+ 으로 끌어올릴 수 있다.

**대안 가설 (검증 우선)**:
- **H1a (sample noise)**: cycle 21 결론 그대로. N=62 의 sfr/h2h bias 는 sample noise. 실제 가중치 영향 X
- **H1b (factor data quality)**: sfr/h2h **데이터 자체** quality 문제 (Fancy Stats SFR / KBO 공식 h2h 5경기). 가중치 X factor 입력 측정 정정
- **H1c (debate ensemble interaction)**: v2.0-debate (LLM judge) 가 sfr/h2h 를 underweight. v1.5 manual 만 그대로면 OK 가능

본 spec 은 **H1 우선 검증 + H1a/b/c 측정 가능한 데이터 함께 수집**.

---

## 3. v2.1 가중치 후보 (3개 — 검증용)

합계 = 0.85 (v1.5 동일 unchanged). HOME_ADVANTAGE 0.015 별도.

### 후보 A — 보수적 축소 (sfr/h2h 5% → 2%, 6% lineup_woba 강화)

| factor | weight |
|---|---:|
| sp_fip | 0.15 |
| sp_xfip | 0.05 |
| **lineup_woba** | **0.18** (+0.03) |
| bullpen_fip | 0.10 |
| recent_form | 0.13 (+0.03) |
| war | 0.08 |
| **head_to_head** | **0.02** (-0.03) |
| park_factor | 0.04 |
| elo | 0.08 |
| **sfr** | **0.02** (-0.03) |

방향: sfr/h2h 작은 신호 유지 + 강한 factor (lineup_woba / recent_form) 강화

### 후보 B — Wayback 부분 회귀 (sfr 0%, h2h 2%, park 4% 유지)

| factor | weight |
|---|---:|
| sp_fip | 0.16 (+0.01) |
| sp_xfip | 0.05 |
| lineup_woba | 0.17 (+0.02) |
| bullpen_fip | 0.11 (+0.01) |
| recent_form | 0.12 (+0.02) |
| war | 0.09 (+0.01) |
| **head_to_head** | **0.02** (-0.03) |
| park_factor | 0.04 |
| elo | 0.09 (+0.01) |
| **sfr** | **0.00** (-0.05) |

방향: cycle 52 가장 강한 anti-signal sfr 제거 + h2h 약화 + 분산 강화

### 후보 C — Pure Wayback 재시도 (h2h/park/sfr 0%, cycle 18 carry-over)

| factor | weight |
|---|---:|
| sp_fip | 0.18 (+0.03) |
| sp_xfip | 0.06 (+0.01) |
| lineup_woba | 0.18 (+0.03) |
| bullpen_fip | 0.11 (+0.01) |
| recent_form | 0.12 (+0.02) |
| war | 0.10 (+0.02) |
| **head_to_head** | **0.00** (-0.05) |
| **park_factor** | **0.00** (-0.04) |
| elo | 0.10 (+0.02) |
| **sfr** | **0.00** (-0.05) |

방향: Wayback backtest 결론 그대로 적용. cycle 18 carry-over "Wayback 신뢰성 재검토" 재시험

---

## 4. 검증 plan (cycle 57+ 분배)

### Step 1 — backtest harness 직접 실행 (cycle 57 후보, review-code chain)

3 후보 (A/B/C) 가중치 별도로 적용해서 기존 harness 5개 실행:

```bash
cd apps/moneyball && set -a && source .env.local && set +a
tsx ../../packages/kbo-data/src/pipeline/backtest-manual-weights-run.ts        # v1.5/v1.6/A/B/C 비교
tsx ../../packages/kbo-data/src/pipeline/backtest-bootstrap-ci-run.ts          # 95% CI ΔBrier
tsx ../../packages/kbo-data/src/pipeline/backtest-grid-run.ts                  # kElo/kForm/kH2h/kPark/kSfr grid
tsx ../../packages/kbo-data/src/pipeline/backtest-wayback-run.ts               # rolling window
tsx ../../packages/kbo-data/src/pipeline/backtest-logistic-run.ts              # logistic 비교
```

**측정 지표**:
- Brier (낮을수록 좋음)
- LogLoss
- Accuracy (적중률)
- Bootstrap 95% CI ΔBrier

### Step 2 — prod 30일 N=62 sfr/h2h bias bootstrap CI (cycle 57 같은 cycle)

cycle 52 의 sfr -0.233 / h2h -0.161 측정에 bootstrap (B=1000) 적용:

- 95% CI 가 0 포함 → H1a (sample noise) 후보 강화 → 변경 보류
- 95% CI 가 0 배제 → H1 (systematic) 강화 → 후보 A 또는 B 적용 가능

### Step 3 — 결정 기준 (cycle 58+)

| 시나리오 | 결정 |
|---|---|
| backtest 후보 A < v1.5 (Brier) AND prod CI 0 배제 | **후보 A 적용** (PR + DEFAULT_WEIGHTS 변경) |
| backtest 후보 B < v1.5 AND prod CI 0 배제 | **후보 B 적용** |
| backtest 후보 C ≥ cycle 21 결과 (격차 78× 그대로) | C 후보 폐기 (v1.6 재현) |
| backtest 모든 후보 ≈ v1.5 AND prod CI 0 포함 | **H1a 확정 (sample noise)** → 가중치 유지 + cycle 52 lesson "이 영역 cleanup" 박제 종결 |
| backtest 후보 A 또는 B 우월 BUT prod CI 0 포함 | shadow A/B 인프라 후보 (cycle 60+) — DB schema 변경 + 14일 측정 |

### Step 4 — shadow A/B 인프라 (cycle 60+, 옵션, 별도 spec)

조건부. Step 3 가 결정 불가 시만. predictions 테이블 `model_version` 컬럼 (이미 VARCHAR(20)) 활용:

- v2.0-debate 와 v2.1-A 같은 game 에 두 prediction 생성 (parallel)
- 14일 N≥30 까지 shadow 측정
- 두 prediction Brier 비교 + bootstrap CI

별도 spec 후보 (cycle 60+ explore-idea).

---

## 5. 결정 기준 — 데이터로만 (R8)

**적용 조건 모두 충족 시만 PR ship**:

1. backtest harness 5개 모두에서 후보 X 가 v1.5 보다 우월 (Brier 낮음, 통계적 유의)
2. prod 30일 N=62 의 sfr/h2h bias 95% CI 가 0 배제
3. 후보 X 의 backtest ΔBrier 95% CI 가 prod 47% → 변경 후 50%+ 환산 범위 포함

위 3개 중 1개라도 X = **변경 보류 + 박제만**.

직관·"그럴듯함" 0회. backtest 만 보고 변경 X (cycle 21 78× 격차 박제). prod 만 보고 변경 X (sample noise 위험).

---

## 6. 위험 평가

| 위험 | 측정 | 대응 |
|---|---|---|
| 변경 후 47% → <45% 추가 악화 | cycle 21 격차 78× 박제 = backtest 신뢰 낮음 | Step 3 결정 기준 3개 모두 충족 시만 적용 |
| sfr/h2h 데이터 quality 문제 (가중치 무관) | H1b 가설. 입력 정정 우선 | 별도 cycle (review-code chain) — `kbo-fancy.ts` SFR scrape 재검증 / `kbo-data` h2h 5경기 표본 변경 |
| v2.0-debate LLM judge 가 sfr/h2h underweight | H1c 가설 | judge prompt 재검토 (별도 cycle) |
| 가중치 변경이 다른 factor (lineup_woba +3pp) 의 over-fit | grid search + bootstrap CI 로 차단 | Step 1 5 harness 모두 실행 |
| 30일 N=62 → 90일 N≈180 시 시즌 mid distribution shift | Wayback rolling window | Step 1 wayback-run 시즌별 분리 측정 |

---

## 7. 본 cycle 56 outcome — partial

**박제 (이 spec)**: 1 file (118+ 줄)
**구현**: 0 (의도적 — backtest 실행 우선)
**다음 cycle**: 57 = review-code chain (backtest harness 5개 직접 실행 + 결과 박제)
**chain stop 조건**: spec 박제 = explore-idea chain stop 조건 1번 ("spec/plan 박제 또는 사용자 reject") 충족

---

## 8. carry-over (다음 cycle 들 분배)

### cycle 57 후보 — review-code (lite, backtest 실행)

- 5 backtest harness 실행 + 결과 박제 (Brier / LogLoss / Acc / Bootstrap CI)
- prod sfr/h2h bias bootstrap CI 측정
- 결과 보고 cycle 58+ 결정

### cycle 58+ 후보 — explore-idea 또는 fix-incident

- Step 3 결정 기준 충족 시: PR `fix(model): cycle 58 — sfr/h2h 가중치 재배분 v2.1` (DEFAULT_WEIGHTS 변경)
- 결정 기준 미충족 시: 가중치 유지 + cycle 52 lesson 종결 박제 (H1a sample noise 확정)
- shadow A/B 인프라 필요 시: 별도 spec (cycle 60+)

### cycle 52 H2/H3 carry-over (본 spec 외 영역)

- **H2 (confidence 압축, max=0.680 = agent ensemble 합의 부재)**: agent debate reasoning 분기 다양성 측정 → 별도 cycle (operational-analysis)
- **H3 (v2.0-debate vs v1.5 baseline 부재)**: v1.5 manual 가중합 prediction 50일 backfill 후 v2.0 vs v1.5 ΔBrier 측정 → 별도 cycle (review-code 또는 별도 spec)

---

## 9. 본 spec 의 R5 / R8 적용

- **R5 (체크포인트 주장 검증)**: 본 spec 의 cycle 21 인용 (78× 격차) + cycle 52 인용 (sfr -0.233 / h2h -0.161) 모두 git history + DB query 박제 검증 가능
- **R8 (데이터로만 이야기)**: 모든 가중치 후보 (A/B/C) 의 우월성 주장은 backtest harness 5개 + bootstrap CI 측정 결과로만 결정. 직관 0회

---

## 10. 본 spec 폐기 조건

- cycle 57 backtest 실행 결과 모든 후보 (A/B/C) 가 v1.5 보다 동등하거나 열등
- prod 30일 N=62 sfr/h2h bias 95% CI 가 0 포함 (sample noise 확정)
- cycle 60+ 시점 prod N≥120 (60일) 추가 측정에서도 sfr/h2h bias avg_bias < 0.05 (systematic 신호 약화)

위 조건 1+ 충족 시 본 spec 폐기 + cycle 52 lesson 종결 박제 (H1a sample noise 확정 lesson).
