-- predictions.llm_backend: 예측 생성에 사용된 LLM 백엔드 추적
-- cycle 1495 LLM_BACKEND_FALLBACK observability Layer A
-- values: 'claude' (기본값) / 'deepseek' / 'ollama'
-- NULL = 기존 행 (백필 불필요 — 당시 claude 단일 백엔드)

ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS llm_backend VARCHAR(16) DEFAULT NULL;

COMMENT ON COLUMN predictions.llm_backend IS
  'LLM 백엔드: claude (기본) / deepseek / ollama. NULL = CREDIT_EXHAUSTED observability 추가 전 행.';
