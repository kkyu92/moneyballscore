-- supabase/migrations/035_mlb_shadow_weights.sql
-- Shadow C 학습 weights cohort 박제
-- 박제 결정: spec section 2.7 ★ (B 본선 + Shadow C)

CREATE TABLE shadow_weights (
  id BIGSERIAL PRIMARY KEY,
  cohort_size INTEGER NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  weights JSONB NOT NULL,
  brier DECIMAL(6,4) NOT NULL,
  accuracy DECIMAL(5,4) NOT NULL,
  league VARCHAR(10) NOT NULL DEFAULT 'mlb',
  trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cohort_size_positive CHECK (cohort_size > 0),
  CONSTRAINT brier_range CHECK (brier >= 0 AND brier <= 1),
  CONSTRAINT accuracy_range CHECK (accuracy >= 0 AND accuracy <= 1),
  CONSTRAINT unique_model_version UNIQUE (league, model_version)
);

CREATE INDEX idx_shadow_weights_league_trained
  ON shadow_weights (league, trained_at DESC);

ALTER TABLE shadow_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read shadow_weights"
  ON shadow_weights FOR SELECT
  USING (true);
