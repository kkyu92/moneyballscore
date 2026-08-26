-- daily_notifications 에 credit_exhausted idempotent flag 추가
-- 2026-08-26 (cycle 2640)
--
-- 배경: daily.ts CREDIT_EXHAUSTED alert 블록 주석은 "predict/predict_final
-- mode 에서 1회만 발화 (최초 발화 cron 에서만)" 이라 주장하지만 실제 코드엔
-- dedup 장치가 전혀 없음 — predict mode 는 10-21시 매시 (최대 12회/일) 실행되고
-- captureCreditExhaustedAlert 자체도 무조건 Sentry.captureMessage +
-- notifyError(Telegram) 를 호출. CREDIT_EXHAUSTED 가 2026-06-06 부터 지속 상태라
-- 해당 기간 매 predict 실행마다 중복 알림 발송 가능 (silent-drift family,
-- cycle 2640 review-code heavy 발견).

ALTER TABLE daily_notifications
  ADD COLUMN IF NOT EXISTS credit_exhausted_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credit_exhausted_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN daily_notifications.credit_exhausted_sent IS
  'CREDIT_EXHAUSTED debate fallback Telegram/Sentry 알림 발송 여부. 같은 날 predict/predict_final 반복 실행 시 중복 발송 차단.';
