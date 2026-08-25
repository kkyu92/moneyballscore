import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2592 review-code(heavy): 오늘의 빅매치 카드 hover shadow drift 정정.
// DESIGN.md Motion 섹션: "카드 hover: transition-shadow (hover:shadow-md)" — 사이트 전체
// hover:shadow-* 32건 중 31건이 hover:shadow-md, analysis/page.tsx 빅매치 카드만 유일하게
// hover:shadow-xl 로 landing. 정적 shadow-* 도 shadow-md 28건이 dominant. border-radius axis
// 스윕(cycle 2583/2590/2591) 완료 후 신규 축(shadow) 첫 발견.

const src = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 2592 — 빅매치 카드 hover shadow 정렬', () => {
  it('빅매치 카드 hover shadow = hover:shadow-md (DESIGN.md 카드 hover 스펙 정렬)', () => {
    expect(src).toContain(
      "bg-gradient-to-br from-[var(--color-bg-hero-start)] to-[var(--color-bg-hero-end)] text-white rounded-2xl p-8 hover:shadow-md transition-shadow"
    );
  });

  it('hover:shadow-xl 잔존 0건', () => {
    expect(src).not.toContain('hover:shadow-xl');
  });
});
