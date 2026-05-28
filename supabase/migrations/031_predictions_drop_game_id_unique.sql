-- 031_predictions_drop_game_id_unique.sql
-- M-V2 shadow cohort wiring — 잔여 UNIQUE 제거 (cycle 1014 Day 2)
--
-- 배경: mig 030 가 composite UNIQUE (game_id, prediction_type, scoring_rule) 신규
-- 박제. 그러나 001_initial_schema.sql line 7 안 `game_id INT REFERENCES games(id) UNIQUE`
-- column-level UNIQUE 가 그대로 살아있음 → 동일 game_id 두 번째 row insert 시 23505
-- conflict 재발. backfill / forward shadow row 둘 다 silent skip.
--
-- 변경: column-level UNIQUE constraint (auto-generated name = predictions_game_id_key)
-- 제거. composite UNIQUE (mig 030) 만 effective.
--
-- 안전:
--   - 기존 rows 무영향 (DROP CONSTRAINT 만, data 변동 X)
--   - composite UNIQUE 가 동일 (game_id, prediction_type='pre_game', scoring_rule='v1.8')
--     중복 방지 — application-level 중복 insert 막힘 그대로 유지
--   - shadow row scoring_rule='v2.1-B-shadow' 는 v1.8 row 와 composite 안 다른 키 →
--     2 row 양립 OK
--
-- Rollback: ALTER TABLE predictions ADD CONSTRAINT predictions_game_id_key UNIQUE (game_id);
-- 단 그 사이 누적 shadow rows 는 DELETE 필요.

ALTER TABLE predictions
  DROP CONSTRAINT IF EXISTS predictions_game_id_key;

COMMENT ON TABLE predictions IS
  'KBO 승부예측. UNIQUE (game_id, prediction_type, scoring_rule) — production v1.8 + shadow v2.1-B-shadow row 양립 (mig 031 column-level UNIQUE 제거 후).';
