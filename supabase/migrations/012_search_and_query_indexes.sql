-- Migration 012: 검색 + 페이지 쿼리 성능 인덱스
--
-- 배경:
--   - 011까지 인덱스는 주로 cron/파이프라인 쿼리 위주.
--   - v0.5.18에서 /search 페이지(선수 ILIKE), /teams/[code], /matchup/[a]/[b] 추가
--     → 매 페이지 호출마다 predictions 전체 스캔 + players ILIKE 풀텍스트.
--
-- 추가 인덱스:
--   1. games(game_date) standalone
--      기존 (league_id, game_date) 복합은 league_id 없이 사용 시 안 잡힘.
--      예측 페이지 / 검색 / 리뷰가 game_date alone 으로 조회.
--
--   2. games(home_team_id), games(away_team_id)
--      buildTeamProfile / buildMatchupProfile 가 SQL 레벨 필터링으로 전환.
--      각 팀/매치업 페이지 풀스캔 → indexed lookup.
--
--   3. players(team_id)
--      팀 프로필 투수 leaderboard, /teams/[code] 페이지.
--
--   4. pg_trgm + GIN on players(name_ko, name_en)
--      /search 페이지 ILIKE '%query%' 패턴 검색 가속.
--      한글 부분 일치 + 영문 prefix/contain 모두 커버.
--
-- 모든 인덱스는 IF NOT EXISTS 로 멱등성 보장.

CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date DESC);
CREATE INDEX IF NOT EXISTS idx_games_home_team ON games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away_team ON games(away_team_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);

-- pg_trgm: 한글 ILIKE 부분 검색 가속
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_players_name_ko_trgm
  ON players USING GIN (name_ko gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_players_name_en_trgm
  ON players USING GIN (name_en gin_trgm_ops);
