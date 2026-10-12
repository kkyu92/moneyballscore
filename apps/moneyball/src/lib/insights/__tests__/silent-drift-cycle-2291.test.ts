import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../series.ts');

describe('silent drift cycle 2291 — series.ts getSeriesByTopic predictions 쿼리 scoring_rule 필터 누락 정정 (#1338 family 4번째 재발 파일, cycle 3061 PRODUCTION_COHORT_RULES 전환으로 갱신)', () => {
  it('predictions select 가 scoring_rule 을 필터링함 — PRODUCTION_COHORT_RULES 로 CE(v1.8-credit-fail) row 포함 (shadow-cohort #1338 family, cycle 3061 CURRENT_MODEL_FILTER exact-match 가 CE row 를 silent 배제하던 재발 정정)', () => {
    const src = readFileSync(SRC, 'utf8');
    const block = src.slice(
      src.indexOf('const result = await supabase'),
      src.indexOf('const { data } = assertSelectOk(result'),
    );
    expect(block).toMatch(/\.in\(\s*"scoring_rule",\s*\[\.\.\.PRODUCTION_COHORT_RULES\]\s*\)/);
    expect(block).not.toMatch(/\.match\(CURRENT_MODEL_FILTER\)/);
  });

  it('PRODUCTION_COHORT_RULES import 됨 (CURRENT_MODEL_FILTER 아님)', () => {
    const src = readFileSync(SRC, 'utf8');
    expect(src).toMatch(/PRODUCTION_COHORT_RULES/);
    expect(src).not.toMatch(/CURRENT_MODEL_FILTER/);
  });
});
