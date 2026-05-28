-- 032: 리더보드 시즌별 분할 — monthly / all-time 뷰 추가
-- cycle 1021 c10 carry-over: 사용자 가시 KBO 강화 — leaderboard 시즌별 분할
-- 기존 weekly / season 유지 (RLS 호환), monthly + all 신규 추가
-- monthly = KST 기준 현재 월 (date_trunc('month') AT TIME ZONE 'Asia/Seoul')
-- all = 전체 누적 (기간 필터 없음, season 과 별개 = season 은 KBO 정규 시즌 한정 미래 확장 여지)
-- 027 (streak) 구조 그대로 차용 — ROW_NUMBER 기반 current_streak 계산.

CREATE OR REPLACE VIEW leaderboard_monthly AS
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
    AND up.picked_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
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

-- 전체 누적 (기간 필터 없음, 최소 5픽)
CREATE OR REPLACE VIEW leaderboard_all AS
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
