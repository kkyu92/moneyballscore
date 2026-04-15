-- ============================================
-- Phase v4-2 후속: predictions.model_version 길이 확장
-- ============================================
-- 사전 버그(Phase C/D 통합 시점): daily.ts가 'v2.0-debate' (11자)를
-- VARCHAR(10) 컬럼에 insert하려 해서 ERROR 22001 발생.
-- daily.ts upsert에 .error 체크가 없어 silently 실패했고, 이로 인해
-- Claude API 키가 설정된 환경에서는 prediction row가 새로 생성되지 않는
-- 사고가 git 디버그 커밋 3건의 원인이었음. v4-2 검증 중 SQL 직접
-- INSERT 시도로 발견.
--
-- 수정: 길이 20으로 widen. 'v2.0-debate' (11), 'v2.0-debate-fb' (14) 등 수용.

ALTER TABLE predictions
  ALTER COLUMN model_version TYPE VARCHAR(20);

COMMENT ON COLUMN predictions.model_version IS
  '정량 + 토론 모델 버전. 예: v1.5 (정량만), v2.0-debate (토론 통합).';
