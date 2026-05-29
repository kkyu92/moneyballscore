-- supabase/migrations/033_mlb_league_column.sql
-- MLB 도입 — 8 table league column 추가
-- 박제 결정: spec section 2.6 (A league column 통합)

ALTER TABLE predictions
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE pipeline_runs
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE agent_memories
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE team_season_stats
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE team_recent_form
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE head_to_head
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE stadium_stats
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE umpire_stats
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

-- index 추가 (cross-league query 효율)
CREATE INDEX IF NOT EXISTS idx_predictions_league_date
  ON predictions (league, game_date DESC);

CREATE INDEX IF NOT EXISTS idx_team_season_stats_league_season_team
  ON team_season_stats (league, season, team_code);
