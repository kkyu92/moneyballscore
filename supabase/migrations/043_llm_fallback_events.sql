-- llm_fallback_events: CREDIT_EXHAUSTED 자동 failover 이벤트 로그
-- cycle 1495 LLM_BACKEND_FALLBACK observability Layer B
-- 매 CREDIT_EXHAUSTED → fallback 활성화 시 1 row insert.
-- pipeline_run_id / prediction_id nullable — 컨텍스트 정보 선택 첨부.

CREATE TABLE IF NOT EXISTS llm_fallback_events (
  id               BIGSERIAL PRIMARY KEY,
  ts               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model            VARCHAR(32) NOT NULL,   -- 'haiku' | 'sonnet'
  fallback_to      VARCHAR(16) NOT NULL,   -- 'deepseek' | 'ollama'
  pipeline_run_id  BIGINT      REFERENCES pipeline_runs(id) ON DELETE SET NULL,
  prediction_id    BIGINT      REFERENCES predictions(id)   ON DELETE SET NULL,
  error_snippet    TEXT
);

CREATE INDEX IF NOT EXISTS idx_llm_fallback_events_ts
  ON llm_fallback_events (ts DESC);

COMMENT ON TABLE llm_fallback_events IS
  'CREDIT_EXHAUSTED 자동 failover 이벤트 — callLLM() 안 fallback 활성화 기록. cohort Brier split source.';
