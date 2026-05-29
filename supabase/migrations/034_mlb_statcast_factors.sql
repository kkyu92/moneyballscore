-- supabase/migrations/034_mlb_statcast_factors.sql
-- MLB Statcast 4 column 추가 + UTC datetime 정합
-- 박제 결정: spec section 2.6 / Section 3 자가 검증 #7

ALTER TABLE predictions
  ADD COLUMN home_lineup_xwoba DECIMAL(5,4),
  ADD COLUMN away_lineup_xwoba DECIMAL(5,4),
  ADD COLUMN home_lineup_barrel_pct DECIMAL(5,2),
  ADD COLUMN away_lineup_barrel_pct DECIMAL(5,2),
  ADD COLUMN home_lineup_hard_hit_pct DECIMAL(5,2),
  ADD COLUMN away_lineup_hard_hit_pct DECIMAL(5,2),
  ADD COLUMN home_lineup_launch_angle DECIMAL(5,2),
  ADD COLUMN away_lineup_launch_angle DECIMAL(5,2);

-- range 검증 (사례 3 VARCHAR overflow 패턴 정합)
ALTER TABLE predictions
  ADD CONSTRAINT check_xwoba_range CHECK (
    (home_lineup_xwoba IS NULL OR (home_lineup_xwoba >= 0 AND home_lineup_xwoba <= 0.5))
    AND (away_lineup_xwoba IS NULL OR (away_lineup_xwoba >= 0 AND away_lineup_xwoba <= 0.5))
  ),
  ADD CONSTRAINT check_barrel_range CHECK (
    (home_lineup_barrel_pct IS NULL OR (home_lineup_barrel_pct >= 0 AND home_lineup_barrel_pct <= 30))
    AND (away_lineup_barrel_pct IS NULL OR (away_lineup_barrel_pct >= 0 AND away_lineup_barrel_pct <= 30))
  );

-- games UTC datetime (MLB 4 zone DST 변환 정합)
ALTER TABLE games
  ADD COLUMN game_datetime_utc TIMESTAMPTZ;

-- 기존 KBO row backfill (KST naive → UTC 변환)
UPDATE games
SET game_datetime_utc = (game_date::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
WHERE game_datetime_utc IS NULL;

ALTER TABLE games
  ALTER COLUMN game_datetime_utc SET NOT NULL;

-- index
CREATE INDEX IF NOT EXISTS idx_games_datetime_utc ON games (game_datetime_utc DESC);
