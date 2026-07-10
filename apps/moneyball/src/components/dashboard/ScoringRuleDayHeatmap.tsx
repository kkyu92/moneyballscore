import { ACCURACY_BASELINE } from "@moneyball/shared";

import type { ScoringRuleDayCell } from "@/lib/accuracy/buildAccuracyData";
import { SCORING_RULE_HEATMAP_ROWS } from "@/lib/accuracy/buildAccuracyData";

interface ScoringRuleDayHeatmapProps {
  data: ScoringRuleDayCell[];
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 월~일
const DAY_LABELS_KO = ['월', '화', '수', '목', '금', '토', '일'];

// cell 배경 색상 — DESIGN.md brand/semantic 정합. BrierTrendChart 와 동일 패턴.
// >=60% brand / >=50% yellow / <50% red / null = neutral (소표본 N<3).
function cellBgClass(acc: number | null): string {
  if (acc === null) return "bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400";
  if (acc >= 0.6) return "bg-brand-500 text-white dark:bg-brand-600";
  if (acc >= ACCURACY_BASELINE) return "bg-yellow-400 text-neutral-900 dark:bg-yellow-500";
  return "bg-red-400 text-white dark:bg-red-500";
}

const ROW_LABEL: Record<string, string> = {
  all: "전체",
  "v1.5": "v1.5",
  "v1.6": "v1.6",
  "v1.7-revert": "v1.7-revert",
  "v1.8": "v1.8",
};

export function ScoringRuleDayHeatmap({ data }: ScoringRuleDayHeatmapProps) {
  if (data.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center text-center">
        <span className="text-3xl mb-2">📊</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          scoring_rule × 요일 매트릭스 데이터 없음.
        </p>
      </div>
    );
  }

  // (scoringRule, day) → cell lookup
  const cellMap = new Map<string, ScoringRuleDayCell>();
  for (const c of data) cellMap.set(`${c.scoringRule}__${c.day}`, c);

  return (
    <div
      data-testid="scoring-rule-day-heatmap"
      className="overflow-x-auto"
    >
      <table className="min-w-full text-xs sm:text-sm border-collapse">
        <thead>
          <tr>
            <th className="px-2 py-2 text-left font-medium text-neutral-600 dark:text-neutral-300">
              scoring_rule
            </th>
            {DAY_ORDER.map((day, i) => (
              <th
                key={day}
                className="px-2 py-2 text-center font-medium text-neutral-600 dark:text-neutral-300 min-w-[3rem]"
              >
                {DAY_LABELS_KO[i]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SCORING_RULE_HEATMAP_ROWS.map((sr) => (
            <tr key={sr}>
              <td className="px-2 py-2 font-mono text-xs text-neutral-700 dark:text-neutral-200 border-r border-neutral-300 dark:border-neutral-700">
                {ROW_LABEL[sr] ?? sr}
              </td>
              {DAY_ORDER.map((day) => {
                const cell = cellMap.get(`${sr}__${day}`);
                if (!cell) {
                  return (
                    <td
                      key={day}
                      className="px-1 py-1 text-center bg-neutral-100 dark:bg-neutral-900 text-neutral-400"
                    >
                      —
                    </td>
                  );
                }
                const label =
                  cell.accuracy === null
                    ? `N=${cell.n}`
                    : `${(cell.accuracy * 100).toFixed(0)}%`;
                const sub =
                  cell.accuracy === null
                    ? "소표본"
                    : `${cell.hits}/${cell.n}`;
                return (
                  <td
                    key={day}
                    className={`px-1 py-1 text-center align-middle ${cellBgClass(cell.accuracy)}`}
                    title={`${ROW_LABEL[sr] ?? sr} × ${DAY_LABELS_KO[DAY_ORDER.indexOf(day)]}: ${cell.hits}/${cell.n}`}
                  >
                    <div className="text-sm font-semibold">{label}</div>
                    <div className="text-[10px] opacity-80">{sub}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
        색상 — 녹색 ≥60% / 노랑 ≥50% / 빨강 &lt;50% / 회색 N&lt;3 소표본. v1.6 anomaly + Sunday cap 효과 시각화.
      </p>
    </div>
  );
}
