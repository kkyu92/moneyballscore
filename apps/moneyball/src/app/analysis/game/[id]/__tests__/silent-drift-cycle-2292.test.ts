import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 2292 — analysis/game/[id]/page.tsx predictions 쿼리 scoring_rule 필터 누락 정정 (shadow row 오염 차단, #1338 family 5번째 재발 파일)', () => {
  it('predictions select 에 scoring_rule 컬럼이 포함됨', () => {
    const block = SRC.slice(SRC.indexOf('predictions(') , SRC.indexOf('.eq(\'id\', gameId)'));
    expect(block).toMatch(/prediction_type,\s*scoring_rule/);
  });

  it('preGame .find() 가 CURRENT_SCORING_RULE 로 scoring_rule 을 필터링함', () => {
    const block = SRC.slice(SRC.indexOf('const preGame ='), SRC.indexOf('const postGame ='));
    expect(block).toMatch(/p\.scoring_rule === CURRENT_SCORING_RULE/);
  });

  it('CURRENT_SCORING_RULE import 됨', () => {
    expect(SRC).toMatch(/CURRENT_SCORING_RULE/);
    expect(SRC).toMatch(/from '@moneyball\/shared'/);
  });
});
