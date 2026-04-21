'use client';

import { useKboScores } from '@/hooks/use-kbo-scores';
import { shortTeamName, type TeamCode } from '@moneyball/shared';
import type { LiveScore } from '@/app/api/kbo-scores/route';
import { TeamLogo } from '../shared/TeamLogo';

function StatusBadge({ score }: { score: LiveScore }) {
  switch (score.status) {
    case 'live':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          {score.statusText}
        </span>
      );
    case 'final':
      return (
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">종료</span>
      );
    case 'cancelled':
      return (
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">취소</span>
      );
    default:
      return (
        <span className="text-xs text-gray-400 dark:text-gray-500">{score.gameTime}</span>
      );
  }
}

function ScoreCard({ score }: { score: LiveScore }) {
  const isLive = score.status === 'live';
  const isFinal = score.status === 'final';
  const showScore = isLive || isFinal;
  const homeWon = isFinal && score.homeScore > score.awayScore;
  const awayWon = isFinal && score.awayScore > score.homeScore;

  const teamNameClass = (won: boolean, lost: boolean) =>
    won
      ? 'text-brand-700 dark:text-brand-400 font-bold'
      : lost
        ? 'text-gray-400 dark:text-gray-500'
        : '';
  const scoreClass = (won: boolean, lost: boolean) =>
    won
      ? 'text-brand-700 dark:text-brand-400'
      : lost
        ? 'text-gray-400 dark:text-gray-500'
        : '';

  return (
    <div
      className={`flex-shrink-0 w-[160px] rounded-lg border p-3 ${
        isLive
          ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30'
          : 'border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)]'
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[60px]">
          {score.stadium}
        </span>
        <StatusBadge score={score} />
      </div>

      {/* Away (왼쪽 기준) */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <TeamLogo team={score.awayTeam as TeamCode} size={20} />
          <span className={`text-sm truncate ${teamNameClass(awayWon, homeWon)}`}>
            {shortTeamName(score.awayTeam as TeamCode) || score.awayTeamName}
          </span>
          {awayWon && (
            <span className="flex-shrink-0 px-1 py-0.5 rounded text-[9px] font-bold bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 leading-none">
              승
            </span>
          )}
        </div>
        {showScore && (
          <span className={`text-sm font-bold tabular-nums ${scoreClass(awayWon, homeWon)}`}>
            {score.awayScore}
          </span>
        )}
      </div>

      {/* Home */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <TeamLogo team={score.homeTeam as TeamCode} size={20} />
          <span className={`text-sm truncate ${teamNameClass(homeWon, awayWon)}`}>
            {shortTeamName(score.homeTeam as TeamCode) || score.homeTeamName}
          </span>
          <span
            className="flex-shrink-0 px-1 py-0.5 rounded text-[9px] font-semibold bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 leading-none"
            aria-label="홈팀"
          >
            홈
          </span>
          {homeWon && (
            <span className="flex-shrink-0 px-1 py-0.5 rounded text-[9px] font-bold bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 leading-none">
              승
            </span>
          )}
        </div>
        {showScore && (
          <span className={`text-sm font-bold tabular-nums ${scoreClass(homeWon, awayWon)}`}>
            {score.homeScore}
          </span>
        )}
      </div>
    </div>
  );
}

export function LiveScoreboard() {
  const { scores, updatedAt, isLoading, hasLiveGames } = useKboScores();

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[160px] h-[88px] rounded-lg border border-gray-200 dark:border-[var(--color-border)] bg-gray-50 dark:bg-gray-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (scores.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">실시간 스코어</h2>
          {hasLiveGames && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        {updatedAt && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(updatedAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            갱신
          </span>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {scores.map((score) => (
          <ScoreCard key={score.gameId} score={score} />
        ))}
      </div>
    </section>
  );
}
