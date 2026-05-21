import { describe, expect, it } from 'vitest';
import {
  shouldPredictGame,
  estimateNotificationTime,
} from '../pipeline/schedule';
import type { ScrapedGame } from '../types';

function makeGame(overrides: Partial<ScrapedGame> = {}): ScrapedGame {
  return {
    date: '2026-04-19',
    homeTeam: 'OB',
    awayTeam: 'HT',
    gameTime: '18:30',
    stadium: '잠실',
    homeSP: '최민석',
    awaySP: '양현종',
    status: 'scheduled',
    externalGameId: '20260419HTOB0',
    ...overrides,
  };
}

// 2026-04-19 KST 시각별 기준점 (UTC 기준으로 계산)
// 15:30 KST = 06:30 UTC
const KST_1530 = new Date('2026-04-19T06:30:00Z').getTime();
// 16:00 KST
const KST_1600 = new Date('2026-04-19T07:00:00Z').getTime();
// 11:00 KST
const KST_1100 = new Date('2026-04-19T02:00:00Z').getTime();
// 19:00 KST (경기 이후)
const KST_1900 = new Date('2026-04-19T10:00:00Z').getTime();
// 10:00 KST (윈도우 한참 전)
const KST_1000 = new Date('2026-04-19T01:00:00Z').getTime();

