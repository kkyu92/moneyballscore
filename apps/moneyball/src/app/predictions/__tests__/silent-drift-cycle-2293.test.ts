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

  it('predictions.scoring_rule 이 CURRENT_SCORING_RULE 로 SQL 레벨 필터링됨', () => {
    const block = SRC.slice(SRC.indexOf("from('games')"), SRC.indexOf(".order('game_date'"));
    expect(block).toMatch(/\.eq\('predictions\.scoring_rule', CURRENT_SCORING_RULE\)/);
  });

  it('CURRENT_SCORING_RULE import 됨', () => {
    expect(SRC).toMatch(/CURRENT_SCORING_RULE/);
    expect(SRC).toMatch(/from "@moneyball\/shared"/);
  });
});
