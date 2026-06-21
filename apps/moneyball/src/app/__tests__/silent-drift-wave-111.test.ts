import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 111 — "10개 팩터" / "10팩터" 하드코딩 → KBO_FACTOR_COUNT 단일 source', () => {
  it('predictions/[date]/page.tsx: "10개 팩터" 하드코딩 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/predictions/[date]/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/10개 팩터/);
  });

  it('predictions/[date]/page.tsx: KBO_FACTOR_COUNT import + template literal 사용', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/predictions/[date]/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(
      /import\s*\{[^}]*\bKBO_FACTOR_COUNT\b[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/,
    );
    expect(src).toMatch(/\$\{KBO_FACTOR_COUNT\}개 팩터/);
  });
});
