-- Phase v4-4 Task 4
-- 시즌 리더보드에서 factor 오답률 top 3 집계용 view.
--
-- post_game row의 reasoning->'factorErrors' JSONB array를 unnest해서
-- factor별 등장 빈도 계산. ISR 1시간 캐싱이라 일반 view로 충분.
-- 리그 확장(10k+ 경기) 시 materialized view로 전환 검토 (Eng 리뷰 A5).

CREATE OR REPLACE VIEW factor_error_summary AS
SELECT
  fe->>'factor'                                 AS factor,
  COUNT(*)                                      AS error_count,
  ROUND(AVG((fe->>'predictedBias')::numeric), 3) AS avg_bias
FROM
  predictions,
  jsonb_array_elements(reasoning->'factorErrors') AS fe
WHERE
  prediction_type = 'post_game'
  AND reasoning ? 'factorErrors'
GROUP BY
  fe->>'factor'
ORDER BY
  error_count DESC;

COMMENT ON VIEW factor_error_summary IS
  'v4-4 Task 4: post_game factor 오답률 집계. /analysis/leaderboard 에서 사용.';
