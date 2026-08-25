import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2590 review-code(heavy): reviews/page.tsx (허브) "검증된 예측 없음" 빈 상태 카드가
// rounded-2xl(히어로 전용 토큰)로 landing. 형제 라우트 전부 rounded-xl 사용:
// reviews/misses, reviews/weekly/[week], reviews/monthly/[month] (KBO/MLB/EN 6벌 전체).
// 허브 자신만 유일하게 다른 radius — cycle 2588(허브 헤드라인 색상 drift)과 같은 파일,
// 다른 축(border-radius)의 별개 재발.

const hubSrc = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 2590 — reviews 허브 빈 상태 카드 border-radius 정렬', () => {
  it('검증된 예측 없음 빈 상태 카드 = rounded-xl (형제 라우트와 정렬)', () => {
    expect(hubSrc).toContain(
      "bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center"
    );
  });

  it('빈 상태 카드에 rounded-2xl 잔존 0건', () => {
    expect(hubSrc).not.toContain(
      "bg-white dark:bg-[var(--color-surface-card)] rounded-2xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center"
    );
  });
});
