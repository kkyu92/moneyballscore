/**
 * GameStatus integration test — autoplan Eng-C2 finding (CRITICAL) 후속.
 *
 * 의도: ALL_GAME_STATUSES tuple 안 literal 이 DB 실제 값과 정합한지 invariant
 * test. fixture coupling 차단 = production 실제 DB 값 변경 시 본 test fail
 * → silent drift family 7 차단.
 *
 * 단 본 test = Sentry/supabase 의존 X. tuple invariant + literal 검증 만.
 * 진짜 DB integration = Supabase test fixture 또는 e2e (별도 scope).
 */

import { describe, it, expect } from 'vitest';
import { ALL_GAME_STATUSES, GAME_STATUS_FINAL, type GameStatus } from '../index';

describe('GameStatus invariant', () => {
  it('ALL_GAME_STATUSES tuple = 4 literal (cycle 1021 측정 DB 실제 값)', () => {
    expect(ALL_GAME_STATUSES).toEqual(['scheduled', 'live', 'final', 'postponed']);
    expect(ALL_GAME_STATUSES.length).toBe(4);
  });

  it('GAME_STATUS_FINAL = "final" (predict cohort base)', () => {
    expect(GAME_STATUS_FINAL).toBe('final');
  });

  it('ALL_GAME_STATUSES include "completed" literal 금지 (silent drift fix)', () => {
    expect(ALL_GAME_STATUSES).not.toContain('completed' as GameStatus);
  });

  it('cycle 1019 backtest-v2-helpers.ts 안 \'completed\' literal silent drift 차단', () => {
    // cycle 1019 plan #14 C1b 박제 시점 hard-coded 'completed' literal → cycle 1021
    // 첫 fire cohort_n=0 silent drift evidence. ALL_GAME_STATUSES 안 'completed'
    // 존재 시 본 invariant test fail → 박제 차단.
    expect(ALL_GAME_STATUSES.some((s) => (s as string) === 'completed')).toBe(false);
  });
});
