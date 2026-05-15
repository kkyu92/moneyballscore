import { CURRENT_SCORING_RULE } from '@moneyball/shared';
import type { VersionHistoryRow } from '@/lib/accuracy/buildAccuracyData';

interface Props {
  versions: VersionHistoryRow[];
}

export function ModelVersionHistory({ versions }: Props) {
  const hasData = versions.some((v) => v.n > 0);
  if (!hasData) return null;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[var(--color-border)]">
              <th className="py-2 pr-3 font-medium">버전</th>
              <th className="py-2 pr-3 font-medium text-right">기간</th>
              <th className="py-2 pr-3 font-medium text-right">경기</th>
              <th className="py-2 pr-3 font-medium">적중률</th>
              <th className="py-2 font-medium hidden sm:table-cell">변경 내용</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => {
              const pct = v.accuracy !== null ? Math.round(v.accuracy * 100) : null;
              const ciPct = v.n > 0 && v.n < 30 ? Math.round(v.ci95Half * 100) : null;
              const isActive = v.version === CURRENT_SCORING_RULE;
              const barColor =
                pct === null || v.n === 0
                  ? 'bg-gray-200 dark:bg-gray-700'
                  : pct >= 55
                    ? 'bg-brand-500'
                    : pct >= 45
                      ? 'bg-gray-400 dark:bg-gray-500'
                      : 'bg-red-400';
              const textColor =
                pct === null || v.n === 0
                  ? 'text-gray-400 dark:text-gray-500'
                  : pct >= 55
                    ? 'text-brand-500 dark:text-brand-400'
                    : pct >= 45
                      ? 'text-gray-600 dark:text-gray-300'
                      : 'text-red-600 dark:text-red-400';

              return (
                <tr
                  key={v.version}
                  className={`border-b border-gray-200 dark:border-[var(--color-border)] ${
                    isActive ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''
                  }`}
                >
                  <td className="py-2.5 pr-3">
                    <span className="font-mono font-semibold">{v.label}</span>
                    {isActive && (
                      <span className="ml-1.5 text-[10px] bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded px-1 py-0.5">
                        진행 중
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-xs text-gray-500 dark:text-gray-400">
                    {v.dateRange || '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-xs text-gray-600 dark:text-gray-300">
                    {v.n}
                  </td>
                  <td className="py-2.5 pr-3">
                    {v.n === 0 ? (
                      <span className="text-gray-300 dark:text-gray-600 font-mono text-xs">수집 중</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className="relative w-16 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex-shrink-0"
                          aria-hidden
                        >
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }}
                          />
                          <div
                            className="absolute top-0 bottom-0 w-px bg-gray-400/60"
                            style={{ left: '50%' }}
                          />
                        </div>
                        <span className={`font-mono font-bold text-sm ${textColor}`}>
                          {pct !== null ? `${pct}%` : '—'}
                        </span>
                        {ciPct !== null && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">±{ciPct}%</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    {v.note}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        각 버전 표본이 작아 95% 신뢰구간이 넓습니다 (±14~21%p). 절대 수치보다 방향성 참고용입니다.
      </p>
    </div>
  );
}
