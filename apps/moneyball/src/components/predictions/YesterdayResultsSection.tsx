import Link from "next/link";
import { shortTeamName, type TeamCode } from "@moneyball/shared";

export interface YesterdayGame {
  id: number;
  game_date: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { code: string | null } | null;
  away_team: { code: string | null } | null;
  predictions: Array<{
    is_correct: boolean | null;
    winner: { code: string | null } | null;
  }>;
}

export function YesterdayResultsSection({ games }: { games: YesterdayGame[] }) {
  const withPred = games.filter((g) => g.predictions.length > 0);
  const correct = withPred.filter((g) => g.predictions[0]?.is_correct === true).length;
  const dateStr = games[0]?.game_date ?? '';
  const displayDate = dateStr ? dateStr.slice(5).replace('-', '/') : '';

  return (
    <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-2xl border border-gray-200 dark:border-[var(--color-border)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">어제 결과</h2>
          {displayDate && (
            <span className="text-sm text-gray-400 dark:text-gray-500">{displayDate}</span>
          )}
        </div>
        {withPred.length > 0 && (
          <span className="text-sm font-semibold text-brand-600 dark:text-brand-400 tabular-nums">
            {correct}/{withPred.length} 적중
          </span>
        )}
      </div>
      <div className="space-y-2">
        {games.map((g) => {
          const pred = g.predictions[0];
          const homeCode = g.home_team?.code as TeamCode | null;
          const awayCode = g.away_team?.code as TeamCode | null;
          const isCorrect = pred?.is_correct;
          const badge =
            isCorrect === true ? (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-brand-500/15 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300">
                적중
              </span>
            ) : isCorrect === false ? (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                빗나감
              </span>
            ) : null;

          return (
            <Link
              key={g.id}
              href={`/analysis/game/${g.id}`}
              className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-[var(--color-surface)] px-4 py-2.5 text-sm hover:bg-brand-50 dark:hover:bg-[var(--color-surface-card)] transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-600 dark:text-gray-300 truncate">
                  {awayCode ? (shortTeamName(awayCode) ?? awayCode) : '?'}
                </span>
                <span className="text-gray-400 dark:text-gray-500 text-xs font-mono tabular-nums shrink-0">
                  {g.away_score ?? '-'} : {g.home_score ?? '-'}
                </span>
                <span className="text-gray-800 dark:text-gray-100 font-medium truncate">
                  {homeCode ? (shortTeamName(homeCode) ?? homeCode) : '?'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {badge}
                <span className="text-gray-400 dark:text-gray-600 text-xs group-hover:text-brand-500 transition-colors">→</span>
              </div>
            </Link>
          );
        })}
      </div>
      {dateStr && (
        <div className="mt-3 text-right">
          <Link
            href={`/predictions/${dateStr}`}
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
          >
            상세 예측 보기 →
          </Link>
        </div>
      )}
    </section>
  );
}
