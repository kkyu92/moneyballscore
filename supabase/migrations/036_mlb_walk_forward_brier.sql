-- supabase/migrations/036_mlb_walk_forward_brier.sql
-- Walk-forward expanding window Brier 측정 박제
-- 박제 결정: spec section 2.7 milestone trigger + walk-forward

CREATE TABLE walk_forward_brier (
  id BIGSERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL,
  cohort_size INTEGER NOT NULL,
  brier_base DECIMAL(6,4) NOT NULL,
  brier_shadow DECIMAL(6,4) NOT NULL,
  delta DECIMAL(6,4) NOT NULL,
  league VARCHAR(10) NOT NULL DEFAULT 'mlb',
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT brier_base_range CHECK (brier_base >= 0 AND brier_base <= 1),
  CONSTRAINT brier_shadow_range CHECK (brier_shadow >= 0 AND brier_shadow <= 1),
  CONSTRAINT unique_month UNIQUE (league, month)
);

CREATE INDEX idx_walk_forward_league_month
  ON walk_forward_brier (league, month DESC);

CREATE INDEX idx_walk_forward_kill_switch
  ON walk_forward_brier (league, delta) WHERE delta < -0.02;

ALTER TABLE walk_forward_brier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read walk_forward_brier"
  ON walk_forward_brier FOR SELECT
  USING (true);
