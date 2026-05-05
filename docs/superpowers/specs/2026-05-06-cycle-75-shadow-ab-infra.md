# cycle 75 — shadow A/B 인프라 (cycle 56 spec H2 carry-over)

**Date**: 2026-05-06
**Cycle**: 75
**Chain**: explore-idea (lite — spec only, office-hours/plan-ceo/plan-eng skip)

## Carry-over

cycle 56 spec section 6 후속 carry-over:
> "shadow A/B 인프라 부재 (cycle 56 spec H2 carry-over). 즉각 ship X — shadow A/B 인프라 prerequisite"

cycle 67 spec carry-over 종합 표 마지막 항목:
| step | status | cycle |
|---|---|---|
| shadow A/B 인프라 (cycle 56 H2) | ⏳ | 별도 사이클 |

H1b 측면 4 step 처리 완료 (cycle 60/62/64/67). H1a/H1b/H1c 가중치 후보 A/B/C 와 cycle 67 rivalry-memory RECENT_GAMES_LIMIT 후보 A/B/C 가 모두 **shadow A/B 인프라 prerequisite** 으로 박제. 본 spec 이 그 prerequisite 자체.

## 배경 — 왜 shadow A/B 인프라가 필요한가

### 검증 차원 — backtest vs prod 격차

cycle 21 박제: backtest vs prod **78× 격차** (Brier 0.218 vs 0.275). backtest 모델이 단순 가중치 합 (rivalry-memory / agent_memory / LLM debate 모두 부재) → prod 의 진짜 모델과 다른 함수. backtest validation 만으로 prod 변경 결정 = 신뢰 부족.

### 후보 변경의 prod 직접 검증 필요

4 후보 모두 prod 행동 변경:
- cycle 56 H1 가중치 후보 A/B/C (sfr/h2h 가중치 -0.233 / -0.161 systematic bias 대응)
- cycle 67 H1b rivalry-memory RECENT_GAMES_LIMIT 후보 A/B/C (LLM 입력 quality)

prod 변경 직접 ship → 적중률 risk + rollback 비용. shadow 병렬 측정 → 결정 후 ship 패턴 = 안전.

### "데이터로만 이야기" 룰 (R2 메모리)

`memory/feedback_data_only_claims.md` (커밋 0d5750b R5 정정 lesson 포함): "모델·가중치·튜닝 모든 주장은 Brier/LogLoss/정확도 측정 숫자로 뒷받침. 직관·"그럴듯함" 금지". shadow A/B = R2 룰 충족 위한 prerequisite.

## 발견 위치

### predictions 테이블 model_version 컬럼

`supabase/migrations/001_initial_schema.sql:146`:
```sql
model_version   VARCHAR(10) DEFAULT 'v1.0',
```

`supabase/migrations/008_widen_model_version.sql`: VARCHAR(10) → VARCHAR(20) (cycle 사례 3 — 'v2.0-debate' overflow silent fail 후 widen).

현재 prod 단일 row per game (game_id UNIQUE). model_version 컬럼 = 단일 baseline.

### prediction 생성 파이프라인

`packages/kbo-data/src/pipeline/daily.ts`:
- `runDebate()` 1회 호출 → debate 결과 → predictions INSERT (game_id 기준 ON CONFLICT DO NOTHING — first-write-wins)
- 단일 가중치 셋 (DEFAULT_WEIGHTS in `engine/predictor.ts`)
- 단일 LLM 입력 (rivalry-memory.ts RECENT_GAMES_LIMIT=5)

### verify 파이프라인

`runDailyVerifier()`: `predictions` row 의 `is_correct` 필드 갱신. 본 verify 가 baseline + shadow 모두 적중 측정 가능 (model_version 분기 X — game_id 기준 actual_winner 매칭).

## 후보 — shadow 인프라 설계

### 후보 X) row-per-version (predictions UNIQUE 변경)

