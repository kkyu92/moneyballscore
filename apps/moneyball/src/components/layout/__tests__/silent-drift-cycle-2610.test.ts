import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2610 review-code(heavy): motion duration axis 첫 발견 — 모바일 아코디언(MobileNav)
// disclosure chevron 이 desktop nav dropdown chevron(navigation-menu.tsx, duration-200)과
// 동일한 "열림/닫힘 토글" 역할이면서 duration-150(--motion-fast, nav hover 용도)을 사용 —
// DESIGN.md motion 토큰 정의상 "dropdown open" = --motion-medium(200ms). 역할 정렬.

const src = readFileSync(join(__dirname, '../MobileNav.tsx'), 'utf8');

describe('silent drift cycle 2610 — MobileNav accordion chevron duration → 200ms 정렬', () => {
  it('chevron transition-transform duration-200 (desktop dropdown chevron과 동일 토큰)', () => {
    expect(src).toContain('transition-transform duration-200 group-data-[state=open]:rotate-180');
  });

  it('duration-150 잔존 0건 (chevron 축)', () => {
    expect(src).not.toContain('transition-transform duration-150');
  });
});