describe('shouldPredictGame', () => {
  const emptySet = new Set<number>();

  describe('window check', () => {
    it('18:30 경기는 10:00 cron (8.5h 남음) 에서 window_too_early', () => {
      const game = makeGame({ gameTime: '18:30' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1000);
      expect(result.shouldPredict).toBe(false);
      expect(result.reason).toBe('window_too_early');
    });

    it('18:30 경기는 15:30 cron (3h 남음) 에서 ok', () => {
      const game = makeGame({ gameTime: '18:30' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1530);
      expect(result.shouldPredict).toBe(true);
      expect(result.reason).toBe('ok');
    });

    it('18:30 경기는 16:00 cron (2.5h 남음) 에서 ok', () => {
      const game = makeGame({ gameTime: '18:30' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1600);
      expect(result.shouldPredict).toBe(true);
      expect(result.reason).toBe('ok');
    });

    it('14:00 경기는 11:00 cron (3h 남음) 에서 ok', () => {
      const game = makeGame({ gameTime: '14:00' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1100);
      expect(result.shouldPredict).toBe(true);
      expect(result.reason).toBe('ok');
    });

    it('14:00 경기는 19:00 cron (시작 5h 이후) 에서 window_too_late', () => {
      const game = makeGame({ gameTime: '14:00' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1900);
      expect(result.shouldPredict).toBe(false);
      expect(result.reason).toBe('window_too_late');
    });
  });

  describe('status check', () => {
    it('live 상태는 not_scheduled', () => {
      const game = makeGame({ gameTime: '18:30', status: 'live' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1600);
      expect(result.reason).toBe('not_scheduled');
    });

    it('final 상태는 not_scheduled', () => {
      const game = makeGame({ gameTime: '18:30', status: 'final' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1600);
      expect(result.reason).toBe('not_scheduled');
    });

    it('postponed 상태는 not_scheduled', () => {
      const game = makeGame({ gameTime: '18:30', status: 'postponed' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1600);
      expect(result.reason).toBe('not_scheduled');
    });
  });

  describe('SP check', () => {
    it('homeSP 미확정이면 sp_unconfirmed', () => {
      const game = makeGame({ homeSP: undefined });
      const result = shouldPredictGame(game, emptySet, 1, KST_1600);
      expect(result.reason).toBe('sp_unconfirmed');
    });

    it('awaySP 미확정이면 sp_unconfirmed', () => {
      const game = makeGame({ awaySP: undefined });
      const result = shouldPredictGame(game, emptySet, 1, KST_1600);
      expect(result.reason).toBe('sp_unconfirmed');
    });
  });

  describe('first-write-wins', () => {
    it('existingPredictedGameIds 에 포함된 경기는 already_predicted', () => {
      const game = makeGame();
      const existing = new Set<number>([1, 2, 3]);
      const result = shouldPredictGame(game, existing, 2, KST_1600);
      expect(result.reason).toBe('already_predicted');
    });

    it('gameDbId=null 은 existing 검사 skip (첫 저장 시나리오)', () => {
      const game = makeGame();
      const existing = new Set<number>([1, 2, 3]);
      const result = shouldPredictGame(game, existing, null, KST_1600);
      expect(result.shouldPredict).toBe(true);
      expect(result.reason).toBe('ok');
    });

    it('gameDbId 는 있지만 existing 에 없으면 ok', () => {
      const game = makeGame();
      const existing = new Set<number>([1, 2, 3]);
      const result = shouldPredictGame(game, existing, 99, KST_1600);
      expect(result.shouldPredict).toBe(true);
    });
  });

  describe('순서 우선순위', () => {
    it('window_too_late 가 not_scheduled 보다 우선', () => {
      const game = makeGame({ gameTime: '14:00', status: 'live' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1900);
      expect(result.reason).toBe('window_too_late');
    });

    it('window_too_early 가 sp_unconfirmed 보다 우선', () => {
      const game = makeGame({ gameTime: '18:30', homeSP: undefined });
      const result = shouldPredictGame(game, emptySet, 1, KST_1000);
      expect(result.reason).toBe('window_too_early');
    });
  });

  // 사례 11 (2026-05-20 SKvWO silent drift family) — predict mode 3회 fallback fail
  // 후 predict_final 시점엔 모든 18:30 KST 경기 window_too_late 라 마지막 기회 누락.
  // allowLateWindow=true (predict_final mode 한정) 시 game 시작 후 라도 후보 포함.
  describe('allowLateWindow (predict_final mode 마지막 기회 박제)', () => {
    it('default (allowLateWindow=false) 시 시작 후 1h 경기는 window_too_late', () => {
      const game = makeGame({ gameTime: '14:00' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1900);
      expect(result.reason).toBe('window_too_late');
    });

    it('allowLateWindow=true + status=scheduled 시 시작 후 라도 ok', () => {
      // 14:00 경기를 19:00 (시작 5h 이후) 시점에 평가하지만 KBO API 가
      // 아직 status=scheduled 인 케이스 — 매우 드문 race 상황. 그래도
      // predict_final 마지막 기회는 박제 시도.
      const game = makeGame({ gameTime: '14:00', status: 'scheduled' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1900, 3, true);
      expect(result.shouldPredict).toBe(true);
      expect(result.reason).toBe('ok');
    });

    it('allowLateWindow=true 라도 status=live 는 not_scheduled', () => {
      const game = makeGame({ gameTime: '14:00', status: 'live' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1900, 3, true);
      expect(result.shouldPredict).toBe(false);
      expect(result.reason).toBe('not_scheduled');
    });

    it('allowLateWindow=true 라도 status=final 는 not_scheduled', () => {
      const game = makeGame({ gameTime: '14:00', status: 'final' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1900, 3, true);
      expect(result.reason).toBe('not_scheduled');
    });

    it('allowLateWindow=true 라도 SP 미확정은 sp_unconfirmed', () => {
      const game = makeGame({ gameTime: '14:00', homeSP: undefined });
      const result = shouldPredictGame(game, emptySet, 1, KST_1900, 3, true);
      expect(result.reason).toBe('sp_unconfirmed');
    });

    it('allowLateWindow=true 라도 already_predicted 우선', () => {
      const game = makeGame({ gameTime: '14:00' });
      const existing = new Set<number>([1]);
      const result = shouldPredictGame(game, existing, 1, KST_1900, 3, true);
      expect(result.reason).toBe('already_predicted');
    });

    it('allowLateWindow=true 라도 window_too_early 우선', () => {
      const game = makeGame({ gameTime: '18:30' });
      const result = shouldPredictGame(game, emptySet, 1, KST_1000, 3, true);
      expect(result.reason).toBe('window_too_early');
    });
  });
});

describe('estimateNotificationTime', () => {
  it('경기 없으면 "경기 없음"', () => {
    expect(estimateNotificationTime([])).toBe('경기 없음');
  });

  it('postponed 만 있으면 "경기 없음"', () => {
    const games = [makeGame({ status: 'postponed' })];
    expect(estimateNotificationTime(games)).toBe('경기 없음');
  });

  it('final 만 있으면 "경기 없음"', () => {
    const games = [makeGame({ status: 'final' })];
    expect(estimateNotificationTime(games)).toBe('경기 없음');
  });

  it('SP 미확정만 있으면 "경기 없음"', () => {
    const games = [makeGame({ homeSP: undefined })];
    expect(estimateNotificationTime(games)).toBe('경기 없음');
  });

  it('18:30 1경기 → "16:00 KST 경"', () => {
    const games = [makeGame({ gameTime: '18:30' })];
    expect(estimateNotificationTime(games)).toBe('16:00 KST 경');
  });

  it('14:00 1경기 → "11:00 KST 경"', () => {
    const games = [makeGame({ gameTime: '14:00' })];
    expect(estimateNotificationTime(games)).toBe('11:00 KST 경');
  });

  it('17:00 1경기 → "14:00 KST 경"', () => {
    const games = [makeGame({ gameTime: '17:00' })];
    expect(estimateNotificationTime(games)).toBe('14:00 KST 경');
  });

  it('14:00 + 18:30 혼합 → 가장 늦은 경기 기준 "16:00 KST 경"', () => {
    const games = [
      makeGame({ gameTime: '14:00', externalGameId: 'a' }),
      makeGame({ gameTime: '18:30', externalGameId: 'b' }),
    ];
    expect(estimateNotificationTime(games)).toBe('16:00 KST 경');
  });

  it('낮경기 + 취소 혼합 → postponed 제외하고 계산', () => {
    const games = [
      makeGame({ gameTime: '18:30', status: 'postponed', externalGameId: 'a' }),
      makeGame({ gameTime: '14:00', externalGameId: 'b' }),
    ];
    expect(estimateNotificationTime(games)).toBe('11:00 KST 경');
  });
});
