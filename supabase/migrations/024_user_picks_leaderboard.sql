-- 024: 픽 리더보드 — user_picks 테이블 + leaderboard 뷰
-- cycle 312 explore-idea: 전체 랭킹 (주간/시즌), 닉네임 기반 no-login

CREATE TABLE IF NOT EXISTS user_picks (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id  TEXT        NOT NULL,
  nickname   TEXT        NOT NULL CHECK (length(nickname) BETWEEN 2 AND 12),
  game_id    INT         NOT NULL REFERENCES games(id),
  pick       TEXT        NOT NULL CHECK (pick IN ('home', 'away')),
  picked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, game_id)
);

CREATE INDEX IF NOT EXISTS user_picks_device_id_idx ON user_picks (device_id);
CREATE INDEX IF NOT EXISTS user_picks_game_id_idx ON user_picks (game_id);
CREATE INDEX IF NOT EXISTS user_picks_picked_at_idx ON user_picks (picked_at);

ALTER TABLE user_picks ENABLE ROW LEVEL SECURITY;

-- 누구나 읽을 수 있음 (리더보드 조회)
CREATE POLICY "public read" ON user_picks
  FOR SELECT USING (true);

-- anon 클라이언트가 Supabase JS에서 global.headers로 x-device-id를 전달해야 insert 허용:
--   createBrowserClient(url, key, { global: { headers: { 'x-device-id': deviceId } } })
CREATE POLICY "own insert" ON user_picks
  FOR INSERT WITH CHECK (
    device_id = COALESCE(
      current_setting('request.headers', true)::json->>'x-device-id',
      ''
    )
  );

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
  WHERE g.status = 'completed'
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
  WHERE g.status = 'completed'
    AND g.winner_team_id IS NOT NULL
  GROUP BY up.nickname, up.device_id
  HAVING COUNT(*) >= 5
) sub
ORDER BY accuracy_pct DESC, total DESC;
