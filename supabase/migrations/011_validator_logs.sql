-- Phase v4-4 Task 6
-- validator_logs 테이블 — /debug/hallucination 대시보드 데이터 소스.
-- Eng 리뷰 A3 (fire-and-forget insert) + A4 (pg_cron retention) 반영.

CREATE TABLE validator_logs (
  id             SERIAL PRIMARY KEY,
  game_id        INT REFERENCES games(id),
  team_code      VARCHAR(5) NOT NULL,
  backend        VARCHAR(50) NOT NULL,  -- 'claude' | 'deepseek:deepseek-chat' | 'ollama:exaone3.5:7.8b'
  severity       VARCHAR(10) NOT NULL,  -- 'hard' | 'warn'
  violation_type VARCHAR(30) NOT NULL,  -- 'hallucinated_number' | 'invented_player_name' | 'banned_phrase' | 'unclassified_claim'
  detail         TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_validator_logs_recent ON validator_logs(created_at DESC);
CREATE INDEX idx_validator_logs_type ON validator_logs(violation_type, severity);

-- RLS: 서비스 롤만 insert/select (관리자 자산)
ALTER TABLE validator_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service validator_logs insert" ON validator_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service validator_logs select" ON validator_logs
  FOR SELECT USING (auth.role() = 'service_role');

-- 30일 retention (Eng 리뷰 A4) — pg_cron
-- 매일 03:00 UTC (12:00 KST 아침) 에 30일 지난 row 자동 삭제.
SELECT cron.schedule(
  'validator_logs_cleanup',
  '0 3 * * *',
  $$ DELETE FROM validator_logs WHERE created_at < now() - INTERVAL '30 days' $$
);

COMMENT ON TABLE validator_logs IS
  'v4-4 Task 6: validator reject 이벤트 로그. /debug/hallucination 대시보드 데이터. 30일 retention via pg_cron.';
