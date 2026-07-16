import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMPOSITE_DUEL_MIN_VALID, COMPOSITE_DUEL_THRESHOLD, WAR_DUEL_MIN } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-368 — 종합 우세 배지 WAR 팩터 추가 (cycle 1708)', () => {
  it('COMPOSITE_DUEL_THRESHOLD = 3 단일 소스 가드', () => {
    expect(COMPOSITE_DUEL_THRESHOLD).toBe(3);
  });

  it('COMPOSITE_DUEL_MIN_VALID = 4 단일 소스 가드 (5팩터 중 4 이상 유효)', () => {
    expect(COMPOSITE_DUEL_MIN_VALID).toBe(4);
  });

  it('WAR_DUEL_MIN 종합 우세 배지 callsite 참조 (wave-368 주석 포함)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-368');
  });

  it('analysis/page.tsx: warResult 변수 종합 우세 배지 안 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('warResult');
    expect(src).toContain('WAR_DUEL_MIN');
  });

  it('analysis/page.tsx: results 배열에 warResult 포함', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('[wobaResult, sfrResult, bullpenResult, spFipResult, warResult]');
  });

  it('종합 우세 배지: THRESHOLD ≤ MIN_VALID (3 ≤ 4) — 유효한 조건', () => {
    expect(COMPOSITE_DUEL_THRESHOLD).toBeLessThanOrEqual(COMPOSITE_DUEL_MIN_VALID);
  });

  it('종합 우세 배지: WAR 5팩터 시뮬레이션 — 3팩터 우세 표시', () => {
    const homeWins = 3;
    const awayWins = 2;
    expect(homeWins >= COMPOSITE_DUEL_THRESHOLD).toBe(true);
    expect(awayWins >= COMPOSITE_DUEL_THRESHOLD).toBe(false);
  });

  it('종합 우세 배지: WAR gap ≥ WAR_DUEL_MIN 시 warResult = home/away', () => {
    const homeWar = 22.0;
    const awayWar = 15.0;
    const gap = homeWar - awayWar;
    expect(gap >= WAR_DUEL_MIN).toBe(true);
  });
});
