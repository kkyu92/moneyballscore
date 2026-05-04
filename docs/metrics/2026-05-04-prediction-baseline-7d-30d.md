# Prediction Baseline — 7d / 30d (2026-05-04)

**측정 시점**: 2026-05-04 KST (cycle 10, operational-analysis chain 첫 사용)
**대상 모델**: `v2.0-debate` (현 프로덕션 메인)
**source**: `predictions` 테이블 (verified rows only)

## 요약

| 윈도우 | n | 적중률 | avg conf | Brier | LogLoss-ish |
|---|---|---|---|---|---|
| 7d (4-27 ~ 5-03) | 25 | **36.0%** | 51.2% | **0.262** | n/a |
| 30d (4-04 ~ 5-03) | 62 | **46.8%** | 53.3% | **0.248** | n/a |

**Brier 기준선**: naive 50/50 = 0.250. v2.0-debate 30d **0.248** = 거의 동일 (margin 0.002). 7d **0.262** = 약간 worse than coin flip.

## 일별 분해 (직전 7일)

| 날짜 | n | correct | accuracy | Brier |
|---|---|---|---|---|
| 2026-04-28 | 5 | 1 | 20% | 0.260 |
| 2026-04-29 | (rainout/없음) | — | — | — |
| 2026-04-30 | 5 | 2 | 40% | 0.258 |
| 2026-05-01 | 5 | 3 | 60% | 0.240 |
| 2026-05-02 | 5 | 2 | 40% | 0.276 |
| 2026-05-03 | 5 | 1 | 20% | 0.273 |

## Calibration 버킷 (30d)

| Confidence 구간 | n | correct | hit rate |
|---|---|---|---|
| ≥ 0.60 (high) | 9 | 6 | **66.7%** |
| < 0.55 (low) | 35 | 14 | 40.0% |
| 0.55 ~ 0.60 | 18 | 9 | 50.0% |

**관찰**:
- High confidence (60%+) 칼리브레이션은 양호 — 모델이 commit 한 경우 hit rate 일치
- Low confidence (<55%) 가 30d 의 **56% (35/62)** 차지 — 모델이 자주 "잘 모르겠다" 영역
- Conservative bias: avg conf 53.3% < 50/50 baseline 의 hit rate 47%

## Findings

1. **30d Brier ≈ baseline**: v1.5 → v2.0-debate 업그레이드의 정량 ROI **불분명**. 코인 플립 대비 +0.002 Brier 개선 = noise 수준. v1.5 비교 데이터 부재 (model_version 분리 도입 시점 이후).
2. **7d regression 신호 약함**: 25 표본은 통계적으로 5경기 일별 noise 흡수 부족. 5-2 / 5-3 연속 부진은 small-sample 편향 가능.
3. **High-conf 영역 hit rate 우수**: 9 예측 6 적중 = 모델이 "확신할 때" 신뢰 가능. 단 9 표본도 small.
4. **Low-conf 비중 과다**: 30d 의 56% 가 <55% 확신 영역. 모델이 토론 후에도 결정 못 내리는 경기 많음.

## Implications (다음 사이클 후보)

- **[ ] 14일 누적 후 재측정** — n≈100 도달 시 Brier 신뢰도 향상. 다음 operational-analysis cycle trigger
- **[ ] v1.5 baseline 백테스트** — `scripts/backtest.ts` 활용. v2.0-debate 와 동일 30일 데이터에 v1.5 fallback 모델 적용 → ROI 정량 비교
- **[ ] Low-conf 영역 분석** — `<55%` 35건 의 chain (선발FIP / 타선wOBA / 불펜FIP) 분포. 어떤 팩터에서 확신 못 만드는지
- **[ ] factor-level attribution 활용** — `010_factor_error_view.sql` (이미 존재) 쿼리 → 가장 misleading 한 팩터 1순위 식별
- **[ ] calibration_buckets 테이블 활용** — `006_agent_memory_calibration.sql` 의 운영 버킷 비교 (이미 누적되었을 가능성)

## Trigger for Future Cycles

이 baseline 박제는 **단발 측정 X, trend 시작점**. 다음 operational-analysis cycle 은:
1. 본 파일 read → 7d/30d Brier 비교
2. 14d 또는 30d 재측정
3. 변화 +0.01 이상이면 lesson 박제 (regression 또는 improvement)

## 메타 — cycle 10 박제 가치

- chain pool 0/9 → 1/10 (operational-analysis 첫 사용)
- review-code 5/9 편중 회피 (다양성 보강)
- 자연 데이터 (sp_log + predictions) 활용 — 외부 도구 의존 X
- baseline 박제 = 다음 cycle 의 정량 input

## Raw Query

```bash
SUPABASE_URL/rest/v1/predictions
  ?select=is_correct,confidence,predicted_winner,actual_winner,model_version,created_at
  &created_at=gte.2026-04-04T00:00:00Z
  &verified_at=not.is.null
  &model_version=eq.v2.0-debate
```
