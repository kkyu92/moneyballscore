-- ============================================
-- pipeline_runs.mode VARCHAR(20) → VARCHAR(30)
-- ============================================
-- 사례 3 family 재발 (migration 019 와 동일 bug class, cycle 3055 발견).
-- MLB pipeline mode 'mlb_walk_forward_measure' 가 24자 — VARCHAR(20) 제약 초과.
-- INSERT 가 ERROR 22001 → supabase-js 가 .error 로 silent 리턴 (throw 안 함) →
-- mlb-pipeline.ts 의 .then(({ error: e }) => ...) 가 console.error + Sentry
-- capture 는 하지만, pipeline_runs 테이블엔 해당 run 의 row 가 영구히 누락되어
-- 대시보드/운영 쿼리에서 mlb_walk_forward_measure 실행 이력이 보이지 않음.
--
-- MLB 모드 전체 길이: mlb_statsapi_scrape(19) / mlb_fancy_scrape(16) /
-- mlb_savant_scrape(17) / mlb_predict_final(17) / mlb_shadow_train(16) /
-- mlb_walk_forward_measure(24) / mlb_elo_update(14). 30자로 향후 신규 모드
-- 추가 여유 확보.

ALTER TABLE pipeline_runs
  ALTER COLUMN mode TYPE VARCHAR(30);

COMMENT ON COLUMN pipeline_runs.mode IS
  'PipelineMode (KBO) | MlbPipelineMode (MLB). VARCHAR(30) — mlb_walk_forward_measure 24자 수용.';
