-- 030_predictions_unique_game_rule.sql
-- M-V2 shadow cohort wiring (cycle 1013 2026-05-28)
--
-- 배경: 2-day blast plan M-V2 — 동일 경기에 production (v1.8) + shadow (v2.1-B-shadow)
-- row 양쪽 누적 필요. 기존 UNIQUE(game_id, prediction_type) 가 같은 prediction_type
-- ='pre_game' 에 1 row 만 허용 → shadow row insert 시 23505 conflict.
--
-- 변경: UNIQUE 키에 scoring_rule 추가 → (game_id, prediction_type, scoring_rule).
-- production v1.8 row 와 shadow v2.1-B-shadow row 가 scoring_rule 차이로 양립.
--
-- 안전:
--   - 기존 rows: 모두 distinct (game_id, prediction_type) 인 상태 → scoring_rule 추가해도
--     conflict 없음.
--   - NULL scoring_rule rows: PostgreSQL composite UNIQUE 안 NULL 허용 (multiple NULLs OK).
--     단 새로 insert 하는 shadow row 는 항상 NOT NULL scoring_rule → 기존 NULL row 와 무관.
--   - daily.ts INSERT 안 23505 catch path 는 그대로 동작 (race 시 first-write-wins).
--
-- Rollback: 기존 제약 복원 (단 그 사이 누적된 shadow rows 는 DELETE 필요).

ALTER TABLE predictions
  DROP CONSTRAINT IF EXISTS predictions_game_type_unique;

ALTER TABLE predictions
  ADD CONSTRAINT predictions_game_type_rule_unique
  UNIQUE (game_id, prediction_type, scoring_rule);

COMMENT ON CONSTRAINT predictions_game_type_rule_unique ON predictions IS
  'M-V2 shadow cohort 양립 — production (v1.8) + shadow (v2.1-B-shadow) row 같은 경기 양쪽 누적 허용 (cycle 1013)';
