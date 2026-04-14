-- ============================================
-- v1.5 스키마 업데이트
-- 1. pitcher_stats: xfip 추가
-- 2. batter_stats: iso 추가
-- 3. team_season_stats 테이블 (팀 집계 + Elo)
-- 4. predictions: v1.5 팩터 컬럼 추가
-- ============================================

-- 1. pitcher_stats: xFIP 추가
ALTER TABLE pitcher_stats ADD COLUMN xfip DECIMAL(5,2);

-- 2. batter_stats: ISO 추가
ALTER TABLE batter_stats ADD COLUMN iso DECIMAL(4,3);

-- 3. 팀 시즌 집계 통계 (스크래퍼가 매일 upsert)
CREATE TABLE team_season_stats (
  id            SERIAL PRIMARY KEY,
  team_id       INT REFERENCES teams(id),
  season        INT NOT NULL,
  -- 타선
  team_woba     DECIMAL(4,3),
  team_wrc_plus INT,
  -- 투수진
  team_fip      DECIMAL(5,2),
  bullpen_fip   DECIMAL(5,2),
  -- 수비
  sfr           DECIMAL(6,2),
  -- Elo
  elo_rating    DECIMAL(7,2),
  elo_win_pct   DECIMAL(4,3),
  -- WAR
  total_war     DECIMAL(6,2),
  pitcher_war   DECIMAL(6,2),
  batter_war    DECIMAL(6,2),
  -- 메타
  last_synced   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, season)
);

CREATE INDEX idx_team_season_stats ON team_season_stats(team_id, season);

-- RLS
ALTER TABLE team_season_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read team_season_stats" ON team_season_stats FOR SELECT USING (true);
CREATE POLICY "Service insert team_season_stats" ON team_season_stats FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service update team_season_stats" ON team_season_stats FOR UPDATE
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service delete team_season_stats" ON team_season_stats FOR DELETE
  USING (auth.role() = 'service_role');

-- 4. predictions: v1.5 추가 팩터 컬럼
ALTER TABLE predictions ADD COLUMN home_sp_xfip DECIMAL(5,2);
ALTER TABLE predictions ADD COLUMN away_sp_xfip DECIMAL(5,2);
ALTER TABLE predictions ADD COLUMN home_elo DECIMAL(7,2);
ALTER TABLE predictions ADD COLUMN away_elo DECIMAL(7,2);
ALTER TABLE predictions ADD COLUMN home_sfr DECIMAL(6,2);
ALTER TABLE predictions ADD COLUMN away_sfr DECIMAL(6,2);
ALTER TABLE predictions ADD COLUMN factors JSONB;
