import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../buildTeamProfile.ts');

describe('silent drift cycle 2288 — buildTeamProfile.ts games 쿼리 scoring_rule 필터 누락 정정 (shadow row 오염 차단)', () => {
  it('games select 가 CURRENT_SCORING_RULE 로 predictions 를 필터링함 (shadow-cohort #1338 family)', () => {
    const src = readFileSync(SRC, 'utf8');
    const block = src.slice(
      src.indexOf('const gamesResult = await supabase'),
      src.indexOf('const { data } = assertSelectOk(gamesResult'),
    );
    expect(block).toMatch(/\.eq\("predictions\.scoring_rule", CURRENT_SCORING_RULE\)/);
  });

  it('CURRENT_SCORING_RULE import 됨', () => {
    const src = readFileSync(SRC, 'utf8');
    expect(src).toMatch(/CURRENT_SCORING_RULE/);
  });
});
