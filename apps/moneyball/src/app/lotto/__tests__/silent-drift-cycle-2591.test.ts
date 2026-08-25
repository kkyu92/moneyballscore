import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2591 review-code(heavy): lotto/page.tsx ResultSection (추첨 결과 정리 카드)이
// rounded-2xl(히어로 전용 토큰, DESIGN.md xl:16px)로 landing — 동일 위치 히어로 섹션
// (line 244, gradient brand-700/800)과 혼동. 다른 amber 알림/카드 (accuracy/page.tsx,
// en/mlb 계열 postseason/wild-card 카드 등)는 전부 rounded-xl(lg:12px, 카드 전용).
// border-radius drift family 재발 (cycle 2583 홈 카드, cycle 2590 analysis+reviews 허브
// 빈 상태 카드에 이은 별개 파일).

const pageSrc = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 2591 — lotto ResultSection border-radius 정렬', () => {
  it('ResultSection 카드 = rounded-xl (rounded-2xl drift 정정)', () => {
    expect(pageSrc).toContain(
      'space-y-3 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-5'
    );
  });

  it('ResultSection 카드에 rounded-2xl 잔존 0건', () => {
    expect(pageSrc).not.toContain(
      'space-y-3 rounded-2xl border-2 border-amber-300 dark:border-amber-700'
    );
  });

  it('히어로 섹션(gradient brand-700/800)은 rounded-2xl 그대로 유지 (별개 컨벤션, 범위 밖)', () => {
    expect(pageSrc).toContain('className="rounded-2xl p-6 md:p-8 space-y-3"');
  });
});
