-- ============================================
-- SP 확정 시각 측정 로그 (Phase 2)
-- ============================================
-- KBO API 의 B_PIT_P_NM / T_PIT_P_NM 가 채워지는 시각을 매시간 cron 에서
-- raw snapshot 으로 적재. 1~2주 누적 후 분석:
--   - 경기 시작 N시간 전에 SP 확정되는지 (게임 type 별 분포)
--   - 확정 변동성 (분산) — 어느 시점에 cron 1회로 안전하게 잡을 수 있는지
--   - KBO 가 SP 등록 후 변경하는 패턴 (rare but possible)
--
-- Phase 3 에서 이 데이터로 일 15회 cron → 4~6회로 정밀 축소.

CREATE TABLE sp_confirmation_log (
  id                 SERIAL PRIMARY KEY,
  observed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  game_date          DATE NOT NULL,
  external_game_id   VARCHAR(20) NOT NULL,
  game_time          VARCHAR(5),
  home_sp_name       TEXT,
  away_sp_name       TEXT,
  state_sc           VARCHAR(2),
  inn_no             INT,
  source             VARCHAR(20) NOT NULL DEFAULT 'kbo-official'
);

CREATE INDEX idx_sp_log_date_game ON sp_confirmation_log(game_date, external_game_id, observed_at);
CREATE INDEX idx_sp_log_observed ON sp_confirmation_log(observed_at DESC);

ALTER TABLE sp_confirmation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service insert sp_log" ON sp_confirmation_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Public read sp_log" ON sp_confirmation_log FOR SELECT USING (true);

COMMENT ON TABLE sp_confirmation_log IS
  'KBO API SP 필드 시간대별 raw 스냅샷. Cloudflare Worker 매시간 cron 에서 적재 (Phase 2).';
COMMENT ON COLUMN sp_confirmation_log.home_sp_name IS
  'KBO API B_PIT_P_NM (홈 선발). null 또는 빈 문자열 = 미확정.';
COMMENT ON COLUMN sp_confirmation_log.away_sp_name IS
  'KBO API T_PIT_P_NM (원정 선발).';
