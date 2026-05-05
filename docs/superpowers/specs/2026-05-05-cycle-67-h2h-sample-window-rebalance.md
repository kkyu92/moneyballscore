# cycle 67 — h2h 5경기 표본 변경 후보 (cycle 56 spec section 6 두 번째 step)

**Date**: 2026-05-05
**Cycle**: 67
**Chain**: explore-idea (lite — spec only, office-hours/plan-ceo/plan-eng skip)

## Carry-over

cycle 56 spec section 6 위험 평가:
> "sfr/h2h 데이터 quality 문제 (가중치 무관) | H1b 가설. 입력 정정 우선 | 별도 cycle (review-code chain) — kbo-fancy.ts SFR scrape 재검증 / **kbo-data h2h 5경기 표본 변경**"

cycle 60→62→64→66 lineage 가 SFR scrape 측면 진행 (1단계 measurement 완료, 2단계 데이터 누적 대기). h2h 측면은 미진행.

## 발견 위치

### Rivalry memory (LLM debate prompt 주입)

`packages/kbo-data/src/agents/rivalry-memory.ts:43`:
```typescript
const RECENT_GAMES_LIMIT = 5;
```

LLM team-agent 에 주입하는 과거 h2h 표본 = 최근 5경기 (시즌 전체의 일부). debate verdict 의 입력 quality 직접 영향.

### Backtest h2h 임계

`packages/kbo-data/src/backtest/models.ts:75-79` (cycle 60 review-code 박제):
```typescript
const h2hN = f.h2hHomeWins + f.h2hAwayWins;
if (h2hN >= 2) {
  const h2hRate = f.h2hHomeWins / h2hN;
  delta += p.kH2h * (h2hRate - 0.5) * 2;
}
```

≥2 경기 임계. 2/0=100% 시 ±30 Elo pt 노이즈 risk. cycle 60 박제 — backtest 단순 모델 baseline 전용 (prod 영향 X), 단 변경 시 grid run 4+ 시도 필요.

### Prod 가중치 (cycle 56 lesson H1)

`packages/kbo-data/src/engine/predictor.ts` DEFAULT_WEIGHTS h2h = 0.05 (5%). prod 30일 N=67 systematic bias -0.161 (cycle 52 lesson) → cycle 59 bootstrap CI 0 배제 systematic confirmed.

## 가설 — h2h 5경기 표본 변경 후보

### A) 5 → 10 (확장)

- **rivalry-memory RECENT_GAMES_LIMIT 5 → 10**: LLM 입력 확장 = sample noise 감소 + 토큰 비용 증가 (5경기 ≈ 100 tokens / 10경기 ≈ 200 tokens)
- 단점: 시즌 초기 / 표본 부족 시 더 많이 padding 필요. fetchHeadToHead fallback 호출 빈도 증가
- 기대 효과: H1b factor data quality 개선 → cycle 52 systematic bias 일부 완화

### B) 5 유지 + 신뢰 가중치 (조건부)

- 5경기 유지 + 본 사이클 안 표본 ≥3 일 때만 LLM 박제, <3 일 때 "최근 표본 부족" 명시
- prompt 명시 = LLM judge 가 sfr/h2h 신뢰도 자율 판단 가능 (cycle 56 H1c 가설 가능성)
- 토큰 비용 변경 X. 변경 적음

### C) 5 → 시즌 전체 (max 50)

- backtest calculateHeadToHead 와 일관성 — limit 50 모두 사용
- 시즌 끝 → 80~100경기 = 토큰 폭발 (≈1500 tokens/team) = prompt 부담
- 한정 모델 baseline 일치 = backtest vs prod 격차 cycle 21 78× 측면 검토

### D) backtest h2h 임계 ≥2 → ≥3 (별도)

- backtest 단순 모델 baseline 만 영향. prod 영향 X
- cycle 60 review-code 박제 위험 (2/0=100% 노이즈) 직접 fix
- grid run 4+ 시도 필요 (kH2h 30 Elo pt 도 함께 측정 권장)

