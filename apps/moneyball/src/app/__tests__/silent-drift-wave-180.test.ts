import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 180 — v2-preview/page.tsx 사용자 가시 "v1.8" 하드코딩 → CURRENT_SCORING_RULE 단일 source', () => {
  it('v2-preview/page.tsx: metadata description 하드코딩 "현 v1.8 예측" 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/v2-preview/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/현 v1\.8 예측/);
  });

  it('v2-preview/page.tsx: JSX 안 하드코딩 "v1.8 vs v2.1-B" 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/v2-preview/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/v1\.8 vs v2\.1-B/);
  });

  it('v2-preview/page.tsx: JSX 안 하드코딩 "v1.8 대비 변경" 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/v2-preview/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/v1\.8 대비 변경/);
  });

  it('v2-preview/page.tsx: JSX 안 하드코딩 "v1.8 홈승률" 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/v2-preview/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/v1\.8 홈승률/);
  });

  it('v2-preview/page.tsx: CURRENT_SCORING_RULE import + 사용', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/v2-preview/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(
      /import\s*\{[^}]*\bCURRENT_SCORING_RULE\b[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/,
    );
    expect(src).toMatch(/\$\{CURRENT_SCORING_RULE\}/);
    expect(src).toMatch(/\{CURRENT_SCORING_RULE\}/);
  });
});
