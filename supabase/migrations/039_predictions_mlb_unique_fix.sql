-- 039_predictions_mlb_unique_fix.sql
-- 038 의 partial index 제거 — mlb_predict_final 이 delete+insert 방식으로 전환.
-- partial index 는 PostgREST ON CONFLICT 와 비호환.

DROP INDEX IF EXISTS idx_predictions_mlb_unique;
