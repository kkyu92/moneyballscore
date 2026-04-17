export interface FactorErrorRow {
  factor: string;
  error_count: number;
  avg_bias: number;
}

interface FactorErrorTableProps {
  rows: FactorErrorRow[];
}

// judge-agent postview가 축약 키로 factorErrors를 저장함(예: "sfr", "recent_form").
// 미매핑 키는 원문 그대로 노출.
const FACTOR_LABELS: Record<string, string> = {
  sp_fip: "선발 FIP",
  sp_xfip: "선발 xFIP",
  lineup_woba: "타선 wOBA",
  bullpen_fip: "불펜 FIP",
  war: "WAR",
  recent_form: "최근폼",
  elo: "Elo 레이팅",
  sfr: "수비 SFR",
  head_to_head: "상대 전적",
  park_factor: "구장 보정",
};

export function FactorErrorTable({ rows }: FactorErrorTableProps) {
  if (rows.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-center">
        <span className="text-4xl mb-3">🧮</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          사후 분석 경기가 쌓이면 가장 자주 틀린 팩터가 표시됩니다.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">경기 종료 후 자동 집계</p>
      </div>
    );
  }

  const maxAbsBias = Math.max(...rows.map((r) => Math.abs(r.avg_bias)), 0.05);

  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const label = FACTOR_LABELS[row.factor] ?? row.factor;
        const isHomeFavor = row.avg_bias > 0;
        const widthPct = Math.min(100, (Math.abs(row.avg_bias) / maxAbsBias) * 100);
        const biasLabel = row.avg_bias >= 0 ? `+${row.avg_bias.toFixed(2)}` : row.avg_bias.toFixed(2);
        const colorClass = isHomeFavor
          ? "bg-[var(--color-factor-favor)]"
          : "bg-[var(--color-factor-against)]";
        const textClass = isHomeFavor
          ? "text-[var(--color-factor-favor)]"
          : "text-[var(--color-factor-against)]";

        return (
          <li key={row.factor} className="text-sm">
            <div className="flex justify-between items-baseline mb-1 gap-4">
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {label}
                <span className="ml-2 font-mono text-xs text-gray-400 dark:text-gray-500">
                  {row.factor}
                </span>
              </span>
              <div className="flex items-baseline gap-3 shrink-0">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {row.error_count}회
                </span>
                <span className={`font-mono text-xs ${textClass}`}>{biasLabel}</span>
              </div>
            </div>
            <div
              className="bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden"
              role="img"
              aria-label={`${label} 평균 편향 ${biasLabel}, ${
                isHomeFavor ? "홈팀 유리" : "원정팀 유리"
              }, ${row.error_count}회 오답`}
            >
              <div
                className={`h-full rounded-full transition-all ${colorClass}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
