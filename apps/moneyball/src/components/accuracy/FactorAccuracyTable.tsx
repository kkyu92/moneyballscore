import type { FactorAccuracyRow } from '@/lib/accuracy/buildFactorAccuracy';

function AccuracyBar({ accuracy, baseline }: { accuracy: number; baseline: number }) {
  const pct = Math.round(accuracy * 100);
  const basePct = Math.round(baseline * 100);
  const good = accuracy >= baseline;
  const fillCls = good
    ? 'bg-brand-500 dark:bg-brand-400'
    : 'bg-amber-500 dark:bg-amber-400';

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="relative flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${fillCls}`}
          style={{ width: `${Math.min(100, (accuracy / 1) * 100)}%` }}
        />
        {/* baseline marker */}
        <div
          className="absolute top-0 h-full w-px bg-gray-400 dark:bg-gray-500 opacity-60"
          style={{ left: `${basePct}%` }}
        />
      </div>
      <span
        className={`text-xs font-mono font-semibold tabular-nums w-9 text-right ${
          good ? 'text-brand-600 dark:text-brand-400' : 'text-amber-700 dark:text-amber-300'
        }`}
      >
        {pct}%
      </span>
    </div>
  );
}

export function FactorAccuracyTable({ rows, overallN, overallAcc }: { rows: FactorAccuracyRow[]; overallN: number; overallAcc: number }) {
  if (rows.length === 0) return null;
  const baselinePct = Math.round(overallAcc * 100);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        팩터 값이 0.45~0.55 중립 범위 밖인 경기만 집계.
        기준선({baselinePct}%) 초과 팩터 =
        <span className="text-brand-600 dark:text-brand-400"> 모델 기여</span> /
        미달 =
        <span className="text-amber-600 dark:text-amber-400"> 잡음 가능성</span>.
        전체 n={overallN}건 중 팩터별 비중립 게임 수 표시.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500 dark:text-gray-400 w-4 tabular-nums">#</th>
              <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500 dark:text-gray-400">팩터</th>
              <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">n (홈/원정)</th>
              <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400">적중률</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.key}
                className="border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
              >
                <td className="py-2.5 pr-3 text-xs text-gray-400 dark:text-gray-600 tabular-nums">{i + 1}</td>
                <td className="py-2.5 pr-3">
                  <span className="font-medium">{r.label}</span>
                  <span className="ml-1.5 text-[10px] text-gray-400 dark:text-gray-600 font-mono">
                    {r.key}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right font-mono text-xs tabular-nums text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {r.n} <span className="text-gray-300 dark:text-gray-600">({r.homeN}/{r.awayN})</span>
                </td>
                <td className="py-2.5">
                  <AccuracyBar accuracy={r.accuracy} baseline={overallAcc} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-600">
        ∣ 기준선 = 전체 적중률 {baselinePct}% (v1.8 cohort n={overallN}) ∣ 홈/원정 = 해당 팩터가 홈/원정팀 유리로 분류된 게임 수
      </p>
    </div>
  );
}
