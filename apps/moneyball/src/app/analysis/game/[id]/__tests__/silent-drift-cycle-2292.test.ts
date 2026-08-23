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

  // cycle 2407 review-code heavy: CURRENT_SCORING_RULE 단일값 비교 → PRODUCTION_COHORT_RULES
  // 포함 판정으로 정정 (legacy 'v1.8-credit-fail' production row 도 실제 분석 있음에도
  // "분석 데이터 없음"으로 오탐되던 문제 fix, model-version-labels.ts 문서상 사용자 가시
  // layer 는 PRODUCTION_COHORT_RULES 사용이 맞는 cohort).
  it('preGame .find() 가 PRODUCTION_COHORT_RULES 로 scoring_rule 을 필터링함 (shadow 제외 + legacy credit-fail 포함)', () => {
    const block = SRC.slice(SRC.indexOf('const preGame ='), SRC.indexOf('const postGame ='));
    expect(block).toMatch(/PRODUCTION_COHORT_RULES.*\.includes\(p\.scoring_rule\)/s);
  });

  it('PRODUCTION_COHORT_RULES import 됨', () => {
    expect(SRC).toMatch(/PRODUCTION_COHORT_RULES/);
    expect(SRC).toMatch(/from '@moneyball\/shared'/);
  });
});
