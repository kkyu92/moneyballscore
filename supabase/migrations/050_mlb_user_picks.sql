-- 050: MLB 개인 픽 기록 + 리더보드 참여 — mlb_user_picks 테이블
-- cycle 2255 explore-idea(heavy) plan #27 Phase 1: KBO user_picks(024)/pick_poll_events(025)
-- 는 "개인 기록용 vs 집계용" 분리 전례. MLB 는 mlb_pick_poll_events(048, 익명 집계 전용)만
-- 있고 nickname 식별 개인 기록이 없음 — 048 에 nickname 을 얹으면 역할 혼재되므로
-- 024/025 분리 전례를 따라 신규 테이블로 분리.
CREATE TABLE IF NOT EXISTS mlb_user_picks (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id         TEXT        NOT NULL,
  nickname          TEXT        NOT NULL CHECK (length(nickname) BETWEEN 2 AND 12),
  external_game_id  VARCHAR(20) NOT NULL REFERENCES mlb_schedule(external_game_id),
  pick              TEXT        NOT NULL CHECK (pick IN ('home', 'away')),
  picked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, external_game_id)
);

CREATE INDEX IF NOT EXISTS mlb_user_picks_device_id_idx ON mlb_user_picks (device_id);
CREATE INDEX IF NOT EXISTS mlb_user_picks_game_id_idx ON mlb_user_picks (external_game_id);
CREATE INDEX IF NOT EXISTS mlb_user_picks_picked_at_idx ON mlb_user_picks (picked_at);

ALTER TABLE mlb_user_picks ENABLE ROW LEVEL SECURITY;

-- 누구나 읽을 수 있음 (리더보드 조회, Phase 3 뷰 대비)
CREATE POLICY "public read" ON mlb_user_picks
  FOR SELECT USING (true);

-- KBO user_picks(024) 의 x-device-id 헤더 기반 anon insert 정책은 실제 사용처가
-- /api/leaderboard/sync (service role admin client) 뿐이라 (grep 확인, cycle 2255) —
-- mlb_pick_poll_events(048) 패턴처럼 service-role-only 로 단순화. anon 직접 insert 불허.
