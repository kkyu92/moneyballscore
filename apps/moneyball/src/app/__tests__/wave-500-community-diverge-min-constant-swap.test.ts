import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { COMMUNITY_DIVERGE_MIN, MIN_POLL_TOTAL } from '@moneyball/shared';

// wave-500: COMMUNITY_DIVERGE_MIN 상수 추출 + MIN_POLL_TOTAL swap in home/page.tsx
// review-code (heavy) — cycle 1867
// Feature-Drift Cycle: explore-idea (wave-499) → review-code (wave-500)
// silent drift:
//   - app/page.tsx: delta >= 20 hardcoded (COMMUNITY_DIVERGE_MIN 미사용)
//   - app/page.tsx: total < 3 hardcoded (MIN_POLL_TOTAL 미사용, PickButton 은 사용 중)
//   - components/picks/PickButton.tsx: Math.abs(aiHomePct - homePct) >= 20 hardcoded

const homeSrc = readFileSync(
  join(__dirname, '../page.tsx'),
  'utf8',
);

const pickButtonSrc = readFileSync(
  join(__dirname, '../../components/picks/PickButton.tsx'),
  'utf8',
);

describe('wave-500 — COMMUNITY_DIVERGE_MIN 상수 swap', () => {
  it('COMMUNITY_DIVERGE_MIN 값은 20', () => {
    expect(COMMUNITY_DIVERGE_MIN).toBe(20);
  });

  it('MIN_POLL_TOTAL 값은 3 (기존 상수 유지)', () => {
    expect(MIN_POLL_TOTAL).toBe(3);
  });

  it('AI vs 커뮤니티 괴리 판정: |delta| >= COMMUNITY_DIVERGE_MIN', () => {
    const aiHomePct = 70;
    const communityHomePct = 45;
    const delta = Math.abs(aiHomePct - communityHomePct);
    expect(delta).toBeGreaterThanOrEqual(COMMUNITY_DIVERGE_MIN); // 25 >= 20
  });

  it('AI vs 커뮤니티 괴리 판정: |delta| < COMMUNITY_DIVERGE_MIN 시 미표시', () => {
    const aiHomePct = 60;
    const communityHomePct = 55;
    const delta = Math.abs(aiHomePct - communityHomePct);
    expect(delta).toBeLessThan(COMMUNITY_DIVERGE_MIN); // 5 < 20
  });

  it('home/page.tsx 에 wave-500 마커 존재', () => {
    expect(homeSrc).toContain('wave-500');
  });

  it('home/page.tsx: COMMUNITY_DIVERGE_MIN import 존재', () => {
    expect(homeSrc).toContain('COMMUNITY_DIVERGE_MIN');
  });

  it('home/page.tsx: MIN_POLL_TOTAL import 존재', () => {
    expect(homeSrc).toContain('MIN_POLL_TOTAL');
  });

  it('home/page.tsx: delta >= 20 하드코딩 없음', () => {
    expect(homeSrc).not.toContain('delta >= 20');
    expect(homeSrc).toContain('delta >= COMMUNITY_DIVERGE_MIN');
  });

  it('home/page.tsx: total < 3 하드코딩 없음', () => {
    expect(homeSrc).not.toContain('total < 3');
    expect(homeSrc).toContain('total < MIN_POLL_TOTAL');
  });

  it('PickButton.tsx: COMMUNITY_DIVERGE_MIN import 존재', () => {
    expect(pickButtonSrc).toContain('COMMUNITY_DIVERGE_MIN');
  });

  it('PickButton.tsx: showDivergence 에 >= 20 하드코딩 없음', () => {
    expect(pickButtonSrc).not.toContain('>= 20;');
    expect(pickButtonSrc).toContain('>= COMMUNITY_DIVERGE_MIN');
  });
});
