import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2593 review-code(heavy): dashboard/error.tsx 버튼이 sibling app/error.tsx 와
// 동일 focus-visible:outline 스택(outline/outline-2/outline-offset-2)을 쓰면서
// focus-visible:outline-brand-500 색상만 누락 — 두 파일 kebab twin 재확인 후 정정.

const src = readFileSync(join(__dirname, '../error.tsx'), 'utf8');

describe('silent drift cycle 2593 — dashboard/error.tsx focus-visible outline-brand-500 정렬', () => {
  it('재시도 버튼 = app/error.tsx 와 동일 focus-visible outline 스택', () => {
    expect(src).toContain(
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
    );
  });
});
