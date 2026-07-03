import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 181 — about/page.tsx FAQ 하드코딩 "v1.8" → CURRENT_SCORING_RULE 단일 source', () => {
  it('about/page.tsx: FAQ 질문 하드코딩 "모델 버전 v1.8 은" 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/about/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/모델 버전 v1\.8 은/);
  });

  it('about/page.tsx: FAQ 답변 하드코딩 "v1.8 (2026-05-12 ~) 의 변경" 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/about/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/v1\.8 \(2026-05-12 ~\) 의 변경/);
  });

  it('about/page.tsx: CURRENT_SCORING_RULE import + 사용', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/about/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(
      /import\s*\{[^}]*\bCURRENT_SCORING_RULE\b[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/,
    );
    expect(src).toMatch(/\$\{CURRENT_SCORING_RULE\}/);
  });
});
