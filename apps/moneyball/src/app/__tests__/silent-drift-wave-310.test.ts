import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { confToWinProb } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 310 — confToWinProb single source (cycle 1641)', () => {
  it('confToWinProb(0) === 0.5 (중립)', () => {
    expect(confToWinProb(0)).toBe(0.5);
  });

  it('confToWinProb(1) === 1.0 (최고 신뢰)', () => {
    expect(confToWinProb(1)).toBe(1.0);
  });

  it('confToWinProb(0.5) === 0.75', () => {
    expect(confToWinProb(0.5)).toBe(0.75);
  });

  it('matchup/[teamA]/[teamB]/page.tsx uses confToWinProb (no inline 0.5 + confidence / 2)', () => {
    const src = readFileSync(join(ROOT, 'src/app/matchup/[teamA]/[teamB]/page.tsx'), 'utf8');
    expect(src).toContain('confToWinProb');
    expect(src).not.toMatch(/0\.5 \+ .*confidence \/ 2/);
  });

  it('feed/route.ts uses confToWinProb', () => {
    const src = readFileSync(join(ROOT, 'src/app/feed/route.ts'), 'utf8');
    expect(src).toContain('confToWinProb');
    expect(src).not.toMatch(/0\.5 \+ .*confidence \/ 2/);
  });

  it('teams/[code]/page.tsx uses confToWinProb', () => {
    const src = readFileSync(join(ROOT, 'src/app/teams/[code]/page.tsx'), 'utf8');
    expect(src).toContain('confToWinProb');
    expect(src).not.toMatch(/0\.5 \+ .*confidence \/ 2/);
  });

  it('teams/[code]/recent/page.tsx uses confToWinProb', () => {
    const src = readFileSync(join(ROOT, 'src/app/teams/[code]/recent/page.tsx'), 'utf8');
    expect(src).toContain('confToWinProb');
    expect(src).not.toMatch(/0\.5 \+ .*confidence \/ 2/);
  });

  it('components/predictions/PredictionCard.tsx uses confToWinProb', () => {
    const src = readFileSync(join(ROOT, 'src/components/predictions/PredictionCard.tsx'), 'utf8');
    expect(src).toContain('confToWinProb');
    expect(src).not.toMatch(/0\.5 \+ confidence \/ 2/);
  });
});

// wave-310 원래 swept MLB team 페이지도 confToWinProb 강제 대상에 포함했으나,
// MLB `confidence` (deriveMlbOutcome 산출, 0.5~1 winnerProb 스케일) 는 KBO DB
// `confidence` 컬럼(0~1, 0=tossup) 과 스케일이 다름 — confToWinProb 는 KBO 스케일
// 전용이라 MLB 에 적용하면 이중 변환 버그(850%류) 발생. cycle 2160 review-code
// heavy 가 실측 발견 + 4 페이지(KO/EN team, KO/EN matchup) 전부 fix. 재발 방지 가드.
describe('silent drift wave 310 정정 (cycle 2160) — MLB confidence 는 confToWinProb 금지', () => {
  const mlbPages = [
    'src/app/mlb/team/[code]/page.tsx',
    'src/app/en/mlb/team/[code]/page.tsx',
    'src/app/mlb/matchup/[teamA]/[teamB]/page.tsx',
    'src/app/en/mlb/matchup/[teamA]/[teamB]/page.tsx',
  ];

  for (const page of mlbPages) {
    it(`${page} does not use confToWinProb on MLB confidence`, () => {
      const src = readFileSync(join(ROOT, page), 'utf8');
      expect(src).not.toContain('confToWinProb');
    });
  }
});
