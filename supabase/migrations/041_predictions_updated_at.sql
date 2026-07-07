-- predictions.updated_at 추가 — cycle 1479
-- verify 파이프라인 UPDATE (is_correct / actual_winner) 시각 추적
-- Brier drift 진단 단순화: created_at vs updated_at 비교로 예측 후 변경 즉시 파악

-- shared trigger function (다른 테이블에도 재사용 가능)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- predictions 테이블에 updated_at 추가
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 자동 갱신 트리거
DROP TRIGGER IF EXISTS set_predictions_updated_at ON predictions;
CREATE TRIGGER set_predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
