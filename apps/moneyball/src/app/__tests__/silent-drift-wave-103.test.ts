import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 103 — page.tsx metadata description "매일 오전 9시" 하드코딩 → KBO_PREDICT_DAILY_TIME_KST 단일 source', () => {
  it('page.tsx: "매일 오전 9시" hardcoded 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/매일 오전 9시/);
  });

  it('page.tsx: KBO_PREDICT_DAILY_TIME_KST import + template literal 사용', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(
      /import\s*\{[^}]*\bKBO_PREDICT_DAILY_TIME_KST\b[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/,
    );
    expect(src).toMatch(/매일 \$\{KBO_PREDICT_DAILY_TIME_KST\}/);
  });
});
