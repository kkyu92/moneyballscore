# Pattern: W22 마감 Sat reversion — Thu/Fri 1/10 catastrophic noise 신호 강화

**카테고리**: model_tuning / sample_size_discipline
**발견**: cycle 516 (2026-05-17), W22 마감 op-analysis lite

---

## Observation

W22 (5/12~5/17) 추가 검증. cycle 490 baseline (5/12~5/15, n=20, 6/20 = 30%) → 5/16 Sat 5건 추가 verify → n=25, 9/25 = 36.0%.

| 일자 | 적중/n | % |
|---|---|---|
| Tue (5/12) | 2/5 | 40.0% |
| Wed (5/13) | 3/5 | 60.0% |
| Thu (5/14) | 0/5 | 0.0% |
| Fri (5/15) | 1/5 | 20.0% |
| **Sat (5/16)** | **3/5** | **60.0%** ← 신규 |
| Sun (5/17) | 0/0 | verify 대기 (cron 14 UTC = 23:00 KST) |

scoring_rule:
- v1.7-revert: 2/5 = 40.0% (변동 X, transitional 5/12 만)
- v1.8: 7/20 = 35.0% (cycle 490 4/15 = 26.7% → +8.3%p)

누적 갱신: n=109→114, 50/109 (45.9%) → 53/114 (46.5%), Brier 0.2469→0.2473.

## Problem

cycle 490 시점 박제: "Thu 0/5 + Fri 1/5 = 1/10 catastrophic — 기존 Thu 45.8% / Fri 57.1% 와 비교 단발 noise 가능성 높음". v1.8 26.7% n=15 binomial CI ±25%p — 통계적 분리 X 결론.

본 cycle 5/16 Sat 3/5 = 60% 추가 측정으로 noise 가설 강화:
- Sat 누적 (cycle 490 9/17 = 52.9%) → 12/22 = **54.5%** (안정)
- v1.8 적중률 26.7% → 35.0% (+8.3%p, n 15→20 만 추가)
- Mid-week 1/10 → 주말 첫날 3/5 정상 reversion

n=20 binomial CI: 35% ± 21.5%p = [13.5%, 56.5%]. v1.7-revert 53.1% 가 v1.8 CI 상단 안 들어옴. 여전히 통계적 분리 X.

## Solution

cycle 490 결정 강화:
1. **가중치 변경 No-go gate 유지**: scoring_rule 신규 fire 후 표본 n<30 시 변경 X
2. **단발 요일 catastrophic anomaly 재평가**: W22 Thu 0/5 / Fri 1/5 = 추가 측정 evidence 부재 (다음 주 Thu/Fri 측정 필요). Sat 5/16 reversion 가 같은 주 안 자연 회복 첫 신호
3. **v2.0 임계 n=150 까지 36건**: cycle 490 = 41건 잔여 → W22 추가 5건 → 36건. W23 (5/19~5/25) + W24 (5/26~6/1) 2주 후 도달 가능

## Decision

- 가중치 유지 (head_to_head 3% / elo 10%)
- W23 Sun cap (Sun 0.55 초과 시 0.45 강등) 효과 측정 보류 — Sun 표본 5/17 verify 후 cycle 517 재측정
- CHANGELOG.md W22 마감 노트 갱신

## Carry-over

- cycle 517 진단 단계: 5/17 Sun verify 완료 후 W22 최종 n=30 + Sun 5건 측정
- v2.0 임계 n=150 — W23~W24 2주 후 재평가 trigger
