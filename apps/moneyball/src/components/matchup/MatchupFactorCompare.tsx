import type { TeamFactorAverages } from "@/lib/teams/buildTeamFactorAverages";

interface Props {
  teamA: { shortName: string };
  teamB: { shortName: string };
  factorA: TeamFactorAverages;
  factorB: TeamFactorAverages;
}

interface FactorRow {
  key: keyof Pick<
    TeamFactorAverages,
    "spFip" | "lineupWoba" | "bullpenFip" | "recentForm" | "elo"
  >;
  label: string;
  /** "lower" = 낮을수록 우세, "higher" = 높을수록 우세 */
  direction: "lower" | "higher";
  format: (v: number) => string;
}

const FACTORS: FactorRow[] = [
  {
    key: "spFip",
    label: "선발 FIP",
    direction: "lower",
    format: (v) => v.toFixed(2),
  },
  {
    key: "lineupWoba",
    label: "타선 wOBA",
    direction: "higher",
    format: (v) => v.toFixed(3),
  },
  {
    key: "bullpenFip",
    label: "불펜 FIP",
    direction: "lower",
    format: (v) => v.toFixed(2),
  },
  {
    key: "recentForm",
    label: "최근 폼",
    direction: "higher",
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "elo",
    label: "Elo 레이팅",
    direction: "higher",
    format: (v) => v.toFixed(0),
  },
];

function compare(
  a: number | null,
  b: number | null,
  direction: "lower" | "higher",
): "a" | "b" | "tie" | "na" {
  if (a == null && b == null) return "na";
  if (a == null) return "b";
  if (b == null) return "a";
  if (a === b) return "tie";
  if (direction === "lower") return a < b ? "a" : "b";
  return a > b ? "a" : "b";
}

export function MatchupFactorCompare({ teamA, teamB, factorA, factorB }: Props) {
  if (factorA.sampleN === 0 && factorB.sampleN === 0) return null;

  return (
    <section
      aria-labelledby="matchup-factor-title"
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
    >
      <div className="flex items-baseline justify-between mb-4">
        <h2 id="matchup-factor-title" className="text-lg font-bold">
          시즌 평균 팩터 비교
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {teamA.shortName} {factorA.sampleN}경기 · {teamB.shortName}{" "}
          {factorB.sampleN}경기
        </span>
      </div>

      <div className="space-y-3">
        {FACTORS.map((f) => {
          const a = factorA[f.key];
          const b = factorB[f.key];
          const winner = compare(a, b, f.direction);
          const aWins = winner === "a";
          const bWins = winner === "b";
          const aClass = aWins
            ? "font-bold text-brand-600 dark:text-brand-400"
            : "text-gray-700 dark:text-gray-200";
          const bClass = bWins
            ? "font-bold text-brand-600 dark:text-brand-400"
            : "text-gray-700 dark:text-gray-200";

          return (
            <div
              key={f.key}
              className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm"
            >
              {/* 팀A 수치 — 우세 시 배경 강조 */}
              <div className={`text-right font-mono px-2 py-1 rounded-md transition-colors ${
                aWins ? "bg-brand-500/10 dark:bg-brand-500/20" : ""
              } ${aClass}`}>
                {a != null ? f.format(a) : "-"}
              </div>

              {/* 센터: 레이블 + 비교 바 */}
              <div className="flex flex-col items-center gap-1 min-w-[8rem]">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-none">
                  {f.label}
                </span>
                {/* 비교 바 — 승자 쪽 절반이 brand 색으로 채워짐 */}
                <div className="relative w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  {aWins && (
                    <div className="absolute inset-y-0 left-0 right-[50%] bg-brand-500/50 dark:bg-brand-400/60 rounded-l-full" />
                  )}
                  {bWins && (
                    <div className="absolute inset-y-0 left-[50%] right-0 bg-brand-500/50 dark:bg-brand-400/60 rounded-r-full" />
                  )}
                  {/* 중앙 구분선 */}
                  <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 dark:bg-gray-500 -translate-x-px" />
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">
                  {f.direction === "lower" ? "낮을수록 우세" : "높을수록 우세"}
                </span>
              </div>

              {/* 팀B 수치 — 우세 시 배경 강조 */}
              <div className={`text-left font-mono px-2 py-1 rounded-md transition-colors ${
                bWins ? "bg-brand-500/10 dark:bg-brand-500/20" : ""
              } ${bClass}`}>
                {b != null ? f.format(b) : "-"}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
        예측 전 시점 시즌 평균 · 진한 색이 우세 팩터
      </p>
    </section>
  );
}
