'use client';

import { useEffect, useState } from 'react';
import { useUserPicks } from '@/hooks/use-user-picks';
import { buildPickEntries, buildPicksStats, type PickEntry, type PicksStats } from '@/lib/picks/buildPicksStats';
import type { PickGameResult } from '@/app/api/picks/results/route';
import Link from 'next/link';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 text-center">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">{sub}</p>}
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
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-[var(--color-border)] last:border-0">
      <span className="text-xs text-gray-400 dark:text-gray-500 w-10 shrink-0 tabular-nums">{dateStr}</span>
      <span className="flex-1 text-sm truncate">
        {entry.awayTeamName ?? '?'} @ {entry.homeTeamName ?? '?'}
      </span>
      <span className="text-xs text-gray-600 dark:text-gray-300 shrink-0">
        내 픽: <span className="font-medium">{myLabel ?? entry.myPick}</span>
      </span>
      {aiLabel && (
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 hidden sm:inline">
          AI: {aiLabel}
        </span>
      )}
      <span className="w-20 text-right shrink-0">{resultEl}</span>
    </div>
  );
}

export function MyPicksClient() {
  const { picks } = useUserPicks();
  const [entries, setEntries] = useState<PickEntry[]>([]);
  const [stats, setStats] = useState<PicksStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = Object.keys(picks);
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/picks/results?ids=${ids.join(',')}`)
      .then((r) => r.json())
      .then((results: PickGameResult[]) => {
        const e = buildPickEntries(picks, results);
        setEntries(e);
        setStats(buildPicksStats(e));
      })
      .catch(() => {
        // fail silently — show picks without results
        const e = buildPickEntries(picks, []);
        setEntries(e);
        setStats(buildPicksStats(e));
      })
      .finally(() => setLoading(false));
  }, [picks]);

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">불러오는 중...</div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
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

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="내 적중률"
          value={myRateStr}
          sub={stats ? `${stats.myCorrect}/${stats.resolved}` : undefined}
        />
        <StatCard
          label="AI 적중률"
          value={aiRateStr}
          sub={stats ? `${stats.aiCorrect}/${stats.aiResolved}` : undefined}
        />
        <StatCard
          label="현재 연속 정답"
          value={stats ? `${stats.currentStreak}경기` : '—'}
        />
        <StatCard
          label="총 픽"
          value={stats ? `${stats.total}경기` : '—'}
          sub={stats && stats.total !== stats.resolved ? `${stats.resolved}경기 결과 확정` : undefined}
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
