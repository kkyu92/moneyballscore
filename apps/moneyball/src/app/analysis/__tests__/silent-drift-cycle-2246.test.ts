import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

describe('silent drift cycle 2246 — analysis-data.ts sp_confirmation_log select 에도 assertSelectOk 적용 (SP 배지 조회 에러 silent swallow 차단)', () => {
  it('sp_confirmation_log 쿼리 결과가 assertSelectOk 를 거쳐 사용됨', () => {
    const src = readFileSync(join(ROOT, 'src/app/analysis/analysis-data.ts'), 'utf8');
    const block = src.slice(
      src.indexOf("from('sp_confirmation_log')"),
      src.indexOf('const candidates:'),
    );
    expect(block).toMatch(/assertSelectOk\(spResult,/);
    expect(block).not.toMatch(/spResult\.data \?\? \[\]/);
  });
});
