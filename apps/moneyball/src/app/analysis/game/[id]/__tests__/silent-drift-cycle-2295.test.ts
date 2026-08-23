import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dirname, '../opengraph-image.tsx'), 'utf8');

describe('silent drift cycle 2295 — analysis/game/[id]/opengraph-image.tsx getGameOg scoring_rule 필터 누락 정정 (#1338 family 7번째 재발)', () => {
  it('predictions select 에 scoring_rule 컬럼이 포함됨', () => {
    expect(SRC).toMatch(/predictions\(prediction_type, scoring_rule, confidence, predicted_winner\)/);
  });

  it('predictions.find predicate 가 PRODUCTION_COHORT_RULES.includes(scoring_rule) 조건 포함 (cycle 2411 #1338 family 후속 정정 — CURRENT_SCORING_RULE 단일필터가 legacy v1.8-credit-fail 프로덕션 row 오탐 배제)', () => {
    expect(SRC).toMatch(/p\.prediction_type === "pre_game" &&\s*\(PRODUCTION_COHORT_RULES as readonly string\[\]\)\.includes\(p\.scoring_rule\)/);
  });

  it('PRODUCTION_COHORT_RULES import 됨', () => {
    expect(SRC).toMatch(/PRODUCTION_COHORT_RULES/);
    expect(SRC).toMatch(/from "@moneyball\/shared"/);
  });
});
