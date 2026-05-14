-- 026: 리더보드 뷰 status 버그 수정 — 'completed' → 'final'
-- cycle 374 review-code heavy: games.status 는 'final' (live.ts 274, daily.ts 529)
-- 기존 뷰가 'completed' 필터 → 항상 0건 리턴 (리더보드 silent 사망)

-- 주간 리더보드 (KST 기준 이번 주, 결과 확정 경기만, 최소 5픽)
CREATE OR REPLACE VIEW leaderboard_weekly AS
SELECT
  nickname,
  device_id,
  total,
  correct,
  ROUND(correct::numeric / NULLIF(total, 0) * 100, 1) AS accuracy_pct
FROM (
  SELECT
    up.nickname,
    up.device_id,
    COUNT(*) AS total,
    COUNT(CASE
      WHEN (up.pick = 'home' AND g.home_team_id = g.winner_team_id)
        OR (up.pick = 'away' AND g.away_team_id = g.winner_team_id)
      THEN 1 END
    ) AS correct
  FROM user_picks up
  JOIN games g ON up.game_id = g.id
  WHERE g.status = 'final'
    AND g.winner_team_id IS NOT NULL
    AND up.picked_at >= date_trunc('week', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
  GROUP BY up.nickname, up.device_id
  HAVING COUNT(*) >= 5
) sub
ORDER BY accuracy_pct DESC, total DESC;

-- 시즌 리더보드 (현재 시즌 전체, 최소 5픽)
CREATE OR REPLACE VIEW leaderboard_season AS
SELECT
  nickname,
  device_id,
  total,
  correct,
  ROUND(correct::numeric / NULLIF(total, 0) * 100, 1) AS accuracy_pct
FROM (
  SELECT
    up.nickname,
    up.device_id,
    COUNT(*) AS total,
    COUNT(CASE
      WHEN (up.pick = 'home' AND g.home_team_id = g.winner_team_id)
        OR (up.pick = 'away' AND g.away_team_id = g.winner_team_id)
      THEN 1 END
    ) AS correct
  FROM user_picks up
  JOIN games g ON up.game_id = g.id
  WHERE g.status = 'final'
    AND g.winner_team_id IS NOT NULL
  GROUP BY up.nickname, up.device_id
  HAVING COUNT(*) >= 5
) sub
ORDER BY accuracy_pct DESC, total DESC;
