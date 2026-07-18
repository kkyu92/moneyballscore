import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// wave-466: FACTOR_PICK_STRONG / FACTOR_PICK_COMPLETE JSDoc description line 정정
// wave-463/465 '완전수렴'/'강수렴' 레이블 칩 추가 후 두 번째 설명 줄 누락 정정

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

describe('wave-466 — JSDoc description line 정정', () => {
  it('FACTOR_PICK_STRONG JSDoc 두 번째 줄: 강수렴 레이블 칩 언급 존재', () => {
    const block = sharedSrc.match(/\/\*\*[\s\S]*?FACTOR_PICK_STRONG = 8/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain("'강수렴' 레이블 칩");
  });

  it('FACTOR_PICK_COMPLETE JSDoc 두 번째 줄: analysis/page.tsx 완전수렴 레이블 칩 언급 존재', () => {
    const block = sharedSrc.match(/\/\*\*[\s\S]*?FACTOR_PICK_COMPLETE = 10/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain("wave-465");
    expect(block![0]).toContain("'완전수렴' 레이블 칩");
  });

  it('FACTOR_PICK_COMPLETE JSDoc 두 번째 줄: game/[id] wave-463 완전수렴 레이블 칩 언급 존재', () => {
    const block = sharedSrc.match(/\/\*\*[\s\S]*?FACTOR_PICK_COMPLETE = 10/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('wave-463');
  });

  it('FACTOR_PICK_STRONG JSDoc 두 번째 줄: isComplete=false 전제 명시 존재', () => {
    const block = sharedSrc.match(/\/\*\*[\s\S]*?FACTOR_PICK_STRONG = 8/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('isComplete=false');
  });
});
