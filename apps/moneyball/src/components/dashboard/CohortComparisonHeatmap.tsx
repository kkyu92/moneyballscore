import { ACCURACY_GOOD_RATE } from "@moneyball/shared";
import type { ScoringRuleWeekCell } from "@/lib/accuracy/buildAccuracyData";
import { SCORING_RULE_HEATMAP_ROWS } from "@/lib/accuracy/buildAccuracyData";

interface CohortComparisonHeatmapProps {
  data: ScoringRuleWeekCell[];
}

// silent drift family wave 257 (cycle 1563) — 하드코딩 era 리스트 → SCORING_RULE_HEATMAP_ROWS
// derive. 'all' aggregate 만 특수 라벨 ("전체"), 나머지는 identity. 신규 prod era 추가 시
// PRODUCTION_ERA_HISTORY 한 곳만 갱신 → ROW_LABEL 자동 반영.
const ROW_LABEL: Record<string, string> = Object.fromEntries(
  SCORING_RULE_HEATMAP_ROWS.map((sr) => [sr, sr === "all" ? "전체" : sr]),
);

/**
 * scoring_rule × 주차 (최근 4주) cohort heatmap.
 * DESIGN.md brand color scale (brand-100 low / brand-700 high). ScoringRuleDayHeatmap (요일 축)
 * 자매 view — 시간 축 cohort 비교.
 */
function cellBgClass(acc: number | null): string {
  if (acc === null)
    return "bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400";
  if (acc >= 0.7) return "bg-brand-700 text-white";
  if (acc >= ACCURACY_GOOD_RATE) return "bg-brand-500 text-white";
  if (acc >= 0.5)
    return "bg-brand-300 text-neutral-900 dark:bg-brand-400 dark:text-neutral-900";
  return "bg-brand-100 text-neutral-700 dark:bg-brand-50 dark:text-neutral-800";
}

export function CohortComparisonHeatmap({ data }: CohortComparisonHeatmapProps) {
  if (data.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center text-center">
        <span className="text-3xl mb-2">📊</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          scoring_rule × 주차 매트릭스 데이터 없음.
        </p>
      </div>
    );
  }

  const weekStarts = Array.from(new Set(data.map((c) => c.weekStart))).sort();
  const weekLabelMap = new Map<string, string>();
  for (const c of data) weekLabelMap.set(c.weekStart, c.weekLabel);

  const cellMap = new Map<string, ScoringRuleWeekCell>();
  for (const c of data) cellMap.set(`${c.scoringRule}__${c.weekStart}`, c);

  const activeRows = SCORING_RULE_HEATMAP_ROWS.filter((sr) =>
    weekStarts.some((wk) => {
      const cell = cellMap.get(`${sr}__${wk}`);
      return cell && cell.n > 0;
    }),
  );

  if (activeRows.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center text-center">
        <span className="text-3xl mb-2">📊</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          최근 주차에서 검증된 cohort 가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="cohort-comparison-heatmap" className="overflow-x-auto">
      <table className="min-w-full text-xs sm:text-sm border-collapse">
        <thead>
          <tr>
            <th className="px-2 py-2 text-left font-medium text-neutral-600 dark:text-neutral-300">
              scoring_rule
            </th>
            {weekStarts.map((wk) => (
              <th
                key={wk}
                className="px-2 py-2 text-center font-medium text-neutral-600 dark:text-neutral-300 min-w-[4rem]"
              >
                {weekLabelMap.get(wk) ?? wk}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeRows.map((sr) => (
            <tr key={sr}>
              <td className="px-2 py-2 font-mono text-xs text-neutral-700 dark:text-neutral-200 border-r border-neutral-300 dark:border-neutral-700">
                {ROW_LABEL[sr] ?? sr}
              </td>
              {weekStarts.map((wk) => {
                const cell = cellMap.get(`${sr}__${wk}`);
                if (!cell || cell.n === 0) {
                  return (
                    <td
                      key={wk}
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
                  cell.accuracy === null ? "소표본" : `${cell.hits}/${cell.n}`;
                return (
                  <td
                    key={wk}
                    className={`px-1 py-1 text-center align-middle ${cellBgClass(cell.accuracy)}`}
                    title={`${ROW_LABEL[sr] ?? sr} × ${weekLabelMap.get(wk) ?? wk}: ${cell.hits}/${cell.n}`}
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
        색상 — brand-700 ≥70% / brand-500 ≥60% / brand-300 ≥50% / brand-100 &lt;50% / 회색 N&lt;3 소표본.
        최근 4주 cohort 시계열 비교.
      </p>
    </div>
  );
}
