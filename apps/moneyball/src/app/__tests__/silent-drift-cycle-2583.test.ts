import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// cycle 2583 review-code (heavy): 홈(page.tsx)이 4개 일반 카드 섹션(경기 없음
// fallback / 이번 주 일정 / KBO 팀 순위 / 분석 방법론)에 rounded-2xl 을 썼음.
// DESIGN.md 는 rounded-2xl 을 "히어로 섹션" 전용으로 예약(rounded-xl = 카드).
// 같은 파일 안 "오늘 예측" 카드(744줄)는 이미 rounded-xl 로 맞았고, sibling
// 페이지(accuracy/matchup/players)도 rounded-2xl 을 브랜드 그라디언트 히어로
// 헤더에만 쓰는 걸 확인 — page.tsx 만 4곳 이탈. 사이트 전체 rounded-xl 96파일
// vs rounded-2xl 12파일(전부 히어로 전용) 이 근거. 100+ 파일 규모 전면 스윕은
// 범위 밖(가드 대상) — 본 cycle 은 page.tsx 1파일만 좁게 정정.

describe('cycle 2583 — 홈 일반 카드 섹션 rounded-xl 정렬 (히어로만 rounded-2xl)', () => {
  it('page.tsx: 히어로 플레이스홀더는 rounded-2xl 유지, 일반 카드 4곳은 rounded-xl', () => {
    const full = readFileSync(
      path.resolve(__dirname, '../page.tsx'),
      'utf8',
    );

    // 히어로 (bg-gradient 브랜드 배너) = rounded-2xl 유지
    expect(full).toContain(
      'bg-gradient-to-r from-brand-800 to-brand-700 rounded-2xl p-6 md:p-8 text-white',
    );

    // 일반 카드 4곳 = rounded-xl 로 정정 (이전엔 rounded-2xl)
    expect(full).toContain(
      "rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 md:p-8",
    );
    expect(full).toContain(
      '<h2 className="text-lg font-bold">이번 주 일정</h2>',
    );
    expect(full).toContain(
      '<h2 className="text-lg font-bold">KBO 팀 순위</h2>',
    );
    expect(full).toContain(
      '<h2 className="text-lg font-bold">분석 방법론</h2>',
    );

    const genericCardCount = (
      full.match(
        /rounded-xl border border-gray-200 dark:border-\[var\(--color-border\)\] p-6/g,
      ) ?? []
    ).length;
    // "오늘 예측" 카드(기존) + 4개 정정 카드 = 5개
    expect(genericCardCount).toBe(5);
  });
});
