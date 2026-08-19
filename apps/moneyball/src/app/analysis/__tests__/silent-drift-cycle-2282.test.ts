import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

describe('silent drift cycle 2282 — analysis-data.ts getThisWeekRemainingGames elo/factor 쿼리에도 assertSelectOk 적용 (Promise.all 두번째 쿼리 error silent swallow 차단)', () => {
  it('eloResult 쿼리 결과가 assertSelectOk 를 거쳐 사용됨', () => {
    const src = readFileSync(join(ROOT, 'src/app/analysis/analysis-data.ts'), 'utf8');
    const block = src.slice(
      src.indexOf('export async function getThisWeekRemainingGames'),
      src.indexOf('export function standingsRankClass'),
    );
    expect(block).toMatch(/assertSelectOk\(eloResult,/);
    expect(block).not.toMatch(/if \(eloResult\.data\)/);
  });
});
