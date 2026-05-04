-- cycle 42 — develop_cycle_logs 테이블 (develop-cycle skill 의 사이클 운영 로그 + 대시보드 source)
-- spec: docs/superpowers/specs/2026-05-04-spec-v3-develop-cycle-self-progression-design.md
-- plan: docs/superpowers/plans/2026-05-04-develop-cycle-self-progression-impl.md PR 4
--
-- 목적:
-- (1) develop-cycle skill 의 매 사이클 진행 상태를 Supabase 단일 source 에 박제.
-- (2) /debug/develop-cycle 대시보드 (cycle 44, PR 6) 의 데이터 source.
-- (3) cycle 진단 단계 첫 step 에 in_progress INSERT, 회고 단계 끝에 success/fail/partial UPSERT.
--
-- 책임 분리:
-- - cycle_state JSON (~/.develop-cycle/cycles/<n>.json) = 로컬 carry-over (read 빠름)
-- - develop_cycle_logs = 운영 시각화 + 대시보드 + 추세 분석
-- - watch.log = 자동 fire 메커니즘 디버깅 (별도)
--
-- R5 정신: 본 마이그레이션은 local + prod 양쪽 박제 명시. silent fail 차단 (사례 3 재발 방지).

CREATE TABLE IF NOT EXISTS develop_cycle_logs (
  id BIGSERIAL PRIMARY KEY,
  cycle_n INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,                          -- nullable (in_progress 동안)
  chain_selected TEXT,                           -- nullable (진단 단계 시작 시 박제 X)
  outcome TEXT CHECK (outcome IN (
    'in_progress',
    'success',
    'fail',
    'partial',
    'interrupted'                                -- watch.sh hang safety v2 timeout kill
  )),
  pr_number INTEGER,
  commit_hash TEXT,
  retro_summary TEXT,
  next_recommended_chain TEXT,
  cycle_state JSONB,                             -- 전체 cycle_state JSON (회고 끝 시점 박제)
  watch_log_tail TEXT,                           -- 마지막 50 line watch.log
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cycle_n)                               -- in_progress → success/fail UPSERT (한 cycle = 한 row)
);

CREATE INDEX idx_develop_cycle_logs_cycle_n ON develop_cycle_logs (cycle_n DESC);
CREATE INDEX idx_develop_cycle_logs_outcome ON develop_cycle_logs (outcome) WHERE outcome != 'success';
CREATE INDEX idx_develop_cycle_logs_chain ON develop_cycle_logs (chain_selected) WHERE chain_selected IS NOT NULL;
CREATE INDEX idx_develop_cycle_logs_started_at ON develop_cycle_logs (started_at DESC);

ALTER TABLE develop_cycle_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON develop_cycle_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE develop_cycle_logs IS
  'cycle 42 — develop-cycle skill 의 사이클 운영 로그. /debug/develop-cycle 대시보드 source.';
COMMENT ON COLUMN develop_cycle_logs.outcome IS
  'in_progress (진단 시 INSERT) → success/fail/partial (회고 끝) / interrupted (watch.sh timeout kill)';
COMMENT ON COLUMN develop_cycle_logs.cycle_state IS
  '~/.develop-cycle/cycles/<n>.json 전체 박제. 회고 끝 시점 UPSERT.';
COMMENT ON COLUMN develop_cycle_logs.watch_log_tail IS
  '마지막 50 line watch.log. 자동 fire 메커니즘 디버깅용.';
