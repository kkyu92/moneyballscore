import type { AiBaseline, LeaderboardEntry } from '@/lib/leaderboard/types';

interface Props {
  entries: LeaderboardEntry[];
  myDeviceId?: string;
  aiBaseline?: AiBaseline | null;
}

function formatDelta(diff: number): string {
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}%p`;
}

function deltaClass(diff: number): string {
  if (diff > 0) return 'text-brand-600 dark:text-brand-400';
  if (diff < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-400 dark:text-gray-500';
}

export function LeaderboardTable({ entries, myDeviceId, aiBaseline }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        <p className="text-2xl mb-2">🏆</p>
        <p>아직 순위가 없습니다.</p>
        <p className="text-xs mt-1">픽 5개 이상 완료 후 순위에 등장합니다.</p>
      </div>
    );
  }

  const myEntry = myDeviceId ? entries.find((e) => e.device_id === myDeviceId) : null;
  const myRank = myDeviceId ? entries.findIndex((e) => e.device_id === myDeviceId) + 1 : 0;
  const aiPct = aiBaseline?.pct ?? null;
  const myDelta = myEntry && aiPct !== null ? myEntry.accuracy_pct - aiPct : null;

  return (
    <div className="space-y-2">
      {/* AI 베이스라인 */}
      {aiBaseline && (
        <div className="flex items-center justify-between text-xs px-4 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 rounded-lg">
          <span className="text-gray-500 dark:text-gray-400">
            AI 적중률 <span className="text-gray-400 dark:text-gray-500">(n={aiBaseline.total})</span>
          </span>
          <span className="font-semibold tabular-nums text-gray-700 dark:text-gray-200">
            {aiBaseline.pct}%
          </span>
        </div>
      )}

      {/* 내 순위 고정 배너 */}
      {myEntry && myRank > 0 && (
        <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl px-4 py-3 flex items-center justify-between text-sm font-medium">
          <span className="text-brand-700 dark:text-brand-300">
            내 순위: <span className="font-bold">{myRank}등</span>
            {myEntry.current_streak >= 2 && (
              <span className="ml-2 text-accent dark:text-accent-light">
                🔥 {myEntry.current_streak}연속
              </span>
            )}
            {myDelta !== null && (
              <span className={`ml-2 text-xs font-semibold ${deltaClass(myDelta)}`}>
                AI 대비 {formatDelta(myDelta)}
              </span>
            )}
          </span>
          <span className="tabular-nums text-brand-600 dark:text-brand-400">
            {myEntry.accuracy_pct}% ({myEntry.correct}/{myEntry.total})
          </span>
        </div>
      )}

      {/* 순위표 */}
      <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] overflow-hidden">
        <div className="grid grid-cols-[2.5rem_1fr_3.5rem_5rem_4rem] text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800 px-4 py-2">
          <span>#</span>
          <span>닉네임</span>
          <span className="text-right">연속</span>
          <span className="text-right">적중률</span>
          <span className="text-right">픽 수</span>
        </div>
        {entries.map((entry, i) => {
          const isMe = myDeviceId && entry.device_id === myDeviceId;
          const rank = i + 1;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
          const delta = aiPct !== null ? entry.accuracy_pct - aiPct : null;

          return (
            <div
              key={entry.device_id + i}
              className={`grid grid-cols-[2.5rem_1fr_3.5rem_5rem_4rem] px-4 py-2.5 text-sm items-center border-b last:border-b-0 border-gray-50 dark:border-gray-800 ${
                isMe
                  ? 'bg-brand-50 dark:bg-brand-900/10'
                  : rank <= 3
                  ? 'bg-accent/5 hover:bg-accent/10'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <span className="tabular-nums text-gray-400 font-medium">
                {medal ?? rank}
              </span>
              <span className={`truncate font-medium ${isMe ? 'text-brand-700 dark:text-brand-300' : ''}`}>
                {entry.nickname}
                {isMe && <span className="ml-1 text-xs text-brand-400">(나)</span>}
              </span>
              <span className="text-right tabular-nums text-xs">
                {entry.current_streak >= 2 ? (
                  <span className="text-accent dark:text-accent-light font-semibold">
                    🔥{entry.current_streak}
                  </span>
                ) : (
                  <span className="text-gray-300 dark:text-gray-600">–</span>
                )}
              </span>
              <span className="text-right tabular-nums">
                <span className="font-bold">{entry.accuracy_pct}%</span>
                {delta !== null && (
                  <span className={`block text-[10px] leading-none mt-0.5 ${deltaClass(delta)}`}>
                    {formatDelta(delta)}
                  </span>
                )}
              </span>
              <span className="text-right tabular-nums text-gray-500">
                {entry.correct}/{entry.total}
              </span>
            </div>
          );
        })}
      </div>

      {entries.length >= 50 && (
        <p className="text-xs text-center text-gray-400">상위 50명만 표시됩니다</p>
      )}
    </div>
  );
}
