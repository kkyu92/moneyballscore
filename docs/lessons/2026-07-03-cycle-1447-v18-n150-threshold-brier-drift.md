# cycle 1447 — v1.8 cohort n=150 threshold 초과 + Brier drift + v2.1-B-shadow reject 신호

**날짜**: 2026-07-03
**차원**: operational-analysis (lite)
**cycle**: 1447 (25-cycle gap trigger 7 after cycle 1422)

> **⚠️ STALE (cycle 1460 결정 후)** — 본 lesson 의 "v2.0 upgrade 결정 대기 carry-over" / "v2.0 upgrade 시 Platt scaling" / "v2.0 upgrade 시 Brier calibration 축 우선" / "head_to_head 재분석" / "후보 A/B/C" 는 모두 cycle 1460 plan #16 2차 fire (Fable plan) 결과 v1.8 유지 확정으로 superseded. Brier 0.2995 은 winner-centric 측정 오류 (실제 home_win_prob Brier 0.24 안정). 상세 = 본 문서 line 56 "cycle 1460 postmortem" 섹션 참조. cycle 1447 진단 evidence 는 historical archive 로 보존.

## 발견

### 1. v1.8 cohort n=161 → v2.0 upgrade threshold (150) 초과

| cycle | n | acc | Brier |
|---|---|---|---|
| 1288 | 113 | 60.9% | 0.2714 |
| 1340 | 118 | 58.5% | 0.2730 |
| 1400 | ~120 | — | — |
| **1447** | **161** | **60.9%** | **0.2995** |

- CLAUDE.md v2.0 조건: n=150 도달 시 가중치 재조정
- 실측 첫 도달 사이클 = 1447 (159 cycle 만에 n=48 증분, 평균 velocity 0.30 preds/cycle)
- **v2.0 upgrade evaluation 조건 성립** — 사용자 결정 대기 carry-over

### 2. Brier drift — 60.9% 정확도 유지에도 calibration 악화

- Brier 0.2714 (n=113) → 0.2995 (n=161) = **+0.028 (worse)**
- 정확도는 동일한데 Brier ↑ = 확신도가 실측과 어긋남 (over/under-confidence 편향 누적)
- confidence tier 검증: high 65% (n=20) / mid 58% (n=26) / low 61% (n=115). tier 간 격차 미미 = confidence signal 약함
- 조정 후보: (a) confidence 계산에서 특정 factor 가중치 축소, (b) v2.0 upgrade 시 Platt scaling / isotonic regression 추가

### 3. v2.1-B-shadow — candidate 명확 열등

| model | n | acc | Brier |
|---|---|---|---|
| v1.8 (prod) | 161 | 60.9% | **0.2995** |
| v2.1-B-shadow | 52 | 51.9% | **0.4635** |
| v2.0-shadow | 5 | 60.0% | 0.5616 (표본 부족) |

- v2.1-B-shadow Brier delta = **+0.164** vs v1.8 (심각한 열화)
- 정확도도 -9pp
- **reject 신호** — v2.1-B 방향 자체 재검토 필요 (v2.1-A 또는 신규 후보 fork)

## 결론 (사용자 carry-over)

R8 (data-driven decision) 원칙 준수:

1. **v2.0 upgrade 트리거 발화 조건 성립** (n=161 ≥ 150) — 하지만 자율 실행 X. 사용자 결정 대기
2. **v2.0 upgrade 시 Brier calibration 축 우선** — 정확도 유지 + calibration 개선 목표 (기존 v1.8 Brier 0.2995 → target ≤0.27)
3. **v2.1-B-shadow 폐기 후보** — Brier delta +0.164 로 명확 열등. shadow cohort 계속 수집은 노이즈
4. **head_to_head 3% 축 재검토** — cycle 335 v1.8 조정 근거 (Δ noise) 는 n=94 시점. n=161 재분석 유효

## 다음 후보

- 후보 A: `~/lotto_picks/` 스타일 사용자 결정 carry-over 파일 박제 (`docs/decisions/v2-upgrade-2026-07-03.md`)
- 후보 B: v2.1-B-shadow deprecation PR (shadow cohort 수집 중단 + 리소스 회수)
- 후보 C: Platt scaling / isotonic regression harness 스캐폴딩 (v2.0 calibration 축)

## cycle 1460 postmortem — v1.8 유지 확정 (2026-07-06)

**본 lesson 결론 + 다음 후보 A/B/C stale**. cycle 1460 plan #16 2차 fire (Fable plan) 최종 결정:

- Brier DEFAULT 0.2443 vs Learned 0.2458 (expanding window OOS n=178 재입증) → 최대 차이 0.15% < 1pp 임계
- 본 lesson 의 Brier 0.2995 = **home_win_prob 미박제 시점 winner-centric 측정 오류**. cycle 1455 backfill (173 rows `home_win_prob = reasoning.homeWinProb`) 이후 pre/post home_win_prob Brier = 0.24/0.24 안정 (실제 모델 정상)
- **v1.8 유지 확정**. v2.0 rebalance 진행 X. head_to_head 재분석 불필요
- v2.1-B-shadow reject 확정 유지 (본 lesson 결론 3 유효)
- Platt scaling / isotonic regression harness (후보 C) 불필요

본 lesson 은 cycle 1447 시점 진단 evidence historical archive 로 보존. 결론/후보의 v2.0 upgrade 방향은 cycle 1460 결정으로 superseded.

## 데이터 소스

- `scripts/op-analysis-cohort.ts` (n=339 total, pre_game only)
- 출력: `docs/op-analysis/cohorts/2026-07-03-cycle1447.md`
- baseline: `docs/op-analysis/cohorts/2026-06-21-cycle1313.md` (미갱신 12일)
