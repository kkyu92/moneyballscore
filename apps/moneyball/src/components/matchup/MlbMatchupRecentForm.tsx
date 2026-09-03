import type {
  GameResult,
  TeamRecentForm,
} from "@/lib/teams/buildTeamRecentForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { computeWinProbPct } from "@/lib/analysis/convergenceRecord";

interface Props {
  teamA: { shortName: string };
  teamB: { shortName: string };
  formA: TeamRecentForm;
  formB: TeamRecentForm;
  locale?: "ko" | "en";
}

interface Strings {
  title: string;
  gamesLabel: (n: number) => string;
  noRecord: string;
  win: string;
  loss: string;
  tie: string;
  winRateLabel: string;
  footer: string;
}

const STRINGS: Record<"ko" | "en", Strings> = {
  ko: {
    title: "최근 폼",
    gamesLabel: (n) => `최근 ${n}경기 · 최신순`,
    noRecord: "기록 없음",
    win: "승",
    loss: "패",
    tie: "무",
    winRateLabel: "승률",
    footer: "매치업 외 모든 경기 포함 · 무승부는 승률 계산 제외",
  },
  en: {
    title: "Recent Form",
    gamesLabel: (n) => `Last ${n} games · most recent first`,
    noRecord: "No record",
    win: "W",
    loss: "L",
    tie: "T",
    winRateLabel: "Win rate",
    footer: "Includes all games, not just this matchup · ties excluded from win rate",
  },
};

const RESULT_CLASS: Record<GameResult, string> = {
  W: "bg-brand-500 text-white",
  L: "bg-red-500 dark:bg-red-600 text-white",
  T: "bg-gray-400 dark:bg-gray-600 text-white",
};

// plan #24 Phase 3 — KBO MatchupRecentForm.tsx 의 MLB 대응. buildTeamRecentForm
// 자체가 리그 무관(teams/games 테이블 team code 문자열 조회만) 이라 신규 빌더 없이
// 타입만 넓혀 그대로 재사용, UI 는 locale prop 필요(MLB 는 KO+EN 양쪽 라우트)해 신규 작성.
function ResultBoxes({ results, s }: { results: GameResult[]; s: Strings }) {
  if (results.length === 0) {
    return <EmptyState size="inline" title={s.noRecord} />;
  }
  return (
    <div className="flex gap-1">
      {results.map((r, i) => (
        <span
          key={i}
          className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${RESULT_CLASS[r]}`}
          aria-label={r === "W" ? s.win : r === "L" ? s.loss : s.tie}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function formatWinRate(rate: number | null): string {
  if (rate == null) return "-";
  return `${computeWinProbPct(rate)}%`;
}

function summary(form: TeamRecentForm, s: Strings): string {
  const parts = [`${form.wins}${s.win}`, `${form.losses}${s.loss}`];
  if (form.ties > 0) parts.push(`${form.ties}${s.tie}`);
  return parts.join(" ");
}

export function MlbMatchupRecentForm({
  teamA,
  teamB,
  formA,
  formB,
  locale = "ko",
}: Props) {
  if (formA.totalGames === 0 && formB.totalGames === 0) return null;

  const s = STRINGS[locale];

  return (
    <section
      aria-labelledby="mlb-matchup-form-title"
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
    >
      <div className="flex items-baseline justify-between mb-4">
        <h2 id="mlb-matchup-form-title" className="text-lg font-bold">
          {s.title}
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {s.gamesLabel(Math.max(formA.totalGames, formB.totalGames))}
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
              <span className="font-semibold text-sm w-20 shrink-0">{name}</span>
              <ResultBoxes results={form.results} s={s} />
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300 font-mono">
              {summary(form, s)}{" "}
              <span className="text-gray-400 dark:text-gray-500 ml-1">
                {s.winRateLabel} {formatWinRate(form.winRate)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
        {s.footer}
      </p>
    </section>
  );
}
