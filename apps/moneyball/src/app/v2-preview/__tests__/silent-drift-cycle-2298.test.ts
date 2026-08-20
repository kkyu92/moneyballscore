import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 2298 — v2-preview/page.tsx scoring_rule 필터 누락 정정 (#1338 family 10번째 재발, v1.8/shadow/MLB 혼입)', () => {
  it('predictions select 에 CURRENT_MODEL_FILTER match 가 포함됨', () => {
    expect(SRC).toMatch(/\.match\(CURRENT_MODEL_FILTER\)/);
  });

  it('predictions select 에 prediction_type=pre_game 필터가 포함됨', () => {
    expect(SRC).toMatch(/\.eq\("prediction_type", "pre_game"\)/);
  });

  it('CURRENT_MODEL_FILTER import 됨', () => {
    expect(SRC).toMatch(/import \{ CURRENT_MODEL_FILTER \} from "@\/config\/model"/);
  });
});