## 검증 plan

### Phase 1 — 현황 측정 (prerequisite)

1. **prod rivalry-memory 발화 통계**: 직전 30일 LLM debate 호출 시 `recent_h2h.length` 분포 (0/1/2/3/4/5경기). cycle 60 lesson lineage console.warn 패턴 동일.
2. **token 비용 측정**: 현재 5경기 시점 token 사용 — `agents/llm.ts` usage 로그 (Anthropic API response). 후보 A (5→10) 비교 baseline.

### Phase 2 — backtest validation (후보별)

- A: rivalry-memory 변경 backtest 의미 X (LLM debate 는 backtest 모델과 별도). prod shadow A/B 만 가능.
- B: 동일 — shadow A/B
- C: 동일 — shadow A/B + 토큰 비용 우려
- D: backtest grid run 5 harness 실행. cycle 57 backtest harness 재사용

### Phase 3 — 결정 기준 (R8)

- A/B/C: shadow A/B 인프라 부재 (cycle 56 spec H2 carry-over). 즉각 ship X — shadow A/B 인프라 prerequisite
- D: backtest 결과 5%+ Brier 개선 시 ship. 단 cycle 21 78× 격차 = backtest 의존 신뢰 낮음 → 보수적 기각

## 위험 평가

| 위험 | 측정 | 대응 |
|---|---|---|
| 토큰 비용 폭발 (후보 C) | Anthropic API monthly | 후보 C 기각, A/B 만 |
| sample noise (후보 A 5→10) 가 systematic bias 와 다른 효과 | shadow A/B + Brier 측정 | A/B 인프라 prerequisite |
| LLM judge 가 5/10 차이 인지 X | 본 H1c 가설 | judge prompt 재검토 (별도 cycle) |
| backtest h2h ≥3 임계 변경이 backtest baseline 변경 | grid run 4+ 시도 | cycle 57 harness 재사용 |

## stop 조건 — 변경 보류

cycle 56 spec section 6 "변경 보류" 결정 패턴 동일:
- shadow A/B 인프라 부재 → 후보 A/B/C 즉각 ship X
- 후보 D backtest validation 만 별도 사이클 (review-code chain — backtest grid run)
- 본 spec = carry-over 박제 only. 사용자 review 대기 / 다음 사이클 spec section 갱신

## 다음 단계

- 1~2주 prod console.warn (cycle 62/64) + rivalry-memory 발화 통계 누적
- backtest grid run (후보 D) 별도 사이클 (review-code heavy) — cycle 57 harness 재사용
- shadow A/B 인프라 spec carry-over (cycle 56 H2)

## Carry-over 종합 (cycle 56 H1b 측면)

| step | status | cycle |
|---|---|---|
| SFR scrape 코드 read | ✅ | 60 (review-code heavy) |
| SFR row-level silent fallback 측정 | ✅ | 62 (fix-incident) |
| SFR pipeline-level magic number + 측정 | ✅ | 64 (review-code heavy) |
| h2h 5경기 표본 변경 후보 spec | ✅ | 67 (본 spec, explore-idea lite) |
| prod 발화 데이터 1~2주 누적 | ⏳ | 향후 |
| op-analysis (heavy) 측정 분석 | ⏳ | 1~2주 후 |
| h2h 후보 D backtest grid run | ⏳ | 별도 사이클 |
| shadow A/B 인프라 (cycle 56 H2) | ✅ spec | 75 (explore-idea lite, `2026-05-06-cycle-75-shadow-ab-infra.md`) |

## 박제 위치

- 본 spec
- cycle 67 cycle_state.execution.results
- cycle 56 spec section 6 "h2h 5경기 표본 변경" 두 번째 step carry-over 갱신
- cycle 66 lesson cycle 60 lineage 박제의 spec 차원 후속
