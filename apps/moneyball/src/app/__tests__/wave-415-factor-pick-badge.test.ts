import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FACTOR_PICK_MIN_FACTORS,
  FACTOR_PICK_STRONG,
  FACTOR_PICK_COMPLETE,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

// wave-415: 오늘 AI 예측 카드 팩터 수렴 배지
// analysis/page.tsx — gamesWithRank.map() 안 isPickGame + pickConvStrength 기반 배지 로직
//
// 배지 표시 조건:
//   compositeDuelScore !== null AND |compositeDuelScore| >= FACTOR_PICK_MIN_FACTORS
//
// 배지 텍스트: "팩터 {favoredCount}:{againstCount}"
//   favoredHome = compositeDuelScore > 0
//   favoredCount = favoredHome ? compositeDuelHomeWins : compositeDuelAwayWins
//   againstCount = favoredHome ? compositeDuelAwayWins : compositeDuelHomeWins
//
// 배지 색상 분류 (pickConvStrength = |compositeDuelScore|):
//   >= FACTOR_PICK_COMPLETE(10) → accent (금색, 완전수렴)
//   >= FACTOR_PICK_STRONG(8)   → brand (강한수렴)
//   < FACTOR_PICK_STRONG       → gray (임계수렴)

function computePickBadge(
  compositeDuelScore: number | null,
  compositeDuelHomeWins: number | null,
  compositeDuelAwayWins: number | null,
): { show: boolean; favoredCount: number; againstCount: number; colorTier: 'accent' | 'brand' | 'gray' | 'none' } {
  if (compositeDuelScore === null) return { show: false, favoredCount: 0, againstCount: 0, colorTier: 'none' };
  const convStrength = Math.abs(compositeDuelScore);
  if (convStrength < FACTOR_PICK_MIN_FACTORS) return { show: false, favoredCount: 0, againstCount: 0, colorTier: 'none' };

  const favoredHome = compositeDuelScore > 0;
  const favoredCount = favoredHome ? (compositeDuelHomeWins ?? 0) : (compositeDuelAwayWins ?? 0);
  const againstCount = favoredHome ? (compositeDuelAwayWins ?? 0) : (compositeDuelHomeWins ?? 0);

  const colorTier =
    convStrength >= FACTOR_PICK_COMPLETE ? 'accent' :
    convStrength >= FACTOR_PICK_STRONG   ? 'brand'  :
                                           'gray';

  return { show: true, favoredCount, againstCount, colorTier };
}

describe('wave-415: 팩터 수렴 배지 상수 가드', () => {
  it('FACTOR_PICK_MIN_FACTORS = 7 단일 소스 가드', () => {
    expect(FACTOR_PICK_MIN_FACTORS).toBe(7);
  });

  it('FACTOR_PICK_STRONG = 8 단일 소스 가드', () => {
    expect(FACTOR_PICK_STRONG).toBe(8);
  });

  it('FACTOR_PICK_COMPLETE = 10 단일 소스 가드', () => {
    expect(FACTOR_PICK_COMPLETE).toBe(10);
  });
});

describe('wave-415: 팩터 수렴 배지 표시 조건', () => {
  it('compositeDuelScore null → 배지 미표시', () => {
    const r = computePickBadge(null, 7, 3);
    expect(r.show).toBe(false);
  });

  it('|score| < FACTOR_PICK_MIN_FACTORS → 배지 미표시', () => {
    const r = computePickBadge(5, 5, 5); // |5| < 7 기준 아니고 5 < 7 → 미표시
    // wait: compositeDuelScore IS the netScore (homeWins - awayWins)
    // FACTOR_PICK_MIN_FACTORS guards Math.abs(compositeDuelScore) >= 7
    // score=5 → Math.abs(5)=5 < 7 → false
    expect(r.show).toBe(false);
  });

  it('|score| = FACTOR_PICK_MIN_FACTORS → 배지 표시 (gray tier)', () => {
    const r = computePickBadge(7, 7, 3);
    expect(r.show).toBe(true);
    expect(r.favoredCount).toBe(7);
    expect(r.againstCount).toBe(3);
    expect(r.colorTier).toBe('gray');
  });

  it('|score| >= FACTOR_PICK_STRONG → brand tier', () => {
    const r = computePickBadge(8, 8, 2);
    expect(r.show).toBe(true);
    expect(r.colorTier).toBe('brand');
  });

  it('|score| >= FACTOR_PICK_COMPLETE → accent tier (금색)', () => {
    const r = computePickBadge(10, 10, 0);
    expect(r.show).toBe(true);
    expect(r.colorTier).toBe('accent');
  });

  it('score < 0 → away 팀 우세 (awaySlugs favored)', () => {
    const r = computePickBadge(-7, 3, 7);
    // favoredHome = false → favoredCount = awayWins = 7
    expect(r.show).toBe(true);
    expect(r.favoredCount).toBe(7);
    expect(r.againstCount).toBe(3);
  });
});

describe('wave-415: analysis/page.tsx 상수 import 확인', () => {
  it('analysis/page.tsx imports FACTOR_PICK_MIN_FACTORS, FACTOR_PICK_STRONG, FACTOR_PICK_COMPLETE', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).toContain('FACTOR_PICK_MIN_FACTORS');
    expect(src).toContain('FACTOR_PICK_STRONG');
    expect(src).toContain('FACTOR_PICK_COMPLETE');
  });

  it('wave-415·473 배지 JSX 존재 — isPickGame + pickConvStrength + 팩터 N:M 레이블', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).toContain('isPickGame');
    expect(src).toContain('pickConvStrength');
    // wave-473: pickFavoredCount/pickAgainstCount → factorFavoredCount/factorAgainstCount 로 rename
    expect(src).toContain('factorFavoredCount');
    expect(src).toContain('factorAgainstCount');
    expect(src).toContain('wave-415');
    expect(src).toContain('팩터 {factorFavoredCount}:{factorAgainstCount}');
  });
});
