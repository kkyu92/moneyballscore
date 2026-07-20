import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { readFileSync } from 'fs';
import { FACTOR_PICK_STRONG } from '@moneyball/shared';

// wave-539 (cycle 1910): 이번 주 남은 경기 섹션 — 강수렴 픽 미리보기 블록.
// strongUpcomingPickGameIds 로 필터, TOP픽 우선 정렬, compact 카드 렌더링.
// gameOverviewSummary 표시 + ↗ favored team + 날짜 단축 표기.

const PAGE_SRC = readFileSync(join(__dirname, '../../app/analysis/page.tsx'), 'utf8');

describe('wave-539 — 이번 주 강수렴 픽 미리보기 블록', () => {
  it('analysis/page.tsx: wave-539 마커 주석 존재', () => {
    expect(PAGE_SRC).toContain('wave-539');
  });

  it('analysis/page.tsx: strongUpcomingPickGameIds 필터 사용', () => {
    expect(PAGE_SRC).toContain('strongUpcomingPickGameIds.has(g.gameId)');
  });

  it('analysis/page.tsx: TOP픽 우선 정렬 (topUpcomingPickGameId 비교)', () => {
    // TOP픽 항목이 맨 앞으로
    expect(PAGE_SRC).toContain('a.gameId === topUpcomingPickGameId');
    expect(PAGE_SRC).toContain('b.gameId === topUpcomingPickGameId');
  });

  it('analysis/page.tsx: gameOverviewSummary 렌더링', () => {
    // 미리보기 블록 안에서 gameOverviewSummary 표시
    const idx539 = PAGE_SRC.indexOf('wave-539');
    const after539 = PAGE_SRC.slice(idx539, idx539 + 2500);
    expect(after539).toContain('gameOverviewSummary');
  });

  it('analysis/page.tsx: 날짜 단축 표기 (mm.dd 형식)', () => {
    // dateShort = `${Number(mm)}.${Number(dd)}`
    const idx539 = PAGE_SRC.indexOf('wave-539');
    const after539 = PAGE_SRC.slice(idx539, idx539 + 2500);
    expect(after539).toContain('dateShort');
    expect(after539).toContain('Number(mm)');
    expect(after539).toContain('Number(dd)');
  });

  it('analysis/page.tsx: ↗ 수렴 방향 팀명 표시', () => {
    const idx539 = PAGE_SRC.indexOf('wave-539');
    const after539 = PAGE_SRC.slice(idx539, idx539 + 2500);
    expect(after539).toContain('↗');
    expect(after539).toContain('favoredCode');
  });

  it('analysis/page.tsx: TOP픽 amber / 강픽 brand 색상 분기', () => {
    const idx539 = PAGE_SRC.indexOf('wave-539');
    const after539 = PAGE_SRC.slice(idx539, idx539 + 2500);
    expect(after539).toContain('amber');
    expect(after539).toContain('brand');
    expect(after539).toContain('isTop');
  });

  it('analysis/page.tsx: strongUpcomingPickCount 조건으로 블록 렌더 가드', () => {
    const idx539 = PAGE_SRC.indexOf('wave-539');
    const after539 = PAGE_SRC.slice(idx539, idx539 + 2500);
    expect(after539).toContain('strongUpcomingPickCount > 0');
  });

  it('FACTOR_PICK_STRONG: 강수렴 픽 임계 = 8 (wave-538 정합)', () => {
    expect(FACTOR_PICK_STRONG).toBe(8);
  });
});
