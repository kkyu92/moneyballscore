-- 044_mlb_team_stats.sql
-- MLB 팀 시즌 통계 (FanGraphs + Baseball Savant) 저장 전용 테이블.
-- KBO team_season_stats (team_id FK INT) 과 분리 — MLB 는 팀 코드 string 사용 (mlb_schedule 패턴 정합).
-- mlb_fancy_scrape / mlb_savant_scrape 이 실제 스크래퍼(fangraphs-mlb.ts / baseball-savant.ts)를
-- 여기 upsert. 두 모드가 각자 담당 컬럼만 채움 (partial upsert, 나머지 컬럼 보존).

CREATE TABLE IF NOT EXISTS mlb_team_stats (
  id                BIGSERIAL PRIMARY KEY,
  team_code         VARCHAR(5)   NOT NULL,
  season            INT          NOT NULL,
  league            VARCHAR(10)  NOT NULL DEFAULT 'mlb',
  -- FanGraphs (fetchFangraphsMlbTeams)
  woba              DECIMAL(4,3),
  fip               DECIMAL(5,2),
  xfip              DECIMAL(5,2),
  war               DECIMAL(6,2),
  ld_pct            DECIMAL(5,2),
  gb_pct            DECIMAL(5,2),
  fb_pct            DECIMAL(5,2),
  iffb_pct          DECIMAL(5,2),
  hr_fb_pct         DECIMAL(5,2),
  pull_pct          DECIMAL(5,2),
  cent_pct          DECIMAL(5,2),
  oppo_pct          DECIMAL(5,2),
  fancy_synced_at   TIMESTAMPTZ,
  -- Baseball Savant (fetchSavantTeamStatcast)
  xwoba             DECIMAL(5,4),
  barrel_pct        DECIMAL(5,2),
  hard_hit_pct      DECIMAL(5,2),
  launch_angle      DECIMAL(5,2),
  savant_synced_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (team_code, season)
);

CREATE INDEX IF NOT EXISTS idx_mlb_team_stats_season
  ON mlb_team_stats (season);

ALTER TABLE mlb_team_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read mlb_team_stats"
  ON mlb_team_stats FOR SELECT
  USING (true);
