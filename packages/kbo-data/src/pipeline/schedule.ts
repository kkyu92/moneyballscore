/**
 * PLAN_v5 §5.2 — 경기별 예측 스케줄링 결정 함수
 *
 * 매 정시 cron (KST 10-22) 이 "경기 시작 3시간 이내 + scheduled + SP 확정 +
 * 아직 예측 없음" 인 경기만 타겟. 같은 경기가 여러 cron 윈도우에 걸쳐
 * 들어가도 first-write-wins (ON CONFLICT DO NOTHING) 으로 1회만 저장.
 */

import type { ScrapedGame } from '../types';

export type ShouldPredictReason =
  | 'window_too_early'
  | 'window_too_late'
  | 'not_scheduled'
  | 'sp_unconfirmed'
  | 'already_predicted'
  | 'ok';

export interface ShouldPredictResult {
  shouldPredict: boolean;
  reason: ShouldPredictReason;
}

/**
 * 개별 경기가 현재 cron 에서 predict 대상인지 결정.
 *
 * @param game - KBO API scraped game
 * @param existingPredictedGameIds - 이미 pre_game 예측이 저장된 games.id 집합
 * @param gameDbId - 해당 경기의 games 테이블 id (없으면 null)
 * @param nowMs - 현재 시각 (Date.now(), 테스트 시 mock)
 * @param windowHours - 윈도우 크기 (기본 3)
 */
export function shouldPredictGame(
  game: ScrapedGame,
  existingPredictedGameIds: Set<number>,
  gameDbId: number | null,
  nowMs: number,
  windowHours = 3,
): ShouldPredictResult {
  const startMs = new Date(`${game.date}T${game.gameTime}+09:00`).getTime();
  const hoursUntil = (startMs - nowMs) / 3_600_000;

  if (hoursUntil < 0) {
    return { shouldPredict: false, reason: 'window_too_late' };
  }
  if (hoursUntil > windowHours) {
    return { shouldPredict: false, reason: 'window_too_early' };
  }
  if (game.status !== 'scheduled') {
    return { shouldPredict: false, reason: 'not_scheduled' };
  }
  if (!game.homeSP || !game.awaySP) {
    return { shouldPredict: false, reason: 'sp_unconfirmed' };
  }
  if (gameDbId != null && existingPredictedGameIds.has(gameDbId)) {
    return { shouldPredict: false, reason: 'already_predicted' };
  }
  return { shouldPredict: true, reason: 'ok' };
}

/**
 * 하루의 마지막 경기 기준 "예측 알림 예상 시각" 계산.
 *
 * 가장 늦은 시작 시간에서 3시간 전 이후의 첫 정시 cron 을 반환.
 * 예: 18:30 → "16:00 KST 경" (15:30 이후 첫 정시 cron)
 * 예: 14:00 → "11:00 KST 경" (정시 - 3h = 정시)
 *
 * announce mode 메시지에 사용.
 */
export function estimateNotificationTime(games: ScrapedGame[]): string {
  const active = games.filter(
    (g) =>
      g.status !== 'postponed' &&
      g.status !== 'final' &&
      g.homeSP &&
      g.awaySP,
  );
  if (active.length === 0) return '경기 없음';

  const latestStart = active.reduce(
    (max, g) => (g.gameTime > max ? g.gameTime : max),
    '00:00',
  );
  const [h, m] = latestStart.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '계산 불가';

  const cronHr = Math.ceil((h * 60 + m - 180) / 60);
  if (cronHr < 0) return '시작 직전';
  return `${String(cronHr).padStart(2, '0')}:00 KST 경`;
}
