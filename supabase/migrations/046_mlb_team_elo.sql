-- 046_mlb_team_elo.sql (plan #25 Phase 1, cycle 2080 explore-idea heavy)
--
-- MLB 는 KBO 와 달리 팀별 Elo rating 을 계산/저장한 적이 없음 (plan #24 Phase 2b 가
-- 'MLB matchup Elo 추이 차트' 를 시도하다 발견, cycle 2057 BLOCKED — mlb-pipeline.ts
-- runPredictFinal 이 모든 예측에 elo:{home:ELO_NEUTRAL,away:ELO_NEUTRAL} 고정 사용).
-- KBO Elo (predictions.home_elo/away_elo) 도 자체 K-factor 갱신 로직이 없고 KBO Fancy
-- Stats 외부 스크랩 스냅샷을 그대로 저장하는 구조라 포팅할 기존 로직도 없음 —
-- team_season_stats.elo_rating (003 migration) 은 dead schema (참조 0건), 그 실수를
-- 반복하지 않기 위해 실제 consumer(백테스트/UI, Phase 2-3) 를 만들기 전엔 이 테이블만
-- 신규로 분리 (mlb_team_stats 컬럼 추가 대신).
--
-- RLS: mlb_schedule 이 038 migration 에서 활성화를 빠뜨려 anon 경로가 막혔던 사례
-- (045_mlb_schedule_rls.sql, 사례 24) 재발 차단 — 044/045 패턴 따라 생성 시점부터 포함.

CREATE TABLE IF NOT EXISTS mlb_team_elo (
  id           BIGSERIAL PRIMARY KEY,
  team_code    VARCHAR(5)     NOT NULL,
  season       INT            NOT NULL,
  elo_rating   DECIMAL(7,2)   NOT NULL,
  games_played INT            NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (team_code, season)
);

CREATE INDEX IF NOT EXISTS idx_mlb_team_elo_season
  ON mlb_team_elo (season);

ALTER TABLE mlb_team_elo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read mlb_team_elo"
  ON mlb_team_elo FOR SELECT
  USING (true);
