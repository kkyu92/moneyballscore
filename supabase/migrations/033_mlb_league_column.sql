-- supabase/migrations/033_mlb_league_column.sql
-- MLB 도입 — 5 table league column 추가 (cycle 1151 fix: 3 missing table + broken index 제거)
-- 박제 결정: spec section 2.6 (A league column 통합)
--
-- cycle 1151 fix (cycle 1149 root cause): 본 migration 안 다음 항목들이 prod transaction 롤백 유발 → 033-037 cascade 미적용:
--   1. 본 migration 가 3 missing table (team_recent_form, head_to_head, stadium_stats) 에 ALTER 시도 — 본 3 table prod 부재 (git/코드 안 사용 X, spec design 미실현). 해당 ALTER 라인 제거
--   2. predictions league/game_date 복합 인덱스 — predictions.game_date 컬럼 부재 (games join 필요). 037 가 (league, game_id DESC) corrected 박제. 본 인덱스 정의 제거

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

ALTER TABLE umpire_stats
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

-- index 추가 (cross-league query 효율)
-- cycle 1151 fix: team_code 컬럼 부재 → team_id 로 정정 (team_season_stats.team_id 가 정답, team_code 는 teams 테이블)
CREATE INDEX IF NOT EXISTS idx_team_season_stats_league_season_team
  ON team_season_stats (league, season, team_id);
