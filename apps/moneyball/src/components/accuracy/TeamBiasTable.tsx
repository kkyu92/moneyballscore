import { shortTeamName } from "@moneyball/shared";
import type { TeamBiasRow } from "@/lib/standings/buildTeamAccuracy";

function biasLabel(gap: number | null): { text: string; cls: string } | null {
  if (gap == null) return null;
  if (gap > 0.20) return { text: "과잉예측", cls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" };
  if (gap < -0.20) return { text: "과소예측", cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" };
  return null;
}

function gapColor(gap: number | null): string {
  if (gap == null) return "";
  if (gap > 0.15) return "text-red-600 dark:text-red-400 font-semibold";
  if (gap < -0.15) return "text-blue-600 dark:text-blue-400 font-semibold";
  if (Math.abs(gap) <= 0.05) return "text-green-600 dark:text-green-400 font-semibold";
  return "";
}

export function TeamBiasTable({
  rows,
  standingsAvailable,
}: {
  rows: TeamBiasRow[];
  standingsAvailable: boolean;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      {!standingsAvailable && (
        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
          현재 실시간 순위 데이터를 가져올 수 없어 실제 승률 비교가 제한됩니다.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[var(--color-border)]">
              <th className="py-2 pr-3 font-medium">팀</th>
              <th className="py-2 pr-3 font-medium text-right">예측 승률</th>
              <th className="py-2 pr-3 font-medium text-right">실제 승률</th>
              <th className="py-2 pr-3 font-medium text-right">편향 갭</th>
              <th className="py-2 font-medium text-right">적중률</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const label = biasLabel(r.biasGap);
              return (
                <tr
                  key={r.teamCode}
                  className="border-b border-gray-200 dark:border-[var(--color-border)]"
                >
                  <td className="py-2 pr-3 font-medium">
                    {shortTeamName(r.teamCode)}
                    {label && (
                      <span className={`ml-1.5 text-[10px] rounded px-1 py-0.5 ${label.cls}`}>
                        {label.text}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {r.predictedWinRate != null
                      ? `${(r.predictedWinRate * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-gray-500 dark:text-gray-400">
                    {r.actualWinPct != null
                      ? `${(r.actualWinPct * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className={`py-2 pr-3 text-right font-mono ${gapColor(r.biasGap)}`}>
                    {r.biasGap != null
                      ? `${r.biasGap >= 0 ? "+" : ""}${(r.biasGap * 100).toFixed(1)}%p`
                      : "—"}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {r.accuracyRate != null
                      ? `${(r.accuracyRate * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500">
        편향 갭 = 예측 승률 − 실제 승률. +는 과잉예측(더 자주 이긴다고 예측), −는 과소예측.
        n≥5 팀만 표시. 실제 승률 = 현재 시즌 KBO 순위 기준.
      </p>
    </div>
  );
}
