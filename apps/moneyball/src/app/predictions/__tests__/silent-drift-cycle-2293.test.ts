import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 2293 — predictions/page.tsx getPredictionDates 쿼리 scoring_rule 필터 누락 정정 (#1338 family 6번째 재발, 최고 트래픽 예측 목록 페이지)', () => {
  it('predictions.scoring_rule 이 PRODUCTION_COHORT_RULES 로 SQL 레벨 필터링됨 (select 컬럼 자체는 row 미소비로 cycle 2749 제거, 필터절은 유지 / cycle 2411 #1338 family 후속 정정 — CURRENT_SCORING_RULE 단일필터가 legacy v1.8-credit-fail 프로덕션 row 오탐 배제)', () => {
    const block = SRC.slice(SRC.indexOf("from('games')"), SRC.indexOf(".order('game_date'"));
    expect(block).toMatch(/\.in\('predictions\.scoring_rule', PRODUCTION_COHORT_RULES/);
  });

  it('PRODUCTION_COHORT_RULES import 됨', () => {
    expect(SRC).toMatch(/PRODUCTION_COHORT_RULES/);
    expect(SRC).toMatch(/from "@moneyball\/shared"/);
  });
});
