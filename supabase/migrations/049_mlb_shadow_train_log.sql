-- 049_mlb_shadow_train_log.sql
--
-- Silent drift audit (mlb-pipeline.ts 최초 감사, 2026-08-19) 발견 — 2건 모두
-- "DB write target 이 실제 스키마와 안 맞아 매 fire 시 100% insert 실패" 패턴.
--
-- 1) mlb_shadow_train mode (runShadowTrain, mlb-pipeline.ts) 가 'mlb_shadow_train_log'
--    테이블에 insert 시도 — 이 테이블은 전체 migration 역사(001~048)에 걸쳐 한번도
--    CREATE 된 적 없음. prod REST 실측 확인:
--      GET /rest/v1/mlb_shadow_train_log → 404 PGRST205
--      "Could not find the table 'public.mlb_shadow_train_log' in the schema cache
--       Perhaps you meant the table 'public.shadow_weights'"
--    → mlb_shadow_train 모드는 매 fire 시 insert 실패 (rowsInserted=0, errors 누적,
--      pipeline_runs.status='error') 상태로 방치돼있었음. 코드가 이미 쓰는 컬럼
--      shape(date/sample_count/weights/brier/accuracy/milestone_hit) 그대로 테이블화.
--
-- 2) mlb_walk_forward_measure mode (runWalkForwardMeasure) 는 기존 'walk_forward_brier'
--    테이블(036 migration)에 insert 시도하나 그 테이블은 month/cohort_size/brier_base/
--    brier_shadow/delta 컬럼 — factors/mlb-shadow-c.ts 의 walkForwardExpanding()(월간
--    base-vs-shadow 비교) 소비를 상정한 완전히 다른 설계. 코드는 date/league/
--    scoring_rule/brier_score/sample_count(일별 단일 Brier 로그)를 insert — 컬럼 전량
--    불일치, PostgREST가 "Could not find column" 으로 매 fire 실패.
--    walk_forward_brier 는 전체 리포에서 이 insert 1곳 외 어떤 reader 도 없는 orphan
--    테이블(grep 0건, TODOS.md cycle 1151 실측도 "row 0") — 기존 컬럼을 억지로 재활용
--    하는 대신 코드 실제 의도(일별 로그)에 맞는 신규 테이블 mlb_walk_forward_log 로
--    분리. walk_forward_brier 는 향후 월간 milestone 비교 기능이 실제 구현될 때를
--    위해 그대로 보존(미사용 상태 유지, 삭제 안 함).
--
-- RLS: 044~047 패턴 따라 생성 시점부터 anon read 정책 포함 (045 사례 24 재발 차단).

CREATE TABLE IF NOT EXISTS mlb_shadow_train_log (
  id            BIGSERIAL PRIMARY KEY,
  date          DATE         NOT NULL,
  sample_count  INT          NOT NULL,
  weights       JSONB        NOT NULL,
  brier         DECIMAL(6,4) NOT NULL,
  accuracy      DECIMAL(5,4) NOT NULL,
  milestone_hit BOOLEAN      NOT NULL DEFAULT false,
  league        VARCHAR(10)  NOT NULL DEFAULT 'mlb',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT mlb_shadow_train_log_brier_range CHECK (brier >= 0 AND brier <= 1),
  CONSTRAINT mlb_shadow_train_log_accuracy_range CHECK (accuracy >= 0 AND accuracy <= 1)
);

CREATE INDEX IF NOT EXISTS idx_mlb_shadow_train_log_date
  ON mlb_shadow_train_log (date DESC);

ALTER TABLE mlb_shadow_train_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read mlb_shadow_train_log"
  ON mlb_shadow_train_log FOR SELECT
  USING (true);

CREATE TABLE IF NOT EXISTS mlb_walk_forward_log (
  id           BIGSERIAL PRIMARY KEY,
  date         DATE         NOT NULL,
  league       VARCHAR(10)  NOT NULL DEFAULT 'mlb',
  scoring_rule VARCHAR(50)  NOT NULL,
  brier_score  DECIMAL(6,4) NOT NULL,
  sample_count INT          NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT mlb_walk_forward_log_brier_range CHECK (brier_score >= 0 AND brier_score <= 1)
);

CREATE INDEX IF NOT EXISTS idx_mlb_walk_forward_log_date
  ON mlb_walk_forward_log (date DESC);

ALTER TABLE mlb_walk_forward_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read mlb_walk_forward_log"
  ON mlb_walk_forward_log FOR SELECT
  USING (true);
