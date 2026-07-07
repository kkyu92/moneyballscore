---
cycle: 1494
chain: explore-idea (lite)
mode: doc-only (자동 fire 환경 AskUserQuestion hang 차단)
trigger:
  - 2-chain alt-lock 발동 (직전 8 cycle distinct=2: review-code 7 + fix-incident 1)
  - carry-over next_rec = explore-idea 3 cycle 연속 (1491/1492/1493)
  - improvement saturation 14/15 ≥ 12 (review-code 12 + fix-incident 1 + polish-ui 1)
  - cycle 1492 fix-incident 후속 concrete direction (LLM_BACKEND_FALLBACK observability)
status: shipped (doc-only spec, code X)
target_chain_next: fix-incident (구현 시 backend 컬럼 + activation counter — 사용자 리뷰 대기)
---

# cycle 1494 — LLM_BACKEND_FALLBACK observability spec (explore-idea lite)

## 1. context

cycle 1492 (PR #2578, commit c2fe91ce) 이 `callLLM()` 안 CREDIT_EXHAUSTED 자동 failover 박제.

**shipped**:
- `LLM_BACKEND_FALLBACK=deepseek|ollama` env 설정 시 primary claude CREDIT_EXHAUSTED → fallback backend 자동 재시도
- Sentry `captureMessage` warning + tag `credit_exhausted_fallback` + tag `model` 박제
- 하위 호환: env 미설정 시 기존 동작 (원본 에러 반환)
- 테스트 2건 (`agents-llm.test.ts:249~283`)

**observability gap**:
- Sentry warning **capture** 되지만 aggregation dashboard 없음 (Sentry 이벤트 volume 측정 X, weekly trend 측정 X)
- fallback 활성화 횟수 counter **DB layer 부재** — `pipeline_runs` 안 backend 라벨 X, `predictions` row 안 backend 라벨 X
- fallback backend (deepseek/ollama) 로 생성된 예측이 primary (claude) 대비 quality/latency 차이 **cohort split 측정 불가**
- per-model split (Haiku team-agent vs Sonnet judge-agent activation rate) **측정 불가**

## 2. non-goals (본 spec 안)

- **actual implementation 착수 X** — lite mode = spec only, 코드 변경 0
- shadow weight / v2.1-B 재검토 X (v1.8 유지 확정, cycle 1447 n=161 breakthrough evidence 정합)
- 프로덕션 fallback 활성화 결정 X — 사용자 env 설정 영역
- 알림 threshold 확정 X — spec 안 후보만 박제

## 3. proposed layers

### 3.1 layer A — DB column tagging (predictions row)

**목표**: 각 prediction 이 어느 backend 로 생성됐는지 row-level tagging.

**옵션 A1** — `predictions.llm_backend` VARCHAR(16) 컬럼 신규
- values: `'claude'` (default) / `'deepseek'` / `'ollama'`
- backfill: 신규 컬럼 → NULL default → 이후 predictions 만 태깅
- migration: `supabase/migrations/NNN_predictions_llm_backend.sql`

**옵션 A2** — 기존 `model_version` 확장 (VARCHAR overflow 위험 — 사례 3/재발 evidence)
- 예: `'v1.8'` → `'v1.8_claude'` / `'v1.8_deepseek'`
- 단점: VARCHAR width 재계산 필요, silent overflow drift 재발 위험 (memory `content-infrastructure-supabase-varchar-overflow-pattern.md`)

**권장**: 옵션 A1 (신규 컬럼) — silent overflow risk 회피.

### 3.2 layer B — activation counter (pipeline_runs augmentation 또는 별도 table)

**옵션 B1** — `pipeline_runs` 안 신규 컬럼 `llm_fallback_activations` INTEGER default 0
- 매 pipeline run 완료 시 activation count 누적 update
- 단점: pipeline_run 단위 aggregation — per-model / per-hour 세부 unavailable

**옵션 B2** — 신규 table `llm_fallback_events`
- schema: `(id BIGSERIAL, ts TIMESTAMPTZ default now(), model VARCHAR(32), fallback_to VARCHAR(16), pipeline_run_id BIGINT nullable, prediction_id BIGINT nullable, error_snippet TEXT)`
- 매 fallback 활성화 시 1 row insert
- Query: 주간 activation count / model 별 분포 / hour-of-day 분포 / correlated pipeline_run 실패율

**권장**: 옵션 B2 (신규 table) — 세부 aggregation 가능, prediction row 와 join 가능.

### 3.3 layer C — cohort Brier split (verification / weekly-review 확장)

목표: fallback backend 로 생성된 prediction 의 Brier / accuracy 를 primary 와 분리 측정.

- `scripts/backtest.ts` 또는 `weekly-review` skill 안 backend cohort split
- baseline: `WHERE llm_backend='claude'` vs `WHERE llm_backend IN ('deepseek','ollama')`
- 표본 임계: cohort 별 n ≥ 30 (memory `content-architecture-lotto-rule-oos-sample-floor.md` 정신 정합)
- reporting: 주간 리뷰 포스트 안 cohort 별 Brier / accuracy delta

**주의**: fallback 활성화 자체가 CREDIT_EXHAUSTED 시나리오 (사용자 크레딧 소진) 에만 fire. 통상 운영 시 fallback cohort = 0 rows. cohort split value = **incident 관측 도구** (regression 방지 도구 X).

### 3.4 layer D — Sentry alert rule (선택적)

옵션 D1: Sentry issue "CREDIT_EXHAUSTED: fallback to *" volume ≥ threshold/hour → email/telegram alert
- threshold 후보: ≥5 이벤트/hour (매 pipeline run ~10건 * 24h = ~240 total. 5+ 는 primary 다수 소진 신호)
- 사용자 영역 (Sentry alert rule setup)

옵션 D2: `pipeline_runs.llm_fallback_activations > 0` 시 telegram announce channel warning
- 사용자 영역 (telegram bot integration)

## 4. rollout sequence 후보 (사용자 리뷰 대기)

**단계 1** (fix-incident chain, 1 cycle):
- migration NNN_predictions_llm_backend.sql + migration NNN_llm_fallback_events.sql
- `packages/kbo-data/src/agents/llm.ts` 안 fallback path 에 `llm_fallback_events` insert + Sentry capture 유지
- prediction 생성 path 에 `llm_backend` 컬럼 채우기 (RunPredictionJob.ts 또는 유사)
- 테스트 확장 (2건 → 4건: insert 검증 + 컬럼 채워짐 검증)

**단계 2** (op-analysis chain, 1 cycle):
- weekly-review 안 cohort split query
- reporting spec (event count / backend 분포)

**단계 3** (사용자 영역):
- Sentry alert rule (옵션 D1)
- telegram channel warning (옵션 D2)
- LLM_BACKEND_FALLBACK env 실제 프로덕션 활성화 결정 (현재 사용자 크레딧 충전 대기 상태 — CLAUDE.md v2.0 결정 evidence)

## 5. self-verification rubric (cycle 887 plan #8 정합)

| 축 | 값 | 근거 |
|---|---|---|
| 가치 | medium | fallback observability = incident 관측 도구. 통상 운영 = fallback cohort=0 (value ↓). incident 발생 시 diagnosis speed ↑ (value ↑) |
| 시간 비용 | small (단계 1: 1 cycle) | migration 2건 + agents/llm.ts insert 1건 + RunPredictionJob backend 컬럼 채우기 1건 + 테스트 확장 |
| risk | 1 (light noise) | migration = ADD COLUMN default NULL 안전. insert path 실패 시 fallback 자체 silent skip 위험 → try/catch 필수 |
| 자율 가능 | partial | 단계 1 = 본 메인 fix-incident chain 자율. 단계 2 = op-analysis chain 자율. 단계 3 = 사용자 영역 |
| 의존성 | 단일 | cycle 1492 shipped LLM_BACKEND_FALLBACK 위 layer. 다른 batch 의존 X |

**Tier 분류**: Tier 2 (medium value + small time + risk 1 + partial 자율)

**자가 의심 차단**: 표본 부재 (fallback 미활성화 = cohort 0 rows) 여도 harness 박제 가치 = incident readiness. 결정 X (사용자 크레딧 충전 후 프로덕션 fallback 활성화 시 자연 evidence 축적).

## 6. carry-over (사용자 리뷰 대기)

- [ ] 단계 1 진행 승인 (본 spec 4.단계1 착수 여부)
- [ ] 옵션 A1 vs A2 결정 (신규 컬럼 vs model_version 확장)
- [ ] 옵션 B1 vs B2 결정 (pipeline_runs 컬럼 vs 신규 table)
- [ ] threshold D1 값 확정 (≥5 events/hour 또는 다른 값)
- [ ] LLM_BACKEND_FALLBACK 프로덕션 env 활성화 시점

## 7. 관련 evidence

- **cycle 1492 PR #2578** (commit c2fe91ce) — LLM_BACKEND_FALLBACK layer shipped
- **CLAUDE.md v2.0 결정** (2026-07-06) — CREDIT_EXHAUSTED 2026-06-06~ 지속 → debate 100% fallback → conf=0.3 (사용자 Anthropic 크레딧 충전 필요)
- **memory `content-infrastructure-supabase-varchar-overflow-pattern.md`** — VARCHAR overflow silent drop 사례 (옵션 A2 risk 근거)
- **cycle 1400 P2 lesson** — judge-agent 토론 22일 silent (confidence=0.3 flat) — fallback observability 부재 시 silent 재발 위험 evidence
