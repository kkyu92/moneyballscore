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

  it('predictions.find predicate 가 scoring_rule === CURRENT_SCORING_RULE 조건 포함', () => {
    expect(SRC).toMatch(/p\.prediction_type === "pre_game" && p\.scoring_rule === CURRENT_SCORING_RULE/);
  });

  it('CURRENT_SCORING_RULE import 됨', () => {
    expect(SRC).toMatch(/CURRENT_SCORING_RULE/);
    expect(SRC).toMatch(/from "@moneyball\/shared"/);
  });
});
