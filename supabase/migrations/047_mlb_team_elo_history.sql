-- 047_mlb_team_elo_history.sql (plan #25 Phase 2b step 1, cycle 2083 explore-idea heavy)
--
-- mlb_team_elo (046 migration) 는 UNIQUE(team_code, season) 현재 rating 스냅샷만
-- 저장 — KBO(predictions.home_elo/away_elo 가 매 경기 row 에 쌓여 시계열 자연 발생) 와
-- 달리 historical 시계열이 없어 matchup Elo 추이 차트(plan #24 Phase 2b 원래 목표)를
-- 재개할 수 없는 blocker 였음(cycle 2082 발견). 본 테이블이 경기별 사후 rating 스냅샷을
-- 별도 append — computeMlbEloHistory()(packages/kbo-data/src/factors/mlb-elo.ts)가
-- mlb_team_elo 와 동일 재생 루프에서 산출.
--
-- 더블헤더(같은 팀, 같은 game_date 2경기)는 UNIQUE(team_code, game_date) upsert 로
-- 2차전 이후 rating 만 남음 — 차트 목적상 일별 granularity 로 충분해 허용된 단순화.
--
-- RLS: mlb_schedule 이 038 migration 에서 활성화를 빠뜨렸던 사례(045, 사례 24) 재발
-- 차단 — 044/045/046 패턴 따라 생성 시점부터 포함.

CREATE TABLE IF NOT EXISTS mlb_team_elo_history (
  id         BIGSERIAL PRIMARY KEY,
  team_code  VARCHAR(5)   NOT NULL,
  game_date  DATE         NOT NULL,
  season     INT          NOT NULL,
  elo_rating DECIMAL(7,2) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (team_code, game_date)
);

CREATE INDEX IF NOT EXISTS idx_mlb_team_elo_history_team_date
  ON mlb_team_elo_history (team_code, game_date);

ALTER TABLE mlb_team_elo_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read mlb_team_elo_history"
  ON mlb_team_elo_history FOR SELECT
  USING (true);
