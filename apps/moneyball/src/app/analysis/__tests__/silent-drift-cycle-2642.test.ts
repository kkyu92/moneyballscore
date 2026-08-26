import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FACTOR_PICK_STRONG, FACTOR_PICK_COMPLETE } from '@moneyball/shared';

// cycle 2642 review-code(heavy): "이번 주 남은 경기" 카드의 isStrongUpcomingPick 정의/사용처 주석은
// "TOP픽 제외" / "TOP픽·완전수렴 외" 로 완전수렴(FACTOR_PICK_COMPLETE=10) 경기를 강수렴(⚡ 픽) 배지에서
// 제외한다고 주장하지만, 실제 코드는 `!isTopUpcomingPick && strongUpcomingPickGameIds.has(g.gameId)` 로
// TOP픽만 제외했다. FACTOR_PICK_COMPLETE(10) >= FACTOR_PICK_STRONG(8) 이라 완전수렴 경기는 항상
// strongUpcomingPickGameIds 의 부분집합 — 비TOP픽 완전수렴 경기에서 "★ 완전수렴"과 "⚡ 픽" 배지가
// 동시 렌더링되던 gap. isStrongUpcomingPick 정의에 !isCompleteUpcomingPick 조건 추가로 정정.

const src = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

function computeFlags(
  gameId: number,
  topId: number | null,
  strongSet: Set<number>,
  completeSet: Set<number>,
) {
  const isTopUpcomingPick = topId !== null && gameId === topId;
  const isCompleteUpcomingPick = completeSet.has(gameId);
  const isStrongUpcomingPick = !isTopUpcomingPick && !isCompleteUpcomingPick && strongSet.has(gameId);
  return { isTopUpcomingPick, isCompleteUpcomingPick, isStrongUpcomingPick };
}

describe('silent drift cycle 2642 — 완전수렴 픽 강수렴(⚡) 배지 중복 정정', () => {
  it('page.tsx isStrongUpcomingPick 정의가 isCompleteUpcomingPick 을 제외한다', () => {
    expect(src).toContain(
      'const isStrongUpcomingPick = !isTopUpcomingPick && !isCompleteUpcomingPick && strongUpcomingPickGameIds.has(g.gameId);',
    );
  });

  it('비TOP픽 완전수렴 경기는 강수렴(⚡) 배지에서 제외된다', () => {
    // gameId 2 = 완전수렴(10), TOP픽 아님 / gameId 1 = 강수렴(8), TOP픽
    const strongSet = new Set([1, 2]);
    const completeSet = new Set([2]);
    const { isCompleteUpcomingPick, isStrongUpcomingPick } = computeFlags(2, 1, strongSet, completeSet);
    expect(isCompleteUpcomingPick).toBe(true);
    expect(isStrongUpcomingPick).toBe(false); // ★ 완전수렴 과 ⚡ 픽 동시 표시 방지
  });

  it('TOP픽도 아니고 완전수렴도 아닌 강수렴 경기는 그대로 ⚡ 픽 배지를 받는다', () => {
    const strongSet = new Set([1, 3]);
    const completeSet = new Set<number>([]);
    const { isStrongUpcomingPick } = computeFlags(3, 1, strongSet, completeSet);
    expect(isStrongUpcomingPick).toBe(true);
  });

  it('FACTOR_PICK_COMPLETE >= FACTOR_PICK_STRONG (완전수렴은 항상 강수렴의 부분집합)', () => {
    expect(FACTOR_PICK_COMPLETE).toBeGreaterThanOrEqual(FACTOR_PICK_STRONG);
  });
});
