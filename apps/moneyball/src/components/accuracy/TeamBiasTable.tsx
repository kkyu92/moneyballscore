import { shortTeamName, TEAM_BIAS_OVERFIT, TEAM_BIAS_HIGHLIGHT, TEAM_BIAS_NEUTRAL, SMALL_SAMPLE_N } from "@moneyball/shared";

interface BiasLike {
  teamCode: string;
  predictedWinRate: number | null;
  actualWinPct: number | null;
  biasGap: number | null;
  accuracyRate: number | null;
}

const COPY = {
  ko: {
    standingsWarning: "현재 실시간 순위 데이터를 가져올 수 없어 실제 승률 비교가 제한됩니다.",
    team: "팀",
    predicted: "예측 승률",
    actual: "실제 승률",
    gap: "편향 갭",
    accuracy: "적중률",
    overfit: "과잉예측",
    underfit: "과소예측",
    footnote: (sourceLabel: string) =>
      `편향 갭 = 예측 승률 − 실제 승률. +는 과잉예측(더 자주 이긴다고 예측), −는 과소예측. n≥${SMALL_SAMPLE_N} 팀만 표시. 실제 승률 = ${sourceLabel}.`,
  },
  en: {
    standingsWarning: "Live standings data is unavailable right now, which limits the actual win rate comparison.",
    team: "Team",
    predicted: "Predicted Win%",
    actual: "Actual Win%",
    gap: "Bias Gap",
    accuracy: "Accuracy",
    overfit: "Over-predicted",
    underfit: "Under-predicted",
    footnote: (sourceLabel: string) =>
      `Bias gap = predicted win rate − actual win rate. + means the model over-predicts wins, − means it under-predicts. Teams with n≥${SMALL_SAMPLE_N} only. Actual win rate is based on ${sourceLabel}.`,
  },
};

function biasLabel(gap: number | null, copy: typeof COPY.ko): { text: string; cls: string } | null {
  if (gap == null) return null;
  if (gap > TEAM_BIAS_OVERFIT) return { text: copy.overfit, cls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" };
  if (gap < -TEAM_BIAS_OVERFIT) return { text: copy.underfit, cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" };
  return null;
}

function gapColor(gap: number | null): string {
  if (gap == null) return "";
  if (gap > TEAM_BIAS_HIGHLIGHT) return "text-red-600 dark:text-red-400 font-semibold";
  if (gap < -TEAM_BIAS_HIGHLIGHT) return "text-blue-600 dark:text-blue-400 font-semibold";
  if (Math.abs(gap) <= TEAM_BIAS_NEUTRAL) return "text-brand-600 dark:text-brand-400 font-semibold";
  return "";
}

export function TeamBiasTable({
  rows,
  standingsAvailable,
  shortName = shortTeamName,
  locale = "ko",
  winPctSourceLabel,
}: {
  rows: BiasLike[];
  standingsAvailable: boolean;
  shortName?: (code: string) => string;
  locale?: "ko" | "en";
  winPctSourceLabel?: string;
}) {
  if (rows.length === 0) return null;

  const copy = COPY[locale];
  const sourceLabel = winPctSourceLabel ?? (locale === "en" ? "completed games" : "현재 시즌 KBO 순위 기준");

  return (
    <div className="space-y-2">
      {!standingsAvailable && (
        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
          {copy.standingsWarning}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[var(--color-border)]">
              <th className="py-2 pr-3 font-medium">{copy.team}</th>
              <th className="py-2 pr-3 font-medium text-right">{copy.predicted}</th>
              <th className="py-2 pr-3 font-medium text-right">{copy.actual}</th>
              <th className="py-2 pr-3 font-medium text-right">{copy.gap}</th>
              <th className="py-2 font-medium text-right">{copy.accuracy}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const label = biasLabel(r.biasGap, copy);
              return (
                <tr
                  key={r.teamCode}
                  className="border-b border-gray-200 dark:border-[var(--color-border)]"
                >
                  <td className="py-2 pr-3 font-medium">
                    {shortName(r.teamCode)}
                    {label && (
                      <span className={`ml-1.5 text-2xs rounded px-1 py-0.5 ${label.cls}`}>
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
        {copy.footnote(sourceLabel)}
      </p>
    </div>
  );
}
