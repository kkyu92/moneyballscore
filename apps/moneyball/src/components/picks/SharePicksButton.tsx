'use client';

import { useState } from 'react';
import type { PicksStats } from '@/lib/picks/buildPicksStats';

const SITE_URL = 'https://moneyballscore.vercel.app/picks';

interface Props {
  stats: PicksStats;
}

function buildShareText(stats: PicksStats): string {
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

  return `[머니볼스코어] AI와 픽 대결${verdict}\n${myLine}\n${aiLine}\n\nKBO 경기 AI 예측 → ${SITE_URL}`;
}

export function SharePicksButton({ stats }: Props) {
  const [copied, setCopied] = useState(false);

  if (stats.resolved === 0) return null;

  const handleShare = async () => {
    const text = buildShareText(stats);

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
          <span>✓</span>
          <span>클립보드에 복사됨</span>
        </>
      ) : (
        <>
          <span>공유하기</span>
          <span className="text-xs text-gray-400">내 픽 성적 자랑하기</span>
        </>
      )}
    </button>
  );
}