- `predictions(game_id, model_version)` 복합 UNIQUE
- baseline row 1개 + shadow A/B/C row 3개 = 1 game 4 row
- 사용자 노출 = `model_version = 'v2.0-debate'` 만 SELECT
- shadow row = LLM debate 비호출 (가중치 변경만 시뮬레이션 — debate 결과 baseline 재사용 + 가중치만 다르게 적용)
- 비용 변경 = 0 (LLM 호출 X)
- 단점: 가중치 변경만 검증. LLM 입력 변경 (cycle 67 H1b RECENT_GAMES_LIMIT) 검증 X

### 후보 Y) shadow_predictions 별도 테이블

- 신규 테이블 `shadow_predictions(id, game_id, model_version, ...)` — predictions 와 동일 스키마, 분리 저장
- baseline = predictions, shadow = shadow_predictions
- LLM debate 호출 후보별 분리 가능 (cycle 67 H1b 후보 A=10경기 검증 가능)
- 비용 = LLM 호출 후보 수 × 게임 수 (5경기/일 × 3 후보 = 15 호출/일 추가)
- 단점: 비용. 데이터 모델 중복

### 후보 Z) shadow_runs 메타 테이블 + predictions 컬럼 확장

- `predictions` 에 `shadow_predictions JSONB` 컬럼 추가 — 후보별 결과 array
- shadow_runs 메타 테이블 — 후보 정의 (`run_id`, `weights`, `recent_games_limit`, `started_at`)
- 비용 = 후보 X (가중치만) 또는 Y (입력 변경)
- 단점: JSONB 쿼리 복잡 (Brier/LogLoss 측정 SQL)

### 후보 W) feature flag + 단일 row + 가중치만 변경 (lightweight)

- predictions 테이블 변경 X
- env var `SHADOW_WEIGHTS_PROFILE=A|B|C` 별도 파이프라인 (Cloudflare Worker cron 분기)
- baseline 파이프라인 = `v2.0-debate`, shadow = `v2.1-shadow-A` 등 model_version 만 다름
- 단일 game 에 대해 baseline + shadow 양쪽 row INSERT (game_id UNIQUE 변경 필요)
- 사실상 후보 X 와 동일 (UNIQUE 변경 prerequisite)

## 검증 plan

### Phase 1 — 결정 (어떤 후보)

- 후보 X (row-per-version): 가중치 변경 검증만 (cycle 56 H1 A/B/C)
- 후보 Y (shadow_predictions): 모든 변경 검증 (cycle 56 H1 + cycle 67 H1b)
- 후보 Z (JSONB): 위와 동일하지만 SQL 부담
- 후보 W (lightweight): X 와 동일

**권장**: 단계적 — Phase 1 후보 X (낮은 비용, 가중치 검증) → Phase 2 후보 Y 확장 (필요 시)

### Phase 2 — schema migration (후보 X)

- 신규 migration `024_predictions_shadow_ab.sql`:
  ```sql
  ALTER TABLE predictions DROP CONSTRAINT predictions_game_id_key;
  ALTER TABLE predictions ADD CONSTRAINT predictions_game_id_model_version_key UNIQUE (game_id, model_version);
  ```
- 기존 row 영향 X (단일 model_version per game)
- 다음 INSERT 부터 model_version 분기 가능

### Phase 3 — pipeline 분기 (daily.ts)

- 환경변수 `SHADOW_WEIGHTS_PROFILES` (예: `A,B,C`) 또는 코드 상수
- `runDebate()` 1회 후 baseline 결과 → 후보별 가중치 적용 시뮬레이션 → 추가 INSERT (model_version 분기)
- LLM 호출 추가 X (debate 결과 재사용)

### Phase 4 — measurement view + dashboard

- migration `025_shadow_ab_measurement_view.sql`:
  ```sql
  CREATE VIEW shadow_ab_brier AS
  SELECT model_version, COUNT(*) n, AVG((CASE WHEN is_correct THEN 1 ELSE 0 END - confidence)^2) brier
  FROM predictions WHERE actual_winner IS NOT NULL GROUP BY model_version;
  ```
- `/debug/shadow-ab` 페이지 — model_version 별 Brier/LogLoss/Accuracy + bootstrap CI

### Phase 5 — 결정 기준 (R8)

