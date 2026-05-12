-- 025: 익명 픽 집계 — pick_poll_events 테이블
-- cycle 327 explore-idea: 모든 사용자(닉네임 불필요) 픽을 community poll에 집계

CREATE TABLE IF NOT EXISTS pick_poll_events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id    INT        NOT NULL REFERENCES games(id),
  pick       TEXT       NOT NULL CHECK (pick IN ('home', 'away')),
  device_id  TEXT       NOT NULL,
  picked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, game_id)
);

CREATE INDEX IF NOT EXISTS pick_poll_events_game_id_idx ON pick_poll_events (game_id);
CREATE INDEX IF NOT EXISTS pick_poll_events_picked_at_idx ON pick_poll_events (picked_at);

ALTER TABLE pick_poll_events ENABLE ROW LEVEL SECURITY;

-- 누구나 읽을 수 있음 (poll 조회)
CREATE POLICY "public read" ON pick_poll_events
  FOR SELECT USING (true);

-- 서버사이드 route 가 service role 로 upsert (RLS bypass)
-- anon 클라이언트 직접 insert 불허 — API route 통해서만
