# H1 Bootstrap CI 검증 — Cycle 22

**cycle**: 22
**chain**: explore-idea (lite + 코드)
**series**: 5 of 50 (사용자 manual `/develop-cycle 46`)
**started**: 2026-05-04 KST 12:30 / **ended**: 12:55
**status**: H1 폐기 → H2 (look-ahead bias) 다음 후보 박제

## 1. 진단 input (cycle 21 carry-over)

cycle 21 spec `2026-05-04-h4-manual-vs-logistic-cycle21.md` §3.2 cycle 22 1순위:

> H1 bootstrap CI (B=1000) 측정 — backtest ΔBrier 95% CI 가 0 포함하는지 + prod ΔBrier (+0.0416) 와 비교. ~70줄 변형 스크립트.

**cycle 21 박제 결론**:
- backtest ΔBrier (Manual v1.5 - v1.6) = +0.00056
- prod ΔBrier (Manual v1.5 - v1.6) = +0.04160 (38pp acc 격차 환산)
- 78× + 부호 동일 (당시 unsigned ratio 표기, 본 cycle 시각화로 부호 동일 확인)

**cycle 21 retro 메타 의심**:
> cycle 17 회귀 결정의 정당성은 H4 가 아니라 H1/H2. H1 자체 (general sample noise) 는 검증 안 됐음 — bootstrap CI 측정이 cycle 22 1순위.

## 2. 검증 메커니즘

### 2.1 Bootstrap with replacement

Test set 2024 N=727 의 4 method (manual_v15, manual_v16, logistic_4f, logistic_7f) 점 예측을 미리 계산. B=1000 resample (Mulberry32 seed=42, deterministic) 마다 인덱스 with replacement 샘플링 후 Brier 재계산.

### 2.2 ΔBrier 95% CI

각 resample 의 (v15 Brier - v16 Brier), (v15 - log7) ΔBrier 분포에서 percentile [0.025, 0.975] 도출.

### 2.3 H1 시나리오 매핑

- prod ΔBrier (+0.0416) ∈ backtest 95% CI → **H1 강함** (sample noise 설명 가능)
- prod ΔBrier (+0.0416) > CI 상한 → **H1 약함** (sample noise 외 원인 = H2/H3 의심)

## 3. 결과

### 3.1 4 method Brier 95% CI

| Method | Point | 95% CI | Width |
|---|---|---|---|
| Manual v1.5 | 0.24940 | [0.24639, 0.25218] | 0.00579 |
| Manual v1.6 | 0.24885 | [0.24691, 0.25077] | 0.00387 |
| Logistic 4-feat | 0.24980 | [0.24690, 0.25229] | 0.00539 |
| Logistic 7-feat | 0.24661 | [0.24277, 0.25032] | 0.00755 |

### 3.2 ΔBrier 95% CI

| Comparison | Point | 95% CI | width |
|---|---|---|---|
| v15 - v16 | +0.00056 | [-0.00287, +0.00345] | 0.00632 |
| v15 - log7 | +0.00280 | [-0.00191, +0.00719] | 0.00910 |

### 3.3 H1 verdict

**시나리오 = H1 약함**:

- prod ΔBrier (+0.04160) > backtest CI 상한 (+0.00345) **12.1×** 초과
- backtest mean ratio: 82.5× (부호는 동일 = v15 가 v16 보다 약간 우수, magnitude 82× 격차)
- sample noise 만으론 prod 38pp 격차 설명 불가

### 3.4 메타 — backtest CI 가 0 포함

v15 - v16 95% CI = [-0.00287, +0.00345] 가 **0 포함** → backtest 안에선 v15 와 v16 차이 통계적으로 유의 X. 동시에 prod 차이 (+0.0416) 가 12× 초과 = backtest 와 prod 의 분리 결정적.

## 4. 결론 + 다음 후보

### 4.1 cycle 17 회귀 정당성 재정리

- ❌ H4 (모델 구조 mismatch): cycle 21 폐기
- ❌ H1 (sample noise): 본 cycle 폐기
- ✅ **H2 (look-ahead bias)**: 다음 가장 강한 후보 — Wayback test 가 시즌 말 stats 사용 (`fetchAllSeasonTeamStats`) → 4월 prod 환경 (시즌 초 누적 stats) 와 분포 다름. backtest 가 prod 환경 안 시뮬한 것 = magnitude mismatch 자연 설명
- ⚪ H3 (distribution shift 2024 → 2026): H2 와 분리 어려움. 같은 검증 path 안 묶음
- ⚪ H6 (lambda double-dip): cycle 21 박제 — best 4 lambda 모두 0.01 동일 → 영향 작음

### 4.2 cycle 23 1순위 후보

**H2 검증 = rolling stats backtest** — 각 경기 시점까지 누적 stats 만 사용 (롤링). 시즌 말 stats 의 오라클 효과 측정. 큰 작업 (2~3 cycles 분량) 이지만 cycle 21/22 가 H4/H1 청산했으므로 H2 가 다음 직접 후보.

대안: prod N≥100 도달 시 v1.5 운영 격차 trend 측정 (cycle 25, ground truth 시간 의존).

### 4.3 cycle 17 회귀 결정 final 정당성

cycle 17 (v1.6 → v1.5 회귀) 의 결정적 근거:
- 본 cycle (H1 폐기) + cycle 21 (H4 폐기) → backtest 안에선 v1.5/v1.6 동등
- Prod 격차 (+0.0416, 38pp acc) → backtest variance 의 12.1× 초과
- 결정적 = backtest 환경의 한계 (H2/H3) 가 prod 와 분리. cycle 17 회귀는 prod 우선 보수적 결정 = 정당.

## 5. 산출물

- 스크립트: `packages/kbo-data/src/pipeline/backtest-bootstrap-ci-run.ts` (220 줄)
- spec: 본 파일

## 6. carry-over

| 순위 | 후보 | chain | cycle |
|---|---|---|---|
| 1 | **H2 rolling stats backtest** (시즌 시작부터 누적 stats 만 사용) | explore-idea (큰 작업) | cycle 23~24 |
| 2 | prod N≥100 격차 trend (ground truth) | operational-analysis | cycle ~25 |
| 3 | sp_confirmation_log 1주 5 SQL (cycle 18 carry-over) | operational-analysis | cycle ~25 |
| 4 | H6 lambda double-dip 제거 (cycle 21 carry-over, 영향 작음) | review-code | cycle ~30 |
| 5 | scout-geeknews 봇 prompt 코드베이스 grep (cycle 19 carry-over, 허브 영역) | explore-idea | 별도 |
| 6 | postview prompt 빈 괄호 cosmetic (cycle 17 carry-over) | review-code | cycle ~30 |
