-- 038_mlb_schedule.sql
-- MLB 경기 일정 저장 전용 테이블.
-- KBO games 테이블 (home_team_id FK INT) 과 분리 — MLB 는 팀 코드 string 사용.
-- mlb_statsapi_scrape → 여기 upsert / mlb_predict_final → 여기서 read.

CREATE TABLE IF NOT EXISTS mlb_schedule (
  id                 BIGSERIAL PRIMARY KEY,
  external_game_id   VARCHAR(20)  NOT NULL UNIQUE,
  game_date          DATE         NOT NULL,
  game_datetime_utc  TIMESTAMPTZ  NOT NULL,
  home_team_code     VARCHAR(5)   NOT NULL,
  away_team_code     VARCHAR(5)   NOT NULL,
  status             VARCHAR(20)  NOT NULL DEFAULT 'scheduled',
  home_score         INT,
  away_score         INT,
  league             VARCHAR(10)  NOT NULL DEFAULT 'mlb',
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mlb_schedule_game_date
  ON mlb_schedule (game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_schedule_date_status
  ON mlb_schedule (game_date, status);

-- predictions 테이블 MLB 확장 컬럼
-- game_id (KBO FK) 와 공존 — MLB rows 는 game_id=NULL, external_game_id=SET.
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS external_game_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS home_win_prob     FLOAT,
  ADD COLUMN IF NOT EXISTS mlb_game_date     DATE;

-- MLB 전용 중복 방지 인덱스 (external_game_id NOT NULL 행만 적용)
CREATE UNIQUE INDEX IF NOT EXISTS idx_predictions_mlb_unique
  ON predictions (external_game_id, scoring_rule)
  WHERE external_game_id IS NOT NULL;
