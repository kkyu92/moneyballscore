import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2593 review-code(heavy): focus-ring axis 신규 검증 (border-radius/shadow 이후).
// analysis/page.tsx 안 focus-visible:outline-offset-* 값이 전체 파일 12건 중 1건만
// offset-1 이고 나머지 11건은 offset-2 — 인라인 텍스트 링크(승부 예측 요약, line 530)
// 만 예외로 landing. 같은 파일 히어로/카드 링크는 전부 offset-2 유지 — 단일 파일 안
// 자체 불일치라 컨벤션 오차, offset-2 로 정렬.

const src = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 2593 — analysis 인라인 링크 focus-ring offset 정렬', () => {
  it('focus-visible:outline-offset-1 잔존 0건', () => {
    expect(src).not.toContain('focus-visible:outline-offset-1');
  });

  it('focus-visible:outline-offset-2 사용 (파일 전체 컨벤션과 일치)', () => {
    const matches = src.match(/focus-visible:outline-offset-2/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
  });
});
