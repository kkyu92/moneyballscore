# MLB Elo backtest 재확인 (plan #25 Phase 3 게이트, cycle 2561)

cycle 2128 (2026-08-14, n=747) 재확인 — 이후 11일 경과, 표본 149건 증가.

대상 경기: 896건 (final) / 재생 반영 895건 (skip 1건 — 올스타/무승부·스코어없음)
WARM cohort (양팀 10+ 경기 재생 후): 743건

## 전체 표본

- home win rate (실측): 53.0%
- Elo Brier: 0.2480 (bootstrap 95% CI [0.2452, 0.2509])
- 홈어드밴티지-only Brier (상수 0.530): 0.2491 (bootstrap 95% CI [0.2471, 0.2511])
- 동전던지기 Brier (0.5 상수): 0.2500
- Elo accuracy (favorite pick): 54.3%
- 홈어드밴티지-only accuracy: 53.0%

## WARM cohort (양팀 10+ 경기 — cold-start noise 배제)

- home win rate (실측): 53.0%
- Elo Brier: 0.2475 (bootstrap 95% CI [0.2443, 0.2509])
- 홈어드밴티지-only Brier (상수 0.530): 0.2491 (bootstrap 95% CI [0.2468, 0.2512])
- 동전던지기 Brier (0.5 상수): 0.2500
- Elo accuracy (favorite pick): 54.6%
- 홈어드밴티지-only accuracy: 53.0%

## 판정 (op-analysis heavy 게이트)

- 전체 표본: Elo vs 홈어드밴티지-only CI 겹침 (구분 불가) — cycle 2128 과 동일 결론
- WARM cohort: Elo vs 홈어드밴티지-only CI 겹침 (구분 불가) — cycle 2128 과 동일 결론
- n=747→896 (+149) 에도 CI 폭 축소 미미, 방향(Elo 우세)은 유지되나 통계적 구분 불가 지속
- Phase 3(예측 반영) 보류 유지. plan #25 archive 상태 변경 없음.
