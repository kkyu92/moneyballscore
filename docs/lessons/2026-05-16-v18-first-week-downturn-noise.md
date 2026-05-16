# Pattern: v1.8 첫 주 하락 — n=15 noise 영역 vs 가중치 회귀 디커플링

**카테고리**: model_tuning / sample_size_discipline
**발견**: cycle 490 (2026-05-16), W22 op-analysis lite

---

## Observation

W22 (5/12~5/15) 검증 20건 중 6건 적중 = 30.0%. 직전 누적 49.5% (n=99) 대비 큰 하락. scoring_rule 분해:

| 버전 | 건수 | 적중 | 적중률 |
|---|---|---|---|
| v1.7-revert | 5 | 2 | 40.0% (5/12 transitional) |
| v1.8 | 15 | 4 | **26.7%** |

요일별:
- Tue 2/5 (40%) Wed 3/5 (60%) Thu 0/5 (0%) Fri 1/5 (20%)
- Thu+Fri = 1/10 (10%) — catastrophic 하지만 기존 누적 Thu 45.8% / Fri 57.1% 와 비교 시 단발 noise 가능성 높음

누적 갱신 (W22 4일 적용 후): n=109, 50/109 = 45.9%, Brier 0.2469.

## Problem

"v1.8 가중치 변경 (head_to_head 5→3% + elo 8→10%) 이 회귀 일으켰다" 빠른 결론 유혹. v1.7-revert n=32 53.1% vs v1.8 n=15 26.7% Δ=-26.4%p — 큰 차이지만 표본 크기 위계 무시.

n=15 binomial std error ≈ √(0.5*0.5/15) = 12.9%p. 95% CI = ±25%p. 26.7% ± 25% = [1.7%, 51.7%]. v1.7-revert 53.1% 가 v1.8 CI 상단 근접. 통계적 분리 X.

## Solution — n=15 noise 영역 disciplines

1. **가중치 변경 No-go gate**: scoring_rule 신규 fire 후 표본 n<30 시 가중치 추가 변경 X
2. **단발 요일 catastrophic 추적**: Thu 0/5 / Fri 1/5 = anomaly flag 만 박제. 다음 주 (W23) 동요일 데이터로 재측정. 2주 연속 < 30% 시 요일 성격 (선발 회전 / DH 패턴) 점검
3. **CHANGELOG W22 노트 갱신**: 직전 cycle 383 노트 = silent fallback 진단. 본 cycle = fallback fix 검증 + v1.8 첫 주 noise 측정. 두 단계 분리 박제

## Decision

- 가중치 유지 (head_to_head 3% / elo 10%)
- v2.0 임계 n=150 까지 41건 — W23~W24 추가 누적 후 재평가
- Sun cap (0.55 초과 시 0.45 강등) 효과 측정 보류 — Sun 표본 14건 (cycle 378 측정 대비 변동 X)

## Avoidance

- 단주 회귀 → 즉시 가중치 reset 함정. cycle 343 v1.8 가중치 결정 시 head_to_head Δ=+0.05 양의 신호 vs W20/W21 noise 디커플링 학습 재적용
- /accuracy 페이지에 단주 metric 노출 X (현재 모델 평균 / scoring_rule 누적만 노출 — UI 정책 유지)

## 박제 위치

- `CHANGELOG.md` W22 노트 두 번째 entry (cycle 490 추가)
- 본 lesson
- cycle 490 cycle_state.retro
