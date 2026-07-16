import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  H2H_MIN_GAMES,
  H2H_DOMINANT_RATE,
  H2H_WEAK_RATE,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-375 — 상대전적 직접 대결 배지 (cycle 1716)', () => {
  it('H2H_DOMINANT_RATE = 0.6 (dominant threshold)', () => {
    expect(H2H_DOMINANT_RATE).toBe(0.6);
  });

  it('H2H_WEAK_RATE = 0.4 (weak threshold, complement of dominant)', () => {
    expect(H2H_WEAK_RATE).toBe(0.4);
  });

  it('H2H_MIN_GAMES = 3 (minimum games for badge)', () => {
    expect(H2H_MIN_GAMES).toBe(3);
  });

  it('H2H_DOMINANT_RATE + H2H_WEAK_RATE = 1 (symmetric)', () => {
    expect(H2H_DOMINANT_RATE + H2H_WEAK_RATE).toBe(1);
  });

  it('홈팀 3승0패 → homeRate=1.0 >= H2H_DOMINANT_RATE → 강세 배지', () => {
    const homeWins = 3;
    const awayWins = 0;
    const total = homeWins + awayWins;
    const homeRate = homeWins / total;
    expect(homeRate).toBeGreaterThanOrEqual(H2H_DOMINANT_RATE);
  });

  it('홈팀 2승3패 → homeRate=0.4 = H2H_WEAK_RATE → 원정 강세 배지', () => {
    const homeWins = 2;
    const awayWins = 3;
    const total = homeWins + awayWins;
    const homeRate = homeWins / total;
    expect(homeRate).toBeLessThanOrEqual(H2H_WEAK_RATE);
  });

  it('홈팀 2승2패 → homeRate=0.5 → 배지 미노출 (중립)', () => {
    const homeWins = 2;
    const awayWins = 2;
    const total = homeWins + awayWins;
    const homeRate = homeWins / total;
    expect(homeRate).toBeGreaterThan(H2H_WEAK_RATE);
    expect(homeRate).toBeLessThan(H2H_DOMINANT_RATE);
  });

  it('analysis/page.tsx: wave-375 badge 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-375');
    expect(src).toContain('상대전적');
    expect(src).toContain('강세');
  });

  it('analysis/page.tsx: H2H_DOMINANT_RATE / H2H_WEAK_RATE 사용 (인라인 상수 X)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('H2H_DOMINANT_RATE');
    expect(src).toContain('H2H_WEAK_RATE');
    expect(src).not.toMatch(/homeRate >= 0\.6\b/);
    expect(src).not.toMatch(/homeRate <= 0\.4\b/);
  });
});
