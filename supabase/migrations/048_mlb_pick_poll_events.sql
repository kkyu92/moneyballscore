-- 048: MLB 익명 픽 집계 — mlb_pick_poll_events 테이블
-- cycle 2223 explore-idea: pick_poll_events(025) 는 game_id INT REFERENCES games(id) 라
-- KBO 전용 — MLB 는 external_game_id VARCHAR(20) (mlb_schedule, migration 038) 이라
-- 타입 자체가 안 맞아 재사용 불가. 별도 테이블로 커뮤니티 픽 parity 확보.

CREATE TABLE IF NOT EXISTS mlb_pick_poll_events (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_game_id  VARCHAR(20)  NOT NULL REFERENCES mlb_schedule(external_game_id),
  pick              TEXT         NOT NULL CHECK (pick IN ('home', 'away')),
  device_id         TEXT         NOT NULL,
  picked_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (device_id, external_game_id)
);

CREATE INDEX IF NOT EXISTS mlb_pick_poll_events_game_id_idx ON mlb_pick_poll_events (external_game_id);
CREATE INDEX IF NOT EXISTS mlb_pick_poll_events_picked_at_idx ON mlb_pick_poll_events (picked_at);

ALTER TABLE mlb_pick_poll_events ENABLE ROW LEVEL SECURITY;

-- 누구나 읽을 수 있음 (poll 조회)
CREATE POLICY "public read" ON mlb_pick_poll_events
  FOR SELECT USING (true);

-- 서버사이드 route 가 service role 로 upsert (RLS bypass, pick_poll_events 와 동일 패턴)
-- anon 클라이언트 직접 insert 불허 — API route 통해서만
