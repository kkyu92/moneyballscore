import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

const TARGETS = [
  'src/components/layout/Footer.tsx',
  'src/app/mlb/team/[code]/opengraph-image.tsx',
  'src/app/en/mlb/team/[code]/opengraph-image.tsx',
  'src/app/mlb/games/[date]/[slug]/page.tsx',
  'src/app/en/mlb/games/[date]/[slug]/page.tsx',
];

// cycle 2108 review-code heavy: 게임 상세 페이지 2건은 "전체 모델 14팩터" 상수(MLB_FACTOR_COUNTS.total)를
// heading/description 카운트로 재사용하다 실제 렌더 행(7개)과 mismatch 나던 걸 발견 — 배열 길이
// self-sync 패턴(GAME_DETAIL_FACTOR_ROWS.length)으로 교체. 이 두 파일은 이제 MLB_FACTOR_COUNTS 를
// import 하지 않는 게 맞는 상태(정적 상수 재사용 자체가 이번에 고친 버그의 원인이었음).
const GAME_DETAIL_TARGETS = new Set([
  'src/app/mlb/games/[date]/[slug]/page.tsx',
  'src/app/en/mlb/games/[date]/[slug]/page.tsx',
]);

describe('silent drift wave 78 — MLB 14 factor surface sweep (Footer + team OG + games detail)', () => {
  for (const rel of TARGETS) {
    it(`${rel}: no hardcoded "14팩터" / "14 Factor" / "14 factor" literal`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/"14팩터/);
      expect(src).not.toMatch(/'14팩터/);
      expect(src).not.toMatch(/`14팩터/);
      expect(src).not.toMatch(/>14팩터/);
      expect(src).not.toMatch(/"14 Factor/);
      expect(src).not.toMatch(/'14 Factor/);
      expect(src).not.toMatch(/`14 Factor/);
      expect(src).not.toMatch(/>14 Factor/);
      expect(src).not.toMatch(/"14 factor/);
      expect(src).not.toMatch(/'14 factor/);
      expect(src).not.toMatch(/`14 factor/);
      expect(src).not.toMatch(/>14 factor/);
    });

    if (GAME_DETAIL_TARGETS.has(rel)) {
      it(`${rel}: heading/description 팩터 카운트는 렌더 행 배열 길이로 self-sync 한다 (MLB_FACTOR_COUNTS 재사용 금지 — cycle 2108)`, () => {
        const src = readFileSync(join(ROOT, rel), 'utf8');
        expect(src).toMatch(/GAME_DETAIL_FACTOR_ROWS\.length/);
        expect(src).not.toMatch(/MLB_FACTOR_COUNTS/);
      });
    } else {
      it(`${rel}: imports MLB_FACTOR_COUNTS from @moneyball/kbo-data`, () => {
        const src = readFileSync(join(ROOT, rel), 'utf8');
        expect(src).toMatch(/MLB_FACTOR_COUNTS/);
      });
    }
  }
});
