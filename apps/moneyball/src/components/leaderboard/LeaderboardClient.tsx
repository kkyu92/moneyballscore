'use client';

import { useMemo, useState } from 'react';
import { LeaderboardTable } from './LeaderboardTable';
import { LeaderboardJoinModal } from './LeaderboardJoinModal';
import { LeaderboardSortControl } from './LeaderboardSortControl';
import { useLeaderboard } from '@/lib/leaderboard/use-leaderboard';
import type { AiBaseline, LeaderboardEntry } from '@/lib/leaderboard/types';

interface Props {
  entries: LeaderboardEntry[];
  aiBaseline: AiBaseline | null;
}

/**
 * cycle 1021 c10: 시즌별 분할 — 탭 자체는 page.tsx (Server Component) 의 URL
 * search param 기반 <Link>. 본 컴포넌트는 진입 / 동기화 / 내 순위 강조 + 정렬
 * 칩 + 모달 처리만 담당. 기존 weekly/season 토글 로직 (localStorage
 * useSyncExternalStore) 제거 — SEO 친화 + 'use client' 최소화.
 */
export function LeaderboardClient({ entries, aiBaseline }: Props) {
  const [showModal, setShowModal] = useState(false);
  const { deviceId, nickname, syncState, syncCount, join } = useLeaderboard();
  const isSyncing = syncState === 'syncing';

  const sortMeta = useMemo(() => {
    const streakSorted = [...entries].sort(
      (a, b) =>
        b.current_streak - a.current_streak ||
        b.accuracy_pct - a.accuracy_pct ||
        b.total - a.total,
    );
    const sampleSorted = [...entries].sort(
      (a, b) =>
        b.total - a.total ||
        b.accuracy_pct - a.accuracy_pct ||
        b.current_streak - a.current_streak,
    );
    const streakRankMap = new Map<string, number>();
    streakSorted.forEach((e, i) => streakRankMap.set(e.device_id, i));
    const sampleRankMap = new Map<string, number>();
    sampleSorted.forEach((e, i) => sampleRankMap.set(e.device_id, i));
    const streakCohort = entries.filter((e) => e.current_streak >= 2).length;
    return { streakRankMap, sampleRankMap, streakEnabled: streakCohort >= 2 };
  }, [entries]);

  const handleJoin = async (name: string) => {
    await join(name);
    setShowModal(false);
  };

  return (
    <div className="space-y-5">
      {/* 참가 CTA */}
      {!nickname ? (
        <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-800 dark:text-brand-200">전국 순위에 도전하세요!</p>
            <p className="text-xs text-brand-600 dark:text-brand-400">픽 5개 이상 완료하면 순위에 등장합니다</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
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
              <p className="text-xs text-brand-600 dark:text-brand-400">{syncCount}개 픽 동기화 완료</p>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200"
          >
            닉네임 변경
          </button>
        </div>
      )}

      {/* 정렬 칩 — 표본 가드: entries >= 5 */}
      {entries.length >= 5 && (
        <LeaderboardSortControl streakEnabled={sortMeta.streakEnabled} />
      )}

      {/* 리더보드 테이블 */}
      <LeaderboardTable
        entries={entries}
        myDeviceId={deviceId}
        aiBaseline={aiBaseline}
        streakRankMap={sortMeta.streakRankMap}
        sampleRankMap={sortMeta.sampleRankMap}
      />

      {/* 모달 */}
      {showModal && (
        <LeaderboardJoinModal
          onJoin={handleJoin}
          onClose={() => setShowModal(false)}
          loading={isSyncing}
        />
      )}
    </div>
  );
}
