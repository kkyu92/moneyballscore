-- PLAN_v5 Phase 2 — 파이프라인 재설계 메타데이터
-- 2026-04-20

-- predictions.predicted_at: 각 경기별 예측이 실제 생성된 시각.
-- created_at 은 DB row 삽입 시각과 동일하지만 향후 재계산/backfill 시나리오에서
-- 구분 필요. v2.0 튜닝 시 "경기 시작 몇 시간 전 예측이 가장 정확한가" 분석 기반.
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS predicted_at TIMESTAMPTZ;

UPDATE predictions
  SET predicted_at = created_at
  WHERE predicted_at IS NULL;

COMMENT ON COLUMN predictions.predicted_at IS
  '예측 실제 생성 시각. 경기 시작 몇 시간 전 예측인지 분석 메타데이터.';

-- daily_notifications: 하루 요약 알림 1회 전송 flag.
-- 동일한 하루에 여러 cron 이 "마지막 조각" 조건을 충족할 수 있어 idempotent 필요.
-- 예: SP 늦확정으로 expected 가 늘어나 조건 재충족 시 기존 row 업데이트 경로.
CREATE TABLE IF NOT EXISTS daily_notifications (
  run_date          DATE PRIMARY KEY,
  summary_sent      BOOLEAN DEFAULT FALSE,
  sent_at           TIMESTAMPTZ,
  prediction_count  INT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_notifications_date
  ON daily_notifications(run_date DESC);

ALTER TABLE daily_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read daily_notifications" ON daily_notifications
  FOR SELECT USING (true);

CREATE POLICY "Service insert daily_notifications" ON daily_notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service update daily_notifications" ON daily_notifications
  FOR UPDATE USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE daily_notifications IS
  '하루 1회 Telegram 요약 알림 전송 flag. 재실행 중복 전송 방지.';
