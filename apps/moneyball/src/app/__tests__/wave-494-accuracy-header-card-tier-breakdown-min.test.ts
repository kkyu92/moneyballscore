import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MIN_VERIFIED_GAMES_HEDGE } from '@moneyball/shared';

// wave-494: AccuracyHeaderCard TIER_BREAKDOWN_MIN magic 10 → MIN_VERIFIED_GAMES_HEDGE 상수 swap
// review-code (heavy) — cycle 1860
// Feature-Drift Cycle: explore-idea (wave-493) → review-code (wave-494)
// silent drift: TIER_BREAKDOWN_MIN=10 local const + MIN_VERIFIED_GAMES_HEDGE=10 import 중복

const componentSrc = readFileSync(
  join(
    __dirname,
    '../../components/predictions/AccuracyHeaderCard.tsx',
  ),
  'utf8',
);

describe('wave-494 — AccuracyHeaderCard TIER_BREAKDOWN_MIN magic 제거', () => {
  it('TIER_BREAKDOWN_MIN local const 없음', () => {
    expect(componentSrc).not.toContain('TIER_BREAKDOWN_MIN');
  });

  it('MIN_VERIFIED_GAMES_HEDGE import됨', () => {
    expect(componentSrc).toContain('MIN_VERIFIED_GAMES_HEDGE');
  });

  it('MIN_VERIFIED_GAMES_HEDGE tier filter에 사용됨', () => {
    expect(componentSrc).toContain('verified >= MIN_VERIFIED_GAMES_HEDGE');
  });

  it('MIN_VERIFIED_GAMES_HEDGE 값은 10 (소표본 노이즈 차단 임계)', () => {
    expect(MIN_VERIFIED_GAMES_HEDGE).toBe(10);
  });
});
