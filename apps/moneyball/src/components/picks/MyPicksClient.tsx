'use client';

import { useEffect, useState } from 'react';
import { useUserPicks } from '@/hooks/use-user-picks';
import { buildPickEntries, buildPicksStats, buildWeeklyStats, type PickEntry, type PicksStats, type WeeklyStats } from '@/lib/picks/buildPicksStats';
import type { PickGameResult } from '@/app/api/picks/results/route';
import Link from 'next/link';
import { SharePicksButton } from './SharePicksButton';
import { WeeklyPicksSummary } from './WeeklyPicksSummary';
import { LeaderboardJoinModal } from '@/components/leaderboard/LeaderboardJoinModal';
import { useLeaderboard } from '@/lib/leaderboard/use-leaderboard';

function StatCard({ label, value, sub, hero }: { label: string; value: string; sub?: string; hero?: boolean }) {
  return (
    <div className={`bg-white dark:bg-[var(--color-surface-card)] rounded-xl border p-4 text-center ${
      hero
        ? 'border-brand-300 dark:border-brand-700'
        : 'border-gray-200 dark:border-[var(--color-border)]'
    }`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`font-bold tabular-nums ${hero ? 'text-3xl' : 'text-xl'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-300 dark:border-brand-700 p-4 text-center">
            <div className="h-3 w-16 mx-auto mb-2 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-20 mx-auto rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3 text-center">
            <div className="h-3 w-14 mx-auto mb-2 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
            <div className="h-6 w-12 mx-auto rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
        <div className="h-4 w-24 mb-3 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        <div className="flex gap-1.5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-6 h-6 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
      <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
        <div className="h-4 w-16 mb-3 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 py-2 border-b border-gray-100 dark:border-[var(--color-border)]">
            <div className="h-4 w-10 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 flex-1 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-14 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PickRow({ entry }: { entry: PickEntry }) {
  const dateStr = entry.game_date.slice(5); // "MM-DD"
  const myLabel = entry.myPick === 'home' ? entry.homeTeamName : entry.awayTeamName;
  const aiLabel = entry.aiPredictedHome === null
    ? null
    : entry.aiPredictedHome
    ? entry.homeTeamName
    : entry.awayTeamName;

  let resultEl: React.ReactNode = (
    <span className="text-xs text-gray-400 dark:text-gray-500">대기중</span>
  );
  if (entry.isResolved) {
    const scoreStr = `${entry.homeScore ?? '-'}:${entry.awayScore ?? '-'}`;
    resultEl = (
      <span className={`text-xs font-semibold ${entry.myIsCorrect ? 'text-brand-600 dark:text-brand-400' : 'text-red-600 dark:text-red-400'}`}>
        {entry.myIsCorrect ? '✓' : '✗'} {scoreStr}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-[var(--color-border)] last:border-0">
      <span className="text-xs text-gray-400 dark:text-gray-500 w-10 shrink-0 tabular-nums">{dateStr}</span>
      <span className="flex-1 text-sm truncate min-w-0">
        {entry.awayTeamName ?? '?'} @ {entry.homeTeamName ?? '?'}
      </span>
      <span className="text-xs text-gray-600 dark:text-gray-300 shrink-0">
        내 픽: <span className="font-medium">{myLabel ?? entry.myPick}</span>
      </span>
      {aiLabel && (
        <span className={`text-xs shrink-0 ${
          entry.isResolved && entry.aiIsCorrect !== null
            ? entry.aiIsCorrect
              ? 'text-brand-600 dark:text-brand-400'
              : 'text-red-500 dark:text-red-400'
            : 'text-gray-400 dark:text-gray-500'
        }`}>
          AI: {aiLabel}{entry.isResolved && entry.aiIsCorrect !== null ? (entry.aiIsCorrect ? ' ✓' : ' ✗') : ''}
        </span>
      )}
      <span className="w-16 text-right shrink-0">{resultEl}</span>
    </div>
  );
}

export function MyPicksClient() {
  const { picks } = useUserPicks();
  const [entries, setEntries] = useState<PickEntry[]>([]);
  const [stats, setStats] = useState<PicksStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const { nickname, syncState, syncCount, join } = useLeaderboard();

  const handleLeaderboardJoin = async (name: string) => {
    await join(name);
    setShowLeaderboardModal(false);
  };

  useEffect(() => {
    const ids = Object.keys(picks);
    if (ids.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasNetworkError(false);
    fetch(`/api/picks/results?ids=${ids.join(',')}`)
      .then((r) => r.json())
      .then((results: PickGameResult[]) => {
        const e = buildPickEntries(picks, results);
        setEntries(e);
        setStats(buildPicksStats(e));
        setWeekly(buildWeeklyStats(e));
      })
      .catch(() => {
        // show picks without results, surface a soft error notice
        const e = buildPickEntries(picks, []);
        setEntries(e);
        setStats(buildPicksStats(e));
        setWeekly(buildWeeklyStats(e));
        setHasNetworkError(true);
      })
      .finally(() => setLoading(false));
  }, [picks]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-brand-400 dark:text-brand-500" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M5.5 8.5c1.5 1 3.5 1.5 6.5 1.5s5-0.5 6.5-1.5" />
            <path d="M5.5 15.5c1.5-1 3.5-1.5 6.5-1.5s5 0.5 6.5 1.5" />
            <line x1="12" y1="2" x2="12" y2="22" />
          </svg>
        </div>
        <p className="text-lg font-semibold mb-2">아직 픽한 경기가 없습니다</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          오늘 경기 카드에서 홈 또는 원정팀을 픽해보세요
        </p>
        <Link
          href="/"
          className="inline-block bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-600 transition-colors"
        >
          오늘 경기 보러 가기
        </Link>
      </div>
    );
  }

  const myRateStr = stats?.myRate != null ? `${(stats.myRate * 100).toFixed(1)}%` : '—';
  const aiRateStr = stats?.aiRate != null ? `${(stats.aiRate * 100).toFixed(1)}%` : '—';
  const streakStr = stats
    ? stats.currentStreak > 0 ? `${stats.currentStreak}연속` : '없음'
    : '—';
  const pickingDaysStr = stats
    ? stats.pickingStreakDays > 0 ? `${stats.pickingStreakDays}일째` : '—'
    : '—';

  return (
    <div className="space-y-6">
      {hasNetworkError && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
          결과를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.
        </p>
      )}

      {/* 이번 주 요약 */}
      {weekly && stats && (
        <WeeklyPicksSummary weekly={weekly} currentStreak={stats.currentStreak} />
      )}

      {/* 히어로 요약 카드 — 내/AI 적중률 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="내 적중률"
          value={myRateStr}
          sub={stats ? `${stats.myCorrect}/${stats.resolved}` : undefined}
          hero
        />
        <StatCard
          label="AI 적중률"
          value={aiRateStr}
          sub={stats ? `${stats.aiCorrect}/${stats.aiResolved}` : undefined}
          hero
        />
      </div>

      {/* 보조 요약 카드 */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="현재 연속 정답"
          value={streakStr}
        />
        <StatCard
          label="연속 픽 참여"
          value={pickingDaysStr}
        />
        <StatCard
          label="총 픽"
          value={stats ? `${stats.total}경기` : '—'}
          sub={stats && stats.total !== stats.resolved ? `${stats.resolved}경기 확정` : undefined}
        />
      </div>

      {/* 최근 폼 도트 */}
      {stats && stats.recentDots.length >= 3 && (
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold">최근 {stats.recentDots.length}경기 폼</h2>
            {stats.trend !== 'flat' && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                stats.trend === 'up'
                  ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {stats.trend === 'up' ? '▲ 상승 중' : '▼ 하락 중'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5" role="list" aria-label="최근 픽 결과">
            {stats.recentDots.map((hit, i) => (
              <span
                key={i}
                role="listitem"
                aria-label={hit ? '적중' : '실패'}
                title={hit ? '적중' : '실패'}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold select-none ${
                  hit
                    ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}
              >
                {hit ? '●' : '×'}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">왼쪽이 이전, 오른쪽이 최신</p>
        </div>
      )}

      {/* 공유하기 */}
      {stats && <SharePicksButton stats={stats} weekly={weekly} />}

      {/* 리더보드 참가 / 내 순위 */}
      {!nickname ? (
        <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-800 dark:text-brand-200">전국 순위에 도전하세요!</p>
            <p className="text-xs text-brand-600 dark:text-brand-400">픽 5개 이상 완료하면 순위에 등장합니다</p>
          </div>
          <button
            onClick={() => setShowLeaderboardModal(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            참가하기
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium">{nickname}</p>
            {syncState === 'done' && syncCount > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400">{syncCount}개 픽 동기화 완료</p>
            )}
          </div>
          <Link href="/leaderboard" className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
            리더보드 보기 →
          </Link>
        </div>
      )}

      {showLeaderboardModal && (
        <LeaderboardJoinModal
          onJoin={handleLeaderboardJoin}
          onClose={() => setShowLeaderboardModal(false)}
          loading={syncState === 'syncing'}
        />
      )}

      {/* 픽 목록 */}
      <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
        <h2 className="text-sm font-semibold mb-3">픽 이력</h2>
        <div>
          {entries.map((entry) => (
            <PickRow key={entry.gameId} entry={entry} />
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        픽은 이 기기에만 저장됩니다 (로그인 불필요 · 30일 보관)
      </p>
    </div>
  );
}
