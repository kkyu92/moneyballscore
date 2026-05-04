# Factor Attribution — 7d / 30d (2026-05-04, cycle 11)

**측정 시점**: 2026-05-04 KST (cycle 11, operational-analysis chain 연속 2회 사용)
**source**: `factor_error_summary` view (migration 010) + `predictions` 테이블 raw 7d aggregation
**선행 lesson**: cycle 10 `prediction-baseline-7d-30d` (Brier 0.248 ≈ coin flip)

## 핵심 발견

### 1. 빈도·바이어스 1순위 식별

**30d (created_at 기준) — `factor_error_summary` view**:

| factor | error_count | avg_bias | v1.5 weight |
|---|---:|---:|---:|
| **recent_form** | **52** | -0.059 | 10% |
| **sfr** | **42** | **-0.247** | **0%** ⚠️ |
| **head_to_head** | **38** | -0.162 | **0%** ⚠️ |
| bullpen_fip | 28 | +0.012 | 10% |
| sp_fip | 20 | -0.030 | 19% |
| lineup_woba | 2 | +0.002 | 20% |
| sp_xfip | 2 | -0.148 | 5% |
| war | 2 | 0.000 | 8% |

**7d (created_at 기준) — 25 rows raw aggregation**:

| factor | error_count | avg_bias |
|---|---:|---:|
| head_to_head | 19 | **-0.289** |
| recent_form | 18 | -0.059 |
| bullpen_fip | 13 | +0.003 |
| sfr | 12 | **-0.289** |
| sp_fip | 11 | -0.029 |
| lineup_woba | 1 | -0.005 |
| sp_xfip | 1 | -0.095 |

7d 패턴 = 30d 의 부분집합. `head_to_head` + `sfr` 는 7d에서 더 강한 over-confidence (-0.289 vs 30d -0.247/-0.162) 보임.

### 2. 가중치 vs LLM reasoning 갭 — 가장 큰 lesson

**v1.5 가중치 0%인 factor 가 LLM 의 사후 reasoning 에선 빈도·바이어스 모두 상위**:

- `head_to_head` (weight=0%): **80건** total (30d 38 + 7d 19 안에 30d 포함), avg_bias -0.162~-0.289
- `sfr` (weight=0%): **54건** total, avg_bias -0.247~-0.289
- 두 factor 만 합쳐도 80 + 54 = 134건 = 전체 factorErrors 의 **약 70%**

반대로 가중치 1·2위인 `lineup_woba` (20%) + `sp_fip` (19%) 는 빈도 22건 / avg_bias 거의 0 = **잘 작동**.

**해석**:
- post_game `factorErrors` 는 모델 가중치가 아닌 **`postview.ts` LLM 의 자체 사후 분석** 결과. LLM 이 "어떤 factor 에서 모델이 틀렸나" 자유 추론
- 즉 LLM 은 head_to_head + sfr 에 강한 신호가 있다고 봄 — **모델 가중치 0%인 점과 충돌**
- 두 가지 행동 후보 (cycle 12+ 결정):
  - **(a) 가중치 상향**: head_to_head / sfr 를 5~10% 부여. v2.0 튜닝의 정량 1순위 후보
  - **(b) postview 프롬프트 정렬**: factorErrors 후보를 모델 가중치 > 0% 인 factor 로 제한. LLM 과 모델 일관성

### 3. post_game `verified_at = NULL` 패턴 박제

7d window 를 `verified_at` 기준 조회 시 **0 rows**. 원인:
- `predictions.prediction_type='post_game'` row 는 사후 분석용 (LLM 이 이미 끝난 경기 결과 보고 추론). `verified_at` 박는 path 없음 (verify 단계는 pre-game prediction 만 대상)
- **올바른 7d/30d 윈도우 쿼리는 `created_at` 기준** — cycle 10 의 baseline 분석은 pre-game `verified_at` 기준이라 정확. cycle 11 은 post_game `created_at` 기준이라야 정확

이 갭은 cycle 10 lesson 의 미보고 부분.

## 다음 cycle (12+) 후보 actionable

1. **scripts/backtest.ts** 작성 — head_to_head/sfr 가중치 0% → 5%/10% 시뮬레이션. 30d 62 verified rows 기준 Brier 비교 (v2.0 vs v2.0+head_to_head/sfr)
2. **postview.ts factorErrors 도메인 제한** — DEFAULT_WEIGHTS > 0% 인 factor 만 후보로. 단순 1줄 fix
3. **Sonnet judge 프롬프트 비교** — judge-agent.ts 와 postview.ts 둘 중 어디서 head_to_head/sfr 추론하는지 확인. 둘 다라면 (a)+(b) 둘 다 진행

## Raw Query

```bash
# 30d aggregated view
GET /rest/v1/factor_error_summary?select=*&order=error_count.desc

# 7d raw aggregation
GET /rest/v1/predictions?select=reasoning&prediction_type=eq.post_game
  &created_at=gte.2026-04-27&reasoning=not.is.null&limit=200
# → JSONB unnest factorErrors → factor counter + bias avg
```

## 데이터 정합성 메모

- `factor_error_summary` view 정의 (migration 010): `prediction_type='post_game' AND reasoning ? 'factorErrors'` GROUP BY factor
- LLM 자체 reasoning 출처라 가중치 직접 튜닝 input 으론 부족 — 보조 신호. v1.5 백테스트 (cycle 12+) 와 결합 시 의미
- 7d 표본 25 rows / 30d 62 rows 모두 small-sample. **2주 후 (cycle ~25) 재측정**으로 trend 검증 필요
