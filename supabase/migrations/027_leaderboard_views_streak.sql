-- 027: 리더보드 뷰에 current_streak 컬럼 추가
-- cycle 377 explore-idea: 게이미피케이션 강화 — 연속 정답 픽 수 표시
-- 기존 MyPicks 페이지엔 currentStreak 있음 (UserVsAIScorecard/WeeklyPicksSummary/MyPicksClient)
-- 리더보드엔 부재 → 픽 5개 이상 사용자 간 streak 경쟁 신호 노출

-- 주간 리더보드 (KST 기준 이번 주, 결과 확정 경기만, 최소 5픽)
CREATE OR REPLACE VIEW leaderboard_weekly AS
WITH ranked AS (
  SELECT
    up.nickname,
    up.device_id,
    up.picked_at,
    CASE
      WHEN (up.pick = 'home' AND g.home_team_id = g.winner_team_id)
        OR (up.pick = 'away' AND g.away_team_id = g.winner_team_id)
      THEN 1 ELSE 0
    END AS is_correct,
    ROW_NUMBER() OVER (PARTITION BY up.device_id ORDER BY up.picked_at DESC) AS rn_desc
  FROM user_picks up
  JOIN games g ON up.game_id = g.id
  WHERE g.status = 'final'
    AND g.winner_team_id IS NOT NULL
    AND up.picked_at >= date_trunc('week', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
),
streak_calc AS (
  SELECT
    device_id,
    COALESCE(
      MIN(CASE WHEN is_correct = 0 THEN rn_desc END) - 1,
      MAX(rn_desc)
    ) AS current_streak
  FROM ranked
  GROUP BY device_id
),
agg AS (
  SELECT
    nickname,
    device_id,
    COUNT(*) AS total,
    SUM(is_correct)::bigint AS correct
  FROM ranked
  GROUP BY nickname, device_id
  HAVING COUNT(*) >= 5
)
SELECT
  a.nickname,
  a.device_id,
  a.total,
  a.correct,
  ROUND(a.correct::numeric / NULLIF(a.total, 0) * 100, 1) AS accuracy_pct,
  COALESCE(sc.current_streak, 0)::int AS current_streak
FROM agg a
LEFT JOIN streak_calc sc ON a.device_id = sc.device_id
ORDER BY accuracy_pct DESC, total DESC;

-- 시즌 리더보드 (현재 시즌 전체, 최소 5픽)
CREATE OR REPLACE VIEW leaderboard_season AS
WITH ranked AS (
  SELECT
    up.nickname,
    up.device_id,
    up.picked_at,
    CASE
      WHEN (up.pick = 'home' AND g.home_team_id = g.winner_team_id)
        OR (up.pick = 'away' AND g.away_team_id = g.winner_team_id)
      THEN 1 ELSE 0
    END AS is_correct,
    ROW_NUMBER() OVER (PARTITION BY up.device_id ORDER BY up.picked_at DESC) AS rn_desc
  FROM user_picks up
  JOIN games g ON up.game_id = g.id
  WHERE g.status = 'final'
    AND g.winner_team_id IS NOT NULL
),
streak_calc AS (
  SELECT
    device_id,
    COALESCE(
      MIN(CASE WHEN is_correct = 0 THEN rn_desc END) - 1,
      MAX(rn_desc)
    ) AS current_streak
  FROM ranked
  GROUP BY device_id
),
agg AS (
  SELECT
    nickname,
    device_id,
    COUNT(*) AS total,
    SUM(is_correct)::bigint AS correct
  FROM ranked
  GROUP BY nickname, device_id
  HAVING COUNT(*) >= 5
)
SELECT
  a.nickname,
  a.device_id,
  a.total,
  a.correct,
  ROUND(a.correct::numeric / NULLIF(a.total, 0) * 100, 1) AS accuracy_pct,
  COALESCE(sc.current_streak, 0)::int AS current_streak
FROM agg a
LEFT JOIN streak_calc sc ON a.device_id = sc.device_id
ORDER BY accuracy_pct DESC, total DESC;
