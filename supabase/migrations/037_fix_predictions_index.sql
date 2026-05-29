-- 037_fix_predictions_index.sql
-- Migration 033 안 `idx_predictions_league_date` 인덱스가 predictions 테이블에 없는 `game_date` 컬럼을 참조.
-- predictions 안 `game_date` 컬럼 부재 (`game_date` 는 games 테이블에 위치) → 033 apply 시 FAIL.
--
-- autoplan cycle 1023 Eng review CRITICAL #1 #2 → cycle 1024 fix-incident.
--
-- Fix: 잘못된 index 제거 + games join 통한 query 패턴 활용 안 league + game_id 정합 index 재박제.

DROP INDEX IF EXISTS idx_predictions_league_date;

CREATE INDEX IF NOT EXISTS idx_predictions_league_game_id
  ON predictions (league, game_id DESC);
