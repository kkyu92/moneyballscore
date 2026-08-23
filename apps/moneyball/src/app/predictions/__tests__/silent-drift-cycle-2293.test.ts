import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 2293 — predictions/page.tsx getPredictionDates 쿼리 scoring_rule 필터 누락 정정 (#1338 family 6번째 재발, 최고 트래픽 예측 목록 페이지)', () => {
  it('predictions select 에 scoring_rule 컬럼이 포함됨', () => {
    const block = SRC.slice(SRC.indexOf("from('games')"), SRC.indexOf(".order('game_date'"));
    expect(block).toMatch(/prediction_type,\s*scoring_rule/);
  });

  it('predictions.scoring_rule 이 PRODUCTION_COHORT_RULES 로 SQL 레벨 필터링됨 (cycle 2411 #1338 family 후속 정정 — CURRENT_SCORING_RULE 단일필터가 legacy v1.8-credit-fail 프로덕션 row 오탐 배제)', () => {
    const block = SRC.slice(SRC.indexOf("from('games')"), SRC.indexOf(".order('game_date'"));
    expect(block).toMatch(/\.in\('predictions\.scoring_rule', PRODUCTION_COHORT_RULES/);
  });

  it('PRODUCTION_COHORT_RULES import 됨', () => {
    expect(SRC).toMatch(/PRODUCTION_COHORT_RULES/);
    expect(SRC).toMatch(/from "@moneyball\/shared"/);
  });
});
