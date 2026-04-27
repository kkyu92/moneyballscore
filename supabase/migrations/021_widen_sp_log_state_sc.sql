-- ============================================
-- sp_confirmation_log.state_sc VARCHAR(2) → VARCHAR(20)
-- ============================================
-- migration 020 의 state_sc 는 KBO API GAME_STATE_SC ("1"/"2"/"3" 단일 문자) 만
-- 가정하고 VARCHAR(2). Phase 2 에 Naver 소스를 추가하면서 statusCode 가
-- "BEFORE"/"STARTED"/"LIVE"/"RESULT" 등 7자까지 가능 → INSERT 시 ERROR 22001
-- silent fail 가능 (CLAUDE.md 사례 3 패턴 재발 방지).
--
-- 양쪽 소스 raw 값을 그대로 보관하고 분석 시 source 분기로 해석.

ALTER TABLE sp_confirmation_log
  ALTER COLUMN state_sc TYPE VARCHAR(20);

COMMENT ON COLUMN sp_confirmation_log.state_sc IS
  'source 별 raw 상태값. kbo-official: GAME_STATE_SC ("1"/"2"/"3"). naver: statusCode ("BEFORE"/"LIVE"/"RESULT" 등).';
