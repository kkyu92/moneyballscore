-- PLAN_v5 후속 — skip 사유 관측
--
-- 배경: 4/18 LT-HH 17:00 경기 1건이 "왜 스킵됐는지" 사후 추적 불가. shouldPredictGame
-- 이 reason enum 을 리턴하지만 daily.ts 가 버리고 있었음. 동일 사고 재발 시 즉각
-- 판독 가능하도록 pipeline_runs 에 JSONB 로 보존.
--
-- 형식 예시:
-- [
--   {"game": "LTvHH@17:00", "reason": "sp_unconfirmed"},
--   {"game": "SSvLG@14:00", "reason": "window_too_late"}
-- ]

ALTER TABLE pipeline_runs
  ADD COLUMN IF NOT EXISTS skipped_detail JSONB;

COMMENT ON COLUMN pipeline_runs.skipped_detail IS
  'shouldPredictGame 이 스킵한 경기 목록 + 사유. reason: window_too_early | window_too_late | not_scheduled | sp_unconfirmed | already_predicted';
