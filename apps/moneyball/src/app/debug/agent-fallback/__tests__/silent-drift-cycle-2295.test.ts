import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 2295 — debug/agent-fallback/page.tsx getCohort scoring_rule 필터 누락 정정 (#1338 family 8번째 재발, shadow row quantOnly 오염)', () => {
  it('predictions select 에 scoring_rule in PRODUCTION_COHORT_RULES 필터가 포함됨', () => {
    expect(SRC).toMatch(/\.in\('scoring_rule', PRODUCTION_COHORT_RULES\)/);
  });

  it('PRODUCTION_COHORT_RULES import 됨', () => {
    expect(SRC).toMatch(/PRODUCTION_COHORT_RULES/);
    expect(SRC).toMatch(/from '@moneyball\/shared'/);
  });
});
