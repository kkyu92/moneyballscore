-- ============================================
-- Phase 2c: 파이프라인 실행 로그 + 알림 설정
-- ============================================

-- 파이프라인 실행 히스토리
CREATE TABLE pipeline_runs (
  id            SERIAL PRIMARY KEY,
  run_date      DATE NOT NULL,
  mode          VARCHAR(10) NOT NULL,    -- 'predict' | 'verify'
  status        VARCHAR(10) NOT NULL,    -- 'success' | 'error' | 'partial'
  games_found   INT DEFAULT 0,
  predictions   INT DEFAULT 0,
  games_skipped INT DEFAULT 0,
  errors        JSONB DEFAULT '[]',
  duration_ms   INT,
  triggered_by  VARCHAR(20),             -- 'cron' | 'manual' | 'api'
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pipeline_runs_date ON pipeline_runs(run_date DESC);

-- RLS
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pipeline_runs" ON pipeline_runs FOR SELECT USING (true);
CREATE POLICY "Service insert pipeline_runs" ON pipeline_runs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update pipeline_runs" ON pipeline_runs FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
