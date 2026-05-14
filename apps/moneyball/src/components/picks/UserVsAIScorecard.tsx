'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUserPicks } from '@/hooks/use-user-picks';
import { buildPickEntries, buildPicksStats } from '@/lib/picks/buildPicksStats';
import type { PickGameResult } from '@/app/api/picks/results/route';

export interface YesterdayGameSummary {
  id: number;
  home_score: number | null;
  away_score: number | null;
  aiIsCorrect: boolean | null;
}

interface Props {
  aiTotal: number;
  aiCorrect: number;
  yesterdayGames: YesterdayGameSummary[];
}

export function UserVsAIScorecard({ aiTotal, aiCorrect, yesterdayGames }: Props) {
  const { picks } = useUserPicks();
  const [currentStreak, setCurrentStreak] = useState<number>(0);

  const totalPicks = Object.keys(picks).length;
  const aiRate = aiTotal > 0 ? ((aiCorrect / aiTotal) * 100).toFixed(1) : '0.0';

  useEffect(() => {
    const ids = Object.keys(picks);
    if (ids.length === 0) return;
    let cancelled = false;
    fetch(`/api/picks/results?ids=${ids.join(',')}`)
      .then((r) => r.json())
      .then((results: PickGameResult[]) => {
        if (cancelled) return;
        const entries = buildPickEntries(picks, results);
        const stats = buildPicksStats(entries);
        setCurrentStreak(stats.currentStreak);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [picks]);

  const yesterdayPicked = yesterdayGames.filter((g) => picks[String(g.id)]);
  const yesterdayUserCorrect = yesterdayPicked.filter((g) => {
    const myPick = picks[String(g.id)];
    if (!myPick || g.home_score === null || g.away_score === null) return false;
    const homeWon = g.home_score > g.away_score;
    return myPick.pick === 'home' ? homeWon : !homeWon;
  }).length;

  const aiYesterdayWithResult = yesterdayGames.filter((g) => g.aiIsCorrect !== null);
  const aiYesterdayCorrect = aiYesterdayWithResult.filter((g) => g.aiIsCorrect === true).length;

  const hasYesterdayPicks = yesterdayPicked.length > 0;

  return (
    <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-2xl border border-gray-200 dark:border-[var(--color-border)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">AI와 대결</h2>
          {currentStreak >= 2 && (
            <span className="text-xs font-semibold bg-accent/15 text-accent dark:text-accent-light px-2 py-0.5 rounded-full tabular-nums">
              🔥 {currentStreak}연속
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-400">로컬 저장 · 로그인 불필요</span>
      </div>

      {hasYesterdayPicks ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-brand-50 dark:bg-[var(--color-surface)] rounded-xl p-4 text-center border border-brand-100 dark:border-[var(--color-border)]">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">어제 내 성적</p>
            <p className="text-2xl font-bold text-brand-700 dark:text-brand-300 tabular-nums">
              {yesterdayUserCorrect}
              <span className="text-base font-normal text-gray-400 dark:text-gray-400">
                /{yesterdayPicked.length}
              </span>
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-[var(--color-surface)] rounded-xl p-4 text-center border border-gray-100 dark:border-[var(--color-border)]">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">어제 AI 성적</p>
            <p className="text-2xl font-bold dark:text-gray-100 tabular-nums">
              {aiYesterdayCorrect}
              <span className="text-base font-normal text-gray-400 dark:text-gray-400">
                /{aiYesterdayWithResult.length}
              </span>
            </p>
          </div>
          <div className="col-span-2 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[var(--color-border)]">
            <span className="text-xs text-gray-400 dark:text-gray-400">
              이번 시즌 AI {aiCorrect}/{aiTotal} ({aiRate}%) · 내 총 픽 {totalPicks}경기
            </span>
            <Link
              href="/picks"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline shrink-0 ml-2"
            >
              전체 이력 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
            아직 픽한 경기가 없습니다
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-300 mb-3">
            오늘 경기 카드에서 팀을 픽해보세요
          </p>
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">
            이번 시즌 AI 적중률 {aiRate}% ({aiCorrect}/{aiTotal})
          </p>
          <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mt-1">이길 수 있을까요?</p>
          <Link
            href="/picks"
            className="mt-3 inline-block text-xs text-brand-600 dark:text-brand-400 hover:underline"
          >
            픽 이력 보기 →
          </Link>
        </div>
      )}
    </section>
  );
}
