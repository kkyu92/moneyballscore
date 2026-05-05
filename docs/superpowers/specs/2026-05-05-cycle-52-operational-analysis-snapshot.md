# Cycle 52 — Operational Analysis Snapshot (2026-05-05)

## 메타

- **cycle_n**: 52
- **chain**: operational-analysis (lite)
- **trigger**: cycle 49 룰 (0회 chain 우선 검토) 매핑 자연 X (explore-idea / design-system / dimension-cycle 셋 trigger source 부재) → cycle 51 retro fallback 명시 = review-code / operational-analysis. operational-analysis 가 직전 1회 (lite, cycle 23) + **30 cycle 부재** + 본 사이트 본질 (예측 적중률) 영역 → 자율 1택
- **measured_at**: 2026-05-05 KST
- **prediction sample**: 30일 (2026-04-05~05-05), pre_game / model=v2.0-debate 80건 (verified 62건)

## R8 ("데이터로만 이야기") 측정 결과

### 적중률

| 기간 | total | verified | 적중 | 적중률 |
|---|---|---|---|---|
| 7일 | 30 | 25 | 9 | **36.0%** (단기 진폭) |
| 30일 | 80 | 62 | 29 | **46.8%** |

- 30일 47% = coin flip 50% **-3.2%p**
- 7일 36% = 단기 표본 진폭 (25건). 30일 47% 가 안정 신호
- model_version: v2.0-debate 단일 (30일 100% 점유 — v1.5 누적 0건 = 직접 비교 불가)

### Confidence 분포 (30일 80건)

| bucket | count | % |
|---|---|---|
| <0.50 | 15 | 18.8% |
| 0.50-0.55 | 30 | 37.5% |
| 0.55-0.60 | 24 | 30.0% |
| 0.60-0.65 | 10 | 12.5% |
| 0.65-0.70 | 1 | 1.2% |
| 0.70+ | 0 | 0.0% |

- mean=0.513 / median=0.520 / stdev=0.104 / min=0.104 / max=0.680
- **0.65+ bucket = 1.2% (1/80)** — 자신감 prediction 부재
- judge-agent 0.15~0.85 clamp 가 0.65+ rare 만드는 게 아님 — 실제 max=0.680 = 자연 분포로도 자신감 형성 X
- 모델이 거의 항상 toss-up (0.50-0.60 bucket = 67.5%)

### Calibration mismatch

| confidence bucket | 적중률 | 표본 |
|---|---|---|
| <0.55 | 40.0% | 14/35 |
| 0.55-0.65 | 55.6% | 15/27 |

- <0.55 bucket = uncertain 영역 → 50% 가까이여야 정상 calibration. **40% = systematically 틀림** (anti-signal)
- 0.55-0.65 = slight signal. 단 표본 작음

### Factor error analysis (factor_error_summary)

| factor | error_count | avg_bias |
|---|---|---|
| recent_form | 56 | -0.058 |
| **sfr** | **45** | **-0.233** ⚠️ |
| **head_to_head** | **40** | **-0.161** ⚠️ |
| bullpen_fip | 30 | 0.011 |
| sp_fip | 22 | -0.019 |
| lineup_woba | 3 | 0.004 |
| sp_xfip | 3 | -0.066 |
| war | 2 | 0.000 |

- **sfr (수비) avg_bias -0.233** = 가장 큰 systematic underestimate. 45회 error 누적
- **head_to_head avg_bias -0.161** = 두 번째 systematic bias
- recent_form = 가장 빈번 (56회) 이지만 bias 작음 (-0.058) = noise 위주
- bullpen_fip / sp_fip / lineup_woba / war = bias 거의 0 = unbiased estimator

### 운영 안정성 metric

- pipeline_runs 7일: **115건 모두 status=success** (announce 8 / predict 94 / predict_final 7 / verify 6) — CF Worker 운영 안정
- postview (post_game) 7일 30건 = pre_game 30건과 1:1 — v4-3 자동 트리거 정상
- agent_memories 누적 66건 (weakness 26 / strength 20 / matchup 20)
- sp_confirmation_log 누적 910건 (KBO 455 + Naver 455 = 1:1 paired log)

## hypothesis

### H1: sfr+h2h 두 팩터 systematic bias correction 필요

- 두 팩터 모두 avg_bias 음수 + |bias| ≥ 0.16 = systematic underestimate
- 가중치 (sfr 5% / h2h 5%) 자체보다 **factor 값 정규화** 또는 **bias offset** 가능성
- 검증 path: backtest harness 로 sfr/h2h 가중치 재조정 (예: sfr 5%→3% / h2h 5%→3% / recent_form +4% bullpen_fip +2%) 시뮬레이션 vs 30일 실데이터 비교

### H2: confidence 압축 = ensemble agent 합의 부재

- judge-agent 0.15~0.85 clamp 의 실제 효과 X (max=0.680)
- 홈/원정 agent 양쪽 비슷한 argument 생성 → judge 가 50/50 toss 으로 결론 = 자연 압축
- 검증 path: agent_memories 의 weakness 박제 패턴 분석 + judge reasoning JSON 의 분기 다양성 측정

### H3: 30일 47% 적중률 = v2.0-debate 정량 + 토론 vs v1.5 정량 only 효과 측정 부재

- v1.5 누적 0건 → 직접 비교 불가
- backtest harness 로 동일 30일 표본을 v1.5 가중치로 백캐스트 → 적중률 비교 가능
- E5 backtest harness (`scripts/backtest.ts`) 활용 후보

## 다음 사이클 후속 (carry-over)

- **cycle 53 후보 chain**: review-code (가중치 reset 검토) 또는 backtest 실행 (operational-analysis 확장)
- 본 measurement 박제 = lesson 박제 + factor_error_summary top 3 (sfr / h2h / recent_form) 박제 = 다음 cycle 진단 source
- agent_memories isoformat 에러 수정 carry-over (snapshot query 의 정정만)

## R5 검증

- isolated 측정 X. 본 cycle = REST API 직접 query → 실제 prod DB 30일 표본
- N=80 (verified 62) = 단기 진폭 차단 표본 충분 (30일)
- 단일 model version v2.0-debate 한정 = 비교 baseline 부재 (carry-over H3)

## 본 사이클 dispatch

- **lesson commit** (`lesson:`): cycle 52 operational metric 박제 — 30일 47% 적중률 + sfr/h2h bias + confidence 압축
- **retro commit** (`policy:` subtype=cycle-retro): chain=operational-analysis(lite) outcome=success
- meta-pattern X (5+ 누적 신호 부재)
- chain-evolution X (신규 chain 후보 부재)

## 비용

- Claude API 호출 0회 (정적 query 만)
- Supabase REST API 6 query (~1초)
- 본 cycle = lite (PR 1 + 2 commit)
