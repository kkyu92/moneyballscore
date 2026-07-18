import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// wave-468: FACTOR_PICK_COMPLETE JSDoc description line 정정
// wave-467 섹션 border/bg 외 제목/성적 텍스트 amber 변경 누락 정정

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);
const analysisListSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);

describe('wave-468 — FACTOR_PICK_COMPLETE JSDoc description line 정정', () => {
  it('FACTOR_PICK_COMPLETE JSDoc 두 번째 줄: wave-467 제목/성적 텍스트 amber 언급 존재', () => {
    const block = sharedSrc.match(/\/\*\*[\s\S]*?FACTOR_PICK_COMPLETE = 10/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('제목/성적 텍스트 amber');
  });

  it('FACTOR_PICK_COMPLETE JSDoc: wave-467 섹션 border/bg 언급 존재', () => {
    const block = sharedSrc.match(/\/\*\*[\s\S]*?FACTOR_PICK_COMPLETE = 10/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('섹션 container amber border/bg');
  });

  it('analysis/page.tsx: 섹션 제목 amber 텍스트 클래스 존재 (text-amber-700 in h2)', () => {
    expect(analysisListSrc).toMatch(/factor-pick-title[\s\S]{0,200}text-amber-700/);
  });

  it('analysis/page.tsx: 섹션 제목 brand 텍스트 클래스 존재 (text-brand-600 in h2 — false 분기)', () => {
    expect(analysisListSrc).toMatch(/factor-pick-title[\s\S]{0,200}text-brand-600/);
  });
});
