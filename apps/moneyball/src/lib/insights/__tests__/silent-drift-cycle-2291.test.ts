import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../series.ts');

describe('silent drift cycle 2291 — series.ts getSeriesByTopic predictions 쿼리 scoring_rule 필터 누락 정정 (#1338 family 4번째 재발 파일)', () => {
  it('predictions select 가 CURRENT_MODEL_FILTER 로 scoring_rule 을 필터링함 (shadow-cohort #1338 family)', () => {
    const src = readFileSync(SRC, 'utf8');
    const block = src.slice(
      src.indexOf('const result = await supabase'),
      src.indexOf('const { data } = assertSelectOk(result'),
    );
    expect(block).toMatch(/\.match\(CURRENT_MODEL_FILTER\)/);
  });

  it('CURRENT_MODEL_FILTER import 됨', () => {
    const src = readFileSync(SRC, 'utf8');
    expect(src).toMatch(/import \{ CURRENT_MODEL_FILTER \} from "@\/config\/model"/);
  });
});
