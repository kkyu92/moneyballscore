'use client';

import { useState } from 'react';
import { LeaderboardTable } from './LeaderboardTable';
import { LeaderboardJoinModal } from './LeaderboardJoinModal';
import { useLeaderboard } from '@/lib/leaderboard/use-leaderboard';
import type { LeaderboardEntry } from '@/lib/leaderboard/types';

interface Props {
  weeklyEntries: LeaderboardEntry[];
  seasonEntries: LeaderboardEntry[];
}

type Tab = 'weekly' | 'season';

export function LeaderboardClient({ weeklyEntries, seasonEntries }: Props) {
  const [tab, setTab] = useState<Tab>('weekly');
  const [showModal, setShowModal] = useState(false);
  const { deviceId, nickname, syncState, syncCount, join } = useLeaderboard();

  const entries = tab === 'weekly' ? weeklyEntries : seasonEntries;
  const isSyncing = syncState === 'syncing';

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
              <p className="text-xs text-green-600 dark:text-green-400">{syncCount}개 픽 동기화 완료</p>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            닉네임 변경
          </button>
        </div>
      )}

      {/* 탭 */}
      <div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['weekly', 'season'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === t
                  ? 'bg-white dark:bg-[var(--color-surface-card)] shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'weekly' ? '이번 주' : '시즌 전체'}
            </button>
          ))}
        </div>
        {tab === 'weekly' && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 px-1">
            매주 월요일 초기화 · 픽 5개 이상 완료 시 등장
          </p>
        )}
      </div>

      {/* 리더보드 테이블 */}
      <LeaderboardTable entries={entries} myDeviceId={deviceId} />

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
