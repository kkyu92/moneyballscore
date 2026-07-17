import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CONVERGENCE_BADGE_WEIGHT_STRONG_PCT,
  FACTOR_PICK_MIN_FACTORS,
  FACTOR_PICK_COMPLETE,
  COMPOSITE_DUEL_MIN_VALID,
} from '@moneyball/shared';

// wave-452: 게임 상세 페이지 팩터 수렴 픽 배지 JSDoc 동기화 검증

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);
const gameDetailSrc = readFileSync(
  join(__dirname, '../analysis/game/[id]/page.tsx'),
  'utf8',
);

describe('wave-452 — 게임 상세 팩터 수렴 픽 배지', () => {
  it('CONVERGENCE_BADGE_WEIGHT_STRONG_PCT = 70 (가중 우위 강조 임계값)', () => {
    expect(CONVERGENCE_BADGE_WEIGHT_STRONG_PCT).toBe(70);
  });

  it('CONVERGENCE_BADGE_WEIGHT_STRONG_PCT JSDoc 에 wave-452 참조 존재', () => {
    const block = sharedSrc.match(/\/\*\*[\s\S]*?CONVERGENCE_BADGE_WEIGHT_STRONG_PCT = 70/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-452');
  });

  it('game/[id]/page.tsx: computeCompositeDuel import 존재', () => {
    expect(gameDetailSrc).toContain('computeCompositeDuel');
  });

  it('game/[id]/page.tsx: wave-452 badge 렌더링 존재', () => {
    expect(gameDetailSrc).toContain('isConvergencePick');
    expect(gameDetailSrc).toContain('CONVERGENCE_BADGE_WEIGHT_STRONG_PCT');
  });

  it('game/[id]/page.tsx: FACTOR_PICK_MIN_FACTORS·FACTOR_PICK_COMPLETE·COMPOSITE_DUEL_MIN_VALID import 존재', () => {
    expect(gameDetailSrc).toContain('FACTOR_PICK_MIN_FACTORS');
    expect(gameDetailSrc).toContain('FACTOR_PICK_COMPLETE');
    expect(gameDetailSrc).toContain('COMPOSITE_DUEL_MIN_VALID');
  });

  it('팩터 수렴 픽 배지 임계값 일관성 — FACTOR_PICK_MIN_FACTORS(7) ≤ FACTOR_PICK_COMPLETE(10)', () => {
    expect(FACTOR_PICK_MIN_FACTORS).toBeLessThanOrEqual(FACTOR_PICK_COMPLETE);
  });

  it('COMPOSITE_DUEL_MIN_VALID(4) < FACTOR_PICK_MIN_FACTORS(7) — 유효성 검사 임계 < 수렴 임계', () => {
    expect(COMPOSITE_DUEL_MIN_VALID).toBeLessThan(FACTOR_PICK_MIN_FACTORS);
  });
});