후보별 Phase 4 view 측정 30+일 누적 후:
- shadow Brier < baseline Brier 95% CI 0 배제 → ship (가중치 prod 적용)
- shadow Brier ≥ baseline Brier 또는 CI 0 포함 → 기각 박제 (sample noise / hypothesis confirmed null)
- 누적 30일 미만 → 결정 보류

## 위험 평가

| 위험 | 측정 | 대응 |
|---|---|---|
| game_id UNIQUE 변경 → 기존 코드 break | grep `predictions!inner` `predictions.game_id` ON CONFLICT | 후보 X migration 후 INSERT path 재검토 |
| model_version 분기 후 SELECT 누락 → 사용자에 shadow 노출 | unit test (predictions SELECT 시 baseline 만 노출 확인) | UI/API 모든 SELECT 에 `model_version = 'v2.0-debate'` 명시 |
| shadow 시뮬레이션 잘못 (debate 결과 재사용 가정 오류) | shadow A 가중치 = baseline 동일이면 brier 동일 sanity check | 후보 X Phase 3 sanity test |
| LLM 호출 비용 폭발 (후보 Y) | Anthropic API monthly | 후보 X 시작 (LLM 호출 추가 X) |
| shadow 가 사용자에게 노출 (UI 누락) | E2E test + /debug/shadow-ab 외 SELECT model_version 분기 grep | 후보 X 시작 + UI grep audit |
| 30일 누적 표본 부족 (n < 100) | 30일 × 5경기/일 = 150 표본 추정 | Phase 5 결정 보류 또는 60일 누적 |

## stop 조건

- 본 spec = lite 모드 spec only. 구현 X
- 사용자 review 대기 — 후보 X 권장 vs Y 결정
- review 후 다음 사이클 (heavy explore-idea 또는 fix-incident chain) 에서 schema migration + pipeline 분기 구현

## 다음 단계 — carry-over

| step | 권장 chain | 추정 |
|---|---|---|
| 사용자 review (후보 X vs Y) | 사용자 영역 | - |
| Phase 2 schema migration (후보 X) | review-code (heavy) 또는 fix-incident | 1 cycle |
| Phase 3 pipeline 분기 + sanity test | explore-idea (heavy) | 1 cycle |
| Phase 4 measurement view + /debug/shadow-ab | polish-ui 또는 explore-idea (heavy) | 1 cycle |
| Phase 5 30일 누적 후 결정 측정 | operational-analysis (heavy) | 30일 후 |
| cycle 56 H1 후보 A/B/C 검증 (shadow 후) | operational-analysis (heavy) | 30일 후 |
| cycle 67 H1b 후보 A/B/C 검증 (shadow 후, 후보 Y 필요) | operational-analysis (heavy) | 별도 |

## Carry-over 종합 (cycle 56 H1/H2/H3 측면)

| step | status | cycle |
|---|---|---|
| H1 가중치 sfr/h2h systematic bias 측정 | ✅ | 52/59 (op-analysis) |
| H1a/H1b/H1c 가설 분리 | ✅ | 56 (explore-idea lite spec) |
| H1b SFR scrape 측정 (4 step) | ✅ | 60/62/64/67 |
| H1b RECENT_GAMES_LIMIT 후보 spec | ✅ | 67 (explore-idea lite) |
| H1b backtest h2h ≥3 임계 변경 코드 | ✅ | 69 (review-code heavy, PR #104) |
| **H2 shadow A/B 인프라 spec** | ✅ | **75 (본 spec, explore-idea lite)** |
| H2 schema migration | ⏳ | 다음 사이클 |
| H2 pipeline 분기 | ⏳ | 다음 사이클 |
| H2 measurement view + dashboard | ⏳ | 다음 사이클 |
| H2 30일 누적 후 결정 | ⏳ | 30일 후 |
| H3 v1.5 baseline backfill 50일 | ⏳ | 향후 |

## 박제 위치

- 본 spec
- cycle 75 cycle_state.execution.results
- cycle 56 spec section 6 "shadow A/B 인프라" carry-over 갱신 (H2 spec 박제 → 다음 step Phase 2 migration)
- cycle 67 spec carry-over 종합 표 갱신 ("shadow A/B 인프라 (cycle 56 H2) | ⏳ → ✅ spec, 다음 step migration")
