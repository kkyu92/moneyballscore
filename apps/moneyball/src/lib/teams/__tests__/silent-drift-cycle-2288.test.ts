import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../buildTeamProfile.ts');

describe('silent drift cycle 2288 — buildTeamProfile.ts games 쿼리 scoring_rule 필터 누락 정정 (shadow row 오염 차단)', () => {
  it('games select 가 PRODUCTION_COHORT_RULES 로 predictions 를 필터링함 (shadow-cohort #1338 family, cycle 2409 CURRENT_SCORING_RULE 단일필터 오탐 후속 정정)', () => {
    const src = readFileSync(SRC, 'utf8');
    const block = src.slice(
      src.indexOf('const gamesResult = await supabase'),
      src.indexOf('const { data } = assertSelectOk(gamesResult'),
    );
    expect(block).toMatch(/\.in\("predictions\.scoring_rule", PRODUCTION_COHORT_RULES\)/);
  });

  it('PRODUCTION_COHORT_RULES import 됨', () => {
    const src = readFileSync(SRC, 'utf8');
    expect(src).toMatch(/PRODUCTION_COHORT_RULES/);
  });
});
