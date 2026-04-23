-- daily_notifications 에 announce / results idempotent flag 추가
-- 2026-04-23
--
-- 배경: GitHub Actions schedule cron 이 간헐적으로 동일 cron expression 을
-- 2회 fire 하는 현상 관측 (매일 UTC 14 cron 이 14:03, 14:49 에 각각 실행).
-- 기존 summary_sent 는 notifyPredictions 만 보호. notifyAnnounce + notifyResults
-- 는 idempotent 장치 없어 동일 메시지 2회 발송 발생 (2026-04-22 23:03, 23:50 KST).

ALTER TABLE daily_notifications
  ADD COLUMN IF NOT EXISTS announce_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS announce_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS results_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS results_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS results_count INT;

COMMENT ON COLUMN daily_notifications.announce_sent IS
  '하루 예고 Telegram 알림 (09:00 KST) 발송 여부. cron 중복 fire 차단.';

COMMENT ON COLUMN daily_notifications.results_sent IS
  '하루 결과 Telegram 알림 (23:00 KST verify) 발송 여부. cron 중복 fire 차단.';
