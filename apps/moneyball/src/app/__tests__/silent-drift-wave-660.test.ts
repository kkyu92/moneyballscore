import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

// matchup 페이지 3종(KBO/MLB/EN-MLB) 이 "오늘" 날짜를 raw UTC
// (new Date().toISOString().slice(0,10)) 로 독립 재계산 — 같은 기능의
// lib 레이어(buildMatchupUpcoming.ts / buildMlbMatchupUpcoming.ts) 는 이미
// toKSTDateString() 사용 중이라 page.tsx 만 KST 미적용 상태로 분기(cycle 2507
// review-code heavy 최초 전체 감사 발견). 상수 KST_OFFSET_MS family(wave 145) 정합.
describe('silent drift wave 660 — matchup 페이지 todayStr KST 단일화 (cycle 2507)', () => {
  const pages = [
    'src/app/matchup/[teamA]/[teamB]/page.tsx',
    'src/app/mlb/matchup/[teamA]/[teamB]/page.tsx',
    'src/app/en/mlb/matchup/[teamA]/[teamB]/page.tsx',
  ];

  for (const page of pages) {
    it(`${page} uses toKSTDateString for todayStr (no raw UTC toISOString slice)`, () => {
      const src = readFileSync(join(ROOT, page), 'utf8');
      expect(src).toContain('toKSTDateString()');
      expect(src).not.toMatch(/new Date\(\)\.toISOString\(\)\.slice\(0, ?10\)/);
      expect(src).not.toMatch(/new Date\(\)\.getFullYear\(\)\.toString\(\)/);
    });
  }
});
