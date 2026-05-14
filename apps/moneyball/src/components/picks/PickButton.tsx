'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { shortTeamName, type TeamCode } from '@moneyball/shared';
import { useUserPicks } from '@/hooks/use-user-picks';
import type { PickPollEntry } from '@/app/api/picks/poll/route';

const MIN_POLL_TOTAL = 3;
const DEVICE_KEY = 'mb_device_id_v1';

function getOrCreateDeviceId(): string {
  try {
    const stored = localStorage.getItem(DEVICE_KEY);
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

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
  aiHomePct,
}: {
  poll: PickPollEntry;
  myPick: 'home' | 'away';
  homeName: string;
  awayName: string;
  aiHomePct?: number;
}) {
  const homePct = poll.total > 0 ? Math.round((poll.home / poll.total) * 100) : 50;
  const awayPct = 100 - homePct;
  const showDivergence = aiHomePct != null && Math.abs(aiHomePct - homePct) >= 20;

  return (
    <div className="mt-2 px-1 space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-400">
        <span className="flex items-center gap-1">
          커뮤니티 픽
          {showDivergence && (
            <span className="text-amber-500 dark:text-amber-400 font-medium">⚡ AI와 반대</span>
          )}
        </span>
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

  const fetchPoll = useCallback(() => {
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
  }, [gameId]);

  useEffect(() => {
    return fetchPoll();
  }, [gameId, fetchPoll]);

  const handlePick = useCallback(
    (choice: 'home' | 'away') => {
      setPick(gameId, choice);
      const deviceId = getOrCreateDeviceId();
      fetch('/api/picks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, pick: choice, device_id: deviceId }),
      })
        .then(() => fetchPoll())
        .catch(() => {});
    },
    [gameId, setPick, fetchPoll],
  );

  const base =
    'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
  const active = 'bg-brand-500 dark:bg-brand-400 text-white border-transparent';
  const idle =
    'border-gray-200 dark:border-[var(--color-border)] text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-300';

  const showPoll = current && poll && poll.total >= MIN_POLL_TOTAL;

  const aiProbPct = aiWinProb != null ? Math.round(aiWinProb * 100) : null;
  const aiTeamName = aiPredictedWinner === 'home' ? homeName : aiPredictedWinner === 'away' ? awayName : null;
  const aiSideLabel = aiPredictedWinner === 'home' ? '홈' : aiPredictedWinner === 'away' ? '원정' : null;
  const aiHomePct =
    aiProbPct != null
      ? aiPredictedWinner === 'home'
        ? aiProbPct
        : 100 - aiProbPct
      : undefined;

  return (
    <div>
      {aiProbPct != null && aiTeamName != null && (
        <div className="mt-2 px-1 space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-brand-600 dark:text-brand-400 shrink-0">AI 예측</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 shrink-0">
              {aiTeamName} {aiSideLabel}
            </span>
            <span className="bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-semibold px-1.5 py-0.5 rounded text-[11px] shrink-0 tabular-nums">
              {aiProbPct}%
            </span>
            <Link
              href={`/analysis/game/${gameId}`}
              className="ml-auto shrink-0 text-brand-600 dark:text-brand-400 hover:underline"
              aria-label={`경기 ${gameId} 분석 보기`}
            >
              분석 보기 ↗
            </Link>
          </div>
          {aiTopFactor && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              주요 팩터: {aiTopFactor}
            </p>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 px-1">
        <span className="text-xs text-gray-400 dark:text-gray-400 shrink-0">내 픽</span>
        <button
          type="button"
          onClick={() => handlePick('away')}
          className={`${base} ${current?.pick === 'away' ? active : idle}`}
          aria-pressed={current?.pick === 'away'}
          aria-label={`${awayName} 원정팀 픽`}
        >
          {awayName} 원정
        </button>
        <button
          type="button"
          onClick={() => handlePick('home')}
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
          aiHomePct={aiHomePct}
        />
      )}
      {!current && poll && poll.total > 0 && (
        <p className="mt-1.5 px-1 text-xs text-gray-500 dark:text-gray-300 flex items-center gap-1">
          <span className="font-semibold text-brand-600 dark:text-brand-400 tabular-nums">{poll.total}명</span>
          <span>참여 중 · 픽 후 결과 공개</span>
        </p>
      )}
      {current && poll && poll.total > 0 && poll.total < MIN_POLL_TOTAL && (
        <p className="mt-1.5 px-1 text-xs text-gray-500 dark:text-gray-300">
          {poll.total}명 참여 중 · {MIN_POLL_TOTAL}명 이상 모이면 분포 공개
        </p>
      )}
    </div>
  );
}
