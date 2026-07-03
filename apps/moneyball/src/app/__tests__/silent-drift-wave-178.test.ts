import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 178 — accuracy/page.tsx 사용자 가시 "v1.8" 하드코딩 → CURRENT_SCORING_RULE 단일 source', () => {
  it('accuracy/page.tsx: metadata description 하드코딩 "v1.8" 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/accuracy/page.tsx'),
      'utf8',
    );
    // metadata description 안 "정량 모델 v1.8" 하드코딩 금지
    expect(src).not.toMatch(/정량 모델 v1\.8/);
  });

  it('accuracy/page.tsx: V18SubCohortPanel h2 하드코딩 "현 버전 (v1.8) 세부 분석" 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/accuracy/page.tsx'),
      'utf8',
    );
    // JSX h2 heading 안 "현 버전 (v1.8) 세부 분석" 패턴 금지 (code comment 제외)
    const jsxLines = src.split('\n').filter(line => !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*'));
    const joined = jsxLines.join('\n');
    expect(joined).not.toMatch(/현 버전 \(v1\.8\)/);
  });

  it('accuracy/page.tsx: CURRENT_SCORING_RULE import + 사용', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/accuracy/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(
      /import\s*\{[^}]*\bCURRENT_SCORING_RULE\b[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/,
    );
    expect(src).toMatch(/\$\{CURRENT_SCORING_RULE\}/);
    expect(src).toMatch(/\{CURRENT_SCORING_RULE\}/);
  });
});
