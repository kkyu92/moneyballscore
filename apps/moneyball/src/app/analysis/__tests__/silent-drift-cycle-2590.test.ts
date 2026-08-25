import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2590 review-code(heavy): analysis/page.tsx (2833줄, mlb 계열 twin 없는 KBO 단독 monolith)
// "오늘 경기 없음" 빈 상태 카드가 rounded-2xl(히어로 전용 토큰, DESIGN.md xl:16px)로 landing.
// 동일 패턴 (bg-gray-50 dark:bg-[var(--color-surface-card)] ... text-center text-gray-500)
// 을 쓰는 analysis/game/[id]/page.tsx, debug/hallucination, debug/pipeline 은 전부 rounded-xl
// (lg:12px, 카드 전용) — 히어로 아닌 일반 빈 상태 카드에 히어로 토큰 오차용 (cycle 2583
// 홈 일반 카드 rounded-2xl→rounded-xl family 와 동일 계열, DESIGN.md border-radius 규칙 위반).

const src = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 2590 — analysis 빈 상태 카드 border-radius 정렬', () => {
  it('오늘 경기 없음 빈 상태 카드 = rounded-xl (히어로 전용 rounded-2xl 오차용 정정)', () => {
    expect(src).toContain(
      "bg-gray-50 dark:bg-[var(--color-surface-card)] rounded-xl p-8 text-center text-gray-500 dark:text-gray-400"
    );
  });

  it('빈 상태 카드에 rounded-2xl 잔존 0건 (히어로 섹션은 별도 gradient 클래스, 영향 없음)', () => {
    expect(src).not.toContain(
      "bg-gray-50 dark:bg-[var(--color-surface-card)] rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400"
    );
  });
});
