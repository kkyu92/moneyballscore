-- Migration 016: pitcher_stats snapshot history
--
-- 배경: daily.ts 가 fetchPitcherStats 를 인메모리로만 사용하고 pitcher_stats
-- 테이블은 미활용. 시점별 스냅샷이 없어 "경기 시점의 SP FIP" 같은 진짜 시점별
-- 팩터 불가능. factor-correlation 분석 / v2.0 튜닝의 구조적 제약.
--
-- 해결: 주간 cron 이 매주 일요일 자정 KST (UTC 15:00 Sat) 현재 Fancy Stats +
-- KBO 공식 값을 snapshot 으로 pitcher_stats 에 upsert. captured_at 컬럼으로
-- 시점 구분. 몇 주 쌓이면 "경기 ≤ 가장 근접한 snapshot" 매칭으로 시점별 팩터.
--
-- 변경사항:
--   1) xfip 컬럼 추가 (Fancy Stats 에서 fetch 중이나 테이블에 없었음)
--   2) captured_at DATE 컬럼 추가 (default CURRENT_DATE)
--   3) UNIQUE 제약 (player_id, season) → (player_id, season, captured_at)
--   4) source VARCHAR 추가 ('fancy-stats' | 'kbo-basic1' | 'merged')
--   5) 인덱스 (player_id, captured_at DESC) — 경기 시점 근접 snapshot 조회용
--
-- Idempotent: 기존 row 는 오늘 (captured_at = CURRENT_DATE) snapshot 으로 유지
-- 되며 향후 snapshot 은 별개 row 로 저장.

BEGIN;

-- 1. xfip 추가
ALTER TABLE pitcher_stats ADD COLUMN IF NOT EXISTS xfip DECIMAL(5,2);

-- 2. source 추가
ALTER TABLE pitcher_stats ADD COLUMN IF NOT EXISTS source VARCHAR(20);

-- 3. captured_at 추가 (default: 오늘 — 기존 row 보존)
ALTER TABLE pitcher_stats ADD COLUMN IF NOT EXISTS captured_at DATE DEFAULT CURRENT_DATE NOT NULL;

-- 4. 기존 UNIQUE 제약 제거 후 (player_id, season, captured_at) 로 재작성
ALTER TABLE pitcher_stats DROP CONSTRAINT IF EXISTS pitcher_stats_player_id_season_key;
ALTER TABLE pitcher_stats ADD CONSTRAINT pitcher_stats_player_season_captured_key
  UNIQUE(player_id, season, captured_at);

-- 5. 시점 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_pitcher_stats_player_captured
  ON pitcher_stats(player_id, captured_at DESC);

-- 6. season 범위 조회 인덱스 (전체 시즌 snapshot 조회)
CREATE INDEX IF NOT EXISTS idx_pitcher_stats_season_captured
  ON pitcher_stats(season, captured_at DESC);

COMMIT;

COMMENT ON COLUMN pitcher_stats.captured_at IS
  'Snapshot 시점. 매주 cron 으로 현재 시즌 스탯 적재. "경기 ≤ 근접 snapshot" 매칭으로 시점별 팩터 복원.';
COMMENT ON COLUMN pitcher_stats.source IS
  'fancy-stats: KBO Fancy Stats /leaders/. kbo-basic1: KBO 공식 PitcherBasic. merged: 두 소스 합성.';
COMMENT ON COLUMN pitcher_stats.xfip IS
  'Expected FIP — HR/FB 리그 평균 가정. Fancy Stats 전용. KBO 공식에서 가져올 땐 fip 와 동일값으로 보수적 처리.';
