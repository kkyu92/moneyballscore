import {
  computeWinRatePct,
  computeWinRateColorClass,
} from "@/lib/analysis/convergenceRecord";

type TeamStat = { wins: number; losses: number } | undefined;

interface Strings {
  title: string;
  description: string;
  strongLabel: string;
  completeLabel: string;
  strongTitle: (n: number) => string;
  completeTitle: (n: number) => string;
  winLoss: (wins: number, losses: number) => string;
}

const STRINGS: Record<"ko" | "en", Strings> = {
  ko: {
    title: "수렴 픽 성적",
    description: "이 팀이 모델의 강수렴 또는 완전수렴 픽으로 지목됐을 때의 실제 결과",
    strongLabel: "🏅 강수렴",
    completeLabel: "★ 완전수렴",
    strongTitle: (n) => `강수렴 픽 ${n}경기`,
    completeTitle: (n) => `완전수렴 픽 ${n}경기`,
    winLoss: (wins, losses) => `${wins}승 ${losses}패`,
  },
  en: {
    title: "Convergence Pick Record",
    description: "How this team performed when favored by the model's strong or complete factor convergence",
    strongLabel: "🏅 Strong",
    completeLabel: "★ Complete",
    strongTitle: (n) => `${n} strong-convergence picks`,
    completeTitle: (n) => `${n} complete-convergence picks`,
    winLoss: (wins, losses) => `${wins}W ${losses}L`,
  },
};

// TeamConvergencePickRecord(KBO, wave-607) 의 MLB 대응 (wave-625). /mlb/team/[code] 페이지에
// 강수렴/완전수렴 픽 성적이 없던 gap — matchup 페이지엔 이미 MlbMatchupConvergencePickRecord
// (두 팀 맞대결 한정) 가 있었으나 팀 프로필 단독 페이지엔 시즌 전체 집계가 빠져 있었음.
export function MlbTeamConvergencePickRecord({
  titleId,
  strongStat,
  completeStat,
  locale = "ko",
}: {
  titleId: string;
  strongStat: TeamStat;
  completeStat: TeamStat;
  locale?: "ko" | "en";
}) {
  if (!strongStat && !completeStat) return null;
  const s = STRINGS[locale];

  return (
    <section
      aria-labelledby={titleId}
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
    >
      <h2 id={titleId} className="text-lg font-bold mb-3">
        {s.title}
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{s.description}</p>
      <div className="flex flex-wrap items-center gap-2">
        {strongStat && (() => {
          const pct = computeWinRatePct(strongStat.wins, strongStat.wins + strongStat.losses);
          return (
            <span
              className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded bg-gray-100 dark:bg-gray-800/60"
              title={s.strongTitle(strongStat.wins + strongStat.losses)}
            >
              <span className="text-gray-500 dark:text-gray-400">{s.strongLabel}</span>
              <span className="font-mono font-semibold">{s.winLoss(strongStat.wins, strongStat.losses)}</span>
              <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>({pct}%)</span>
            </span>
          );
        })()}
        {completeStat && (() => {
          const pct = computeWinRatePct(completeStat.wins, completeStat.wins + completeStat.losses);
          return (
            <span
              className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-900/20"
              title={s.completeTitle(completeStat.wins + completeStat.losses)}
            >
              <span className="text-amber-700 dark:text-amber-300">{s.completeLabel}</span>
              <span className="font-mono font-semibold">{s.winLoss(completeStat.wins, completeStat.losses)}</span>
              <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>({pct}%)</span>
            </span>
          );
        })()}
      </div>
    </section>
  );
}
