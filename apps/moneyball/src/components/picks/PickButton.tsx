'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { shortTeamName, type TeamCode } from '@moneyball/shared';
import { useUserPicks } from '@/hooks/use-user-picks';
import type { PickPollEntry } from '@/app/api/picks/poll/route';

const MIN_POLL_TOTAL = 3;

interface Props {
  gameId: number;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  aiPredictedWinner?: 'home' | 'away';
  aiWinProb?: number;
  aiTopFactor?: string;
}

function PollBar({
  poll,
  myPick,
  homeName,
  awayName,
}: {
  poll: PickPollEntry;
  myPick: 'home' | 'away';
  homeName: string;
  awayName: string;
}) {
  const homePct = poll.total > 0 ? Math.round((poll.home / poll.total) * 100) : 50;
  const awayPct = 100 - homePct;

  return (
    <div className="mt-2 px-1 space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-400">
        <span>커뮤니티 픽</span>
        <span>{poll.total}명 참여</span>
      </div>
      <div className="relative h-7 rounded-lg overflow-hidden flex text-xs font-medium">
        <div
          className={`flex items-center justify-center transition-all h-full ${
            myPick === 'away'
              ? 'bg-brand-500 dark:bg-brand-400 text-white'
              : 'bg-gray-100 dark:bg-[var(--color-surface)] text-gray-600 dark:text-gray-300'
          }`}
          style={{ width: `${awayPct}%` }}
        >
          {awayPct >= 20 && `${awayName} ${awayPct}%`}
        </div>
        <div
          className={`flex items-center justify-center transition-all h-full ${
            myPick === 'home'
              ? 'bg-brand-500 dark:bg-brand-400 text-white'
              : 'bg-gray-100 dark:bg-[var(--color-surface)] text-gray-600 dark:text-gray-300'
          }`}
          style={{ width: `${homePct}%` }}
        >
          {homePct >= 20 && `${homeName} ${homePct}%`}
        </div>
      </div>
    </div>
  );
}

export function PickButton({ gameId, homeTeam, awayTeam, aiPredictedWinner, aiWinProb, aiTopFactor }: Props) {
  const { getPick, setPick } = useUserPicks();
  const current = getPick(gameId);
  const [poll, setPoll] = useState<PickPollEntry | null>(null);

  const homeName = shortTeamName(homeTeam) ?? homeTeam;
  const awayName = shortTeamName(awayTeam) ?? awayTeam;

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    fetch(`/api/picks/poll?ids=${gameId}`)
      .then((r) => r.json())
      .then((data: Record<string, PickPollEntry>) => {
        if (!cancelled) {
          const entry = data[String(gameId)];
          if (entry) setPoll(entry);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [gameId, current]);

  const base =
    'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
  const active = 'bg-brand-500 dark:bg-brand-400 text-white border-transparent';
  const idle =
    'border-gray-200 dark:border-[var(--color-border)] text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-300';

  const showPoll = current && poll && poll.total >= MIN_POLL_TOTAL;

  const aiProbPct = aiWinProb != null ? Math.round(aiWinProb * 100) : null;
  const aiTeamName = aiPredictedWinner === 'home' ? homeName : aiPredictedWinner === 'away' ? awayName : null;
  const aiSideLabel = aiPredictedWinner === 'home' ? '홈' : aiPredictedWinner === 'away' ? '원정' : null;

  return (
    <div>
      {aiProbPct != null && aiTeamName != null && (
        <div className="flex items-center gap-1 mt-2 px-1 text-xs text-gray-400 dark:text-gray-500">
          <span className="shrink-0">AI 예측:</span>
          <span className="font-medium text-gray-600 dark:text-gray-300 shrink-0">
            {aiTeamName} {aiSideLabel}
          </span>
          <span className="shrink-0">{aiProbPct}%</span>
          {aiTopFactor && (
            <>
              <span>·</span>
              <span className="truncate">{aiTopFactor}</span>
            </>
          )}
          <Link
            href={`/analysis/game/${gameId}`}
            className="ml-auto shrink-0 text-brand-600 dark:text-brand-400 hover:underline"
            aria-label={`경기 ${gameId} 분석 보기`}
          >
            분석 보기 ↗
          </Link>
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 px-1">
        <span className="text-xs text-gray-400 dark:text-gray-400 shrink-0">내 픽</span>
        <button
          type="button"
          onClick={() => setPick(gameId, 'away')}
          className={`${base} ${current?.pick === 'away' ? active : idle}`}
          aria-pressed={current?.pick === 'away'}
          aria-label={`${awayName} 원정팀 픽`}
        >
          {awayName} 원정
        </button>
        <button
          type="button"
          onClick={() => setPick(gameId, 'home')}
          className={`${base} ${current?.pick === 'home' ? active : idle}`}
          aria-pressed={current?.pick === 'home'}
          aria-label={`${homeName} 홈팀 픽`}
        >
          {homeName} 홈
        </button>
      </div>
      {showPoll && (
        <PollBar
          poll={poll}
          myPick={current.pick}
          homeName={homeName}
          awayName={awayName}
        />
      )}
      {current && poll && poll.total > 0 && poll.total < MIN_POLL_TOTAL && (
        <p className="mt-1 px-1 text-xs text-gray-400 dark:text-gray-400">
          {poll.total}명 참여 중 · 더 많이 참여하면 결과가 공개돼요
        </p>
      )}
    </div>
  );
}
