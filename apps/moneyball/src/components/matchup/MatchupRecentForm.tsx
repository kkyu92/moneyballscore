import type {
  GameResult,
  TeamRecentForm,
} from "@/lib/teams/buildTeamRecentForm";

interface Props {
  teamA: { shortName: string };
  teamB: { shortName: string };
  formA: TeamRecentForm;
  formB: TeamRecentForm;
}

const RESULT_CLASS: Record<GameResult, string> = {
  W: "bg-brand-500 text-white",
  L: "bg-red-500 text-white",
  T: "bg-gray-400 text-white",
};

function ResultBoxes({ results }: { results: GameResult[] }) {
  if (results.length === 0) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">기록 없음</span>
    );
  }
  return (
    <div className="flex gap-1">
      {results.map((r, i) => (
        <span
          key={i}
          className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${RESULT_CLASS[r]}`}
          aria-label={r === "W" ? "승" : r === "L" ? "패" : "무"}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function formatWinRate(rate: number | null): string {
  if (rate == null) return "-";
  return `${Math.round(rate * 100)}%`;
}

function summary(form: TeamRecentForm): string {
  const parts = [`${form.wins}승`, `${form.losses}패`];
  if (form.ties > 0) parts.push(`${form.ties}무`);
  return parts.join(" ");
}

export function MatchupRecentForm({ teamA, teamB, formA, formB }: Props) {
  if (formA.totalGames === 0 && formB.totalGames === 0) return null;

  return (
    <section
      aria-labelledby="matchup-form-title"
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
    >
      <div className="flex items-baseline justify-between mb-4">
        <h2 id="matchup-form-title" className="text-lg font-bold">
          최근 폼
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          최근 {Math.max(formA.totalGames, formB.totalGames)}경기 · 최신순
        </span>
      </div>

      <div className="space-y-4">
        {[
          { name: teamA.shortName, form: formA },
          { name: teamB.shortName, form: formB },
        ].map(({ name, form }) => (
          <div
            key={name}
            className="flex items-center justify-between gap-3 flex-wrap"
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold text-sm w-12">{name}</span>
              <ResultBoxes results={form.results} />
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300 font-mono">
              {summary(form)}{" "}
              <span className="text-gray-400 dark:text-gray-500 ml-1">
                승률 {formatWinRate(form.winRate)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
        매치업 외 모든 경기 포함 · 무승부는 승률 계산 제외
      </p>
    </section>
  );
}
