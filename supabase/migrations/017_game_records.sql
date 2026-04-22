-- 017_game_records.sql — 경기별 boxscore 수집 테이블
--
-- 2026-04-22 추가. Naver `/schedule/games/{gameId}/record` 응답을 경기 단위로 저장.
-- 용도:
--   - 타자 경기별 기록 (타자 폼, 결장 감지)
--   - 투수 이닝·투구수 (불펜 피로도, 선발 부담)
--   - scoreBoard 이닝별 점수
--
-- JSONB 중심 설계 — Naver schema 변경 흡수. raw 전체도 별도 보존.

CREATE TABLE IF NOT EXISTS game_records (
  id                BIGSERIAL PRIMARY KEY,
  game_id           INT REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  status_code       VARCHAR(10),                    -- Naver statusCode: RESULT/STARTED/BEFORE/CANCEL
  score_board       JSONB,                          -- {rheb: {away, home}, inn: {away, home}}
  pitchers_home     JSONB,                          -- 배열: 홈팀 투수별 기록
  pitchers_away     JSONB,                          -- 배열: 원정팀 투수별 기록
  batters_home      JSONB,                          -- 배열: 홈팀 타자별 기록
  batters_away      JSONB,                          -- 배열: 원정팀 타자별 기록
  pitching_result   JSONB,                          -- 배열: W/L/S/H 투수
  game_info         JSONB,                          -- 네이버 gameInfo 전체
  raw               JSONB,                          -- 전체 recordData fallback
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id)
);

CREATE INDEX IF NOT EXISTS idx_game_records_game_id ON game_records(game_id);
CREATE INDEX IF NOT EXISTS idx_game_records_status ON game_records(status_code);
CREATE INDEX IF NOT EXISTS idx_game_records_fetched ON game_records(fetched_at);

-- updated_at 자동 갱신 — saveGameRecord 에서 명시적 SET 으로 처리.
-- (다른 테이블과 달리 공통 트리거 함수가 prod 에 없어 트리거 생략.)

-- RLS — 읽기는 공개 (익명 포함), 쓰기는 서비스 역할만
ALTER TABLE game_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_records read access"
  ON game_records FOR SELECT
  USING (true);

CREATE POLICY "game_records service role write"
  ON game_records FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE game_records IS 'Naver record API 기반 경기별 boxscore. v0.5.25 도입.';
