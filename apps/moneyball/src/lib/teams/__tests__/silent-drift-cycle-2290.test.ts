import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../buildTeamFactorAverages.ts');

describe('silent drift cycle 2290 — buildTeamFactorAverages.ts predictions 쿼리 scoring_rule 필터 누락 정정 (shadow row 오염 차단, #1338 family 3번째 재발 파일)', () => {
  // cycle 3175 review-code heavy 후속: CURRENT_MODEL_FILTER(=CURRENT_SCORING_RULE 단일값)는
  // 같은 매치업 페이지의 buildMatchupProfile.ts 가 이미 cycle 2409 에서 PRODUCTION_COHORT_RULES
  // 로 정정된 것과 어긋나 legacy v1.8-credit-fail row 를 조용히 누락시켰음 (#1338 family 4번째
  // 재발). PRODUCTION_COHORT_RULES 로 재정정.
  it('predictions select 가 PRODUCTION_COHORT_RULES 로 scoring_rule 을 필터링함 (shadow-cohort #1338 family)', () => {
    const src = readFileSync(SRC, 'utf8');
    const block = src.slice(
      src.indexOf('const predResult = await supabase'),
      src.indexOf('({ data } = assertSelectOk(\n      predResult'),
    );
    expect(block).toMatch(/\.in\("scoring_rule", PRODUCTION_COHORT_RULES\)/);
  });

  it('PRODUCTION_COHORT_RULES import 됨', () => {
    const src = readFileSync(SRC, 'utf8');
    expect(src).toMatch(/PRODUCTION_COHORT_RULES/);
  });
});
