-- ============================================
-- pipeline_runs.mode VARCHAR(10) → VARCHAR(20)
-- ============================================
-- 사례 3 (predictions.model_version 'v2.0-debate' 11자 overflow) 와 동일 패턴.
-- 'predict_final' (13자) 모드 INSERT 가 VARCHAR(10) 제약에 막혀 ERROR 22001 →
-- supabase-js 가 .error 로 silent 리턴 → finish() 의 try/catch 도 안 잡힘 →
-- 4/25, 4/26 의 predict_final cron 결과가 pipeline_runs 에 한 row 도 안 남음
-- (GH Actions 에는 success 로 fire 되고 API 도 200 응답).

ALTER TABLE pipeline_runs
  ALTER COLUMN mode TYPE VARCHAR(20);

COMMENT ON COLUMN pipeline_runs.mode IS
  'PipelineMode: announce | predict | predict_final | verify. VARCHAR(20) — predict_final 13자 수용.';
