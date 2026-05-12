'use client';

import { useState } from 'react';
import type { PicksStats, WeeklyStats } from '@/lib/picks/buildPicksStats';

const SITE_URL = 'https://moneyballscore.vercel.app/picks';

interface Props {
  stats: PicksStats;
  weekly?: WeeklyStats | null;
}

function buildShareText(stats: PicksStats, weekly?: WeeklyStats | null): string {
  const myWrong = stats.resolved - stats.myCorrect;
  const myRatePct =
    stats.myRate !== null ? Math.round(stats.myRate * 100) : null;
  const aiWrong = stats.aiResolved - stats.aiCorrect;
  const aiRatePct =
    stats.aiRate !== null ? Math.round(stats.aiRate * 100) : null;

  const myLine =
    myRatePct !== null
      ? `내 성적: ${stats.myCorrect}승 ${myWrong}패 (${myRatePct}%)`
      : '내 성적: 집계 중';
  const aiLine =
    aiRatePct !== null
      ? `AI 성적: ${stats.aiCorrect}승 ${aiWrong}패 (${aiRatePct}%)`
      : 'AI 성적: 집계 중';

  const verdict =
    myRatePct !== null && aiRatePct !== null
      ? myRatePct > aiRatePct
        ? ' 🏆 내가 AI 이기는 중!'
        : myRatePct < aiRatePct
          ? ' AI가 날 이기는 중...'
          : ' 🤝 AI와 동점'
      : '';

  let weeklyLine = '';
  if (weekly && weekly.resolved > 0) {
    const wMyPct = weekly.myRate !== null ? Math.round(weekly.myRate * 100) : null;
    const wVerdict =
      weekly.myRate !== null && weekly.aiRate !== null
        ? weekly.myRate > weekly.aiRate
          ? ' 🏆'
          : ''
        : '';
    weeklyLine =
      wMyPct !== null
        ? `\n이번 주 (${weekly.weekLabel}): ${weekly.myCorrect}/${weekly.resolved} (${wMyPct}%)${wVerdict}`
        : '';
  }

  return `[머니볼스코어] AI와 픽 대결${verdict}${weeklyLine}\n${myLine}\n${aiLine}\n\nKBO 경기 AI 예측 → ${SITE_URL}`;
}

export function SharePicksButton({ stats, weekly }: Props) {
  const [copied, setCopied] = useState(false);

  if (stats.resolved === 0) return null;

  const handleShare = async () => {
    const text = buildShareText(stats, weekly);

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // 취소 또는 미지원 → 클립보드 fallback
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 실패 → silent
    }
  };

  return (
    <button
      onClick={handleShare}
      className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[var(--color-surface)] transition-colors"
    >
      {copied ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-brand-600 dark:text-brand-400" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span>클립보드에 복사됨</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185z" />
          </svg>
          <span>공유하기</span>
          <span className="text-xs text-gray-400">내 픽 성적 자랑하기</span>
        </>
      )}
    </button>
  );
}
