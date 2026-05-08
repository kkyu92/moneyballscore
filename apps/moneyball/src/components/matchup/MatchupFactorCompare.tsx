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
  description: string;
  /** "lower" = 낮을수록 우세, "higher" = 높을수록 우세 */
  direction: "lower" | "higher";
  format: (v: number) => string;
}

const FACTORS: FactorRow[] = [
  {
    key: "spFip",
    label: "선발 FIP",
    description: "선발 투수 평균 — 낮을수록 우세",
    direction: "lower",
    format: (v) => v.toFixed(2),
  },
  {
    key: "lineupWoba",
    label: "타선 wOBA",
    description: "타선 평균 — 높을수록 우세",
    direction: "higher",
    format: (v) => v.toFixed(3),
  },
  {
    key: "bullpenFip",
    label: "불펜 FIP",
    description: "불펜 평균 — 낮을수록 우세",
    direction: "lower",
    format: (v) => v.toFixed(2),
  },
  {
    key: "recentForm",
    label: "최근 폼",
    description: "최근 10경기 승률 — 높을수록 우세",
    direction: "higher",
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "elo",
    label: "Elo 레이팅",
    description: "전력 평가 — 높을수록 우세",
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
          const aClass =
            winner === "a"
              ? "font-bold text-brand-600 dark:text-brand-400"
              : "text-gray-700 dark:text-gray-200";
          const bClass =
            winner === "b"
              ? "font-bold text-brand-600 dark:text-brand-400"
              : "text-gray-700 dark:text-gray-200";

          return (
            <div
              key={f.key}
              className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center text-sm"
            >
              <div className={`text-right font-mono ${aClass}`}>
                {a != null ? f.format(a) : "-"}
              </div>
              <div className="min-w-[7rem] text-center">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {f.label}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {f.direction === "lower" ? "낮을수록 우세" : "높을수록 우세"}
                </div>
              </div>
              <div className={`text-left font-mono ${bClass}`}>
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
