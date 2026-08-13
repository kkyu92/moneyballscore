import {
  computeWinRatePct,
  computeWinRateColorClass,
} from "@/lib/analysis/convergenceRecord";
import type { MlbTeamCode } from "@moneyball/shared";

type TeamStat = { teamCode: MlbTeamCode; wins: number; losses: number };

function findStat(stats: TeamStat[], code: MlbTeamCode): TeamStat | undefined {
  return stats.find((s) => s.teamCode === code);
}

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
    title: "수렴 픽 성적 (이 매치업 한정)",
    description: "이 두 팀이 맞붙었을 때 모델의 강수렴 또는 완전수렴 픽으로 지목된 팀의 실제 결과",
    strongLabel: "🏅 강수렴",
    completeLabel: "★ 완전수렴",
    strongTitle: (n) => `강수렴 픽 ${n}경기`,
    completeTitle: (n) => `완전수렴 픽 ${n}경기`,
    winLoss: (wins, losses) => `${wins}승 ${losses}패`,
  },
  en: {
    title: "Convergence Pick Record (this matchup)",
    description: "How teams favored by the model's strong or complete factor convergence performed in this matchup",
    strongLabel: "🏅 Strong",
    completeLabel: "★ Complete",
    strongTitle: (n) => `${n} strong-convergence picks`,
    completeTitle: (n) => `${n} complete-convergence picks`,
    winLoss: (wins, losses) => `${wins}W ${losses}L`,
  },
};

// MatchupConvergencePickRecord(KBO) 의 MLB 대응 (plan #24 Phase 3c, cycle 2070).
// MLB 는 유효 팩터가 6개뿐이라 임계는 MLB_FACTOR_PICK_STRONG/MLB_FACTOR_PICK_COMPLETE
// (getMlbConvergencePickHeadToHeadRecord 호출부에서 넘김) — 표시 로직 자체는 동일 패턴.
export function MlbMatchupConvergencePickRecord({
  titleId,
  teamA,
  teamB,
  strongStats,
  completeStats,
  locale = "ko",
}: {
  titleId: string;
  teamA: { code: MlbTeamCode; shortName: string };
  teamB: { code: MlbTeamCode; shortName: string };
  strongStats: TeamStat[];
  completeStats: TeamStat[];
  locale?: "ko" | "en";
}) {
  const s = STRINGS[locale];
  const rows = [
    { team: teamA, strong: findStat(strongStats, teamA.code), complete: findStat(completeStats, teamA.code) },
    { team: teamB, strong: findStat(strongStats, teamB.code), complete: findStat(completeStats, teamB.code) },
  ].filter((r) => r.strong || r.complete);

  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby={titleId}
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
    >
      <h2 id={titleId} className="text-lg font-bold mb-3">
        {s.title}
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{s.description}</p>
      <div className="space-y-2">
        {rows.map(({ team, strong, complete }) => (
          <div key={team.code} className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium w-20 shrink-0">{team.shortName}</span>
            {strong && (() => {
              const pct = computeWinRatePct(strong.wins, strong.wins + strong.losses);
              return (
                <span
                  className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded bg-gray-100 dark:bg-gray-800/60"
                  title={s.strongTitle(strong.wins + strong.losses)}
                >
                  <span className="text-gray-500 dark:text-gray-400">{s.strongLabel}</span>
                  <span className="font-mono font-semibold">{s.winLoss(strong.wins, strong.losses)}</span>
                  <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>({pct}%)</span>
                </span>
              );
            })()}
            {complete && (() => {
              const pct = computeWinRatePct(complete.wins, complete.wins + complete.losses);
              return (
                <span
                  className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-900/20"
                  title={s.completeTitle(complete.wins + complete.losses)}
                >
                  <span className="text-amber-700 dark:text-amber-300">{s.completeLabel}</span>
                  <span className="font-mono font-semibold">{s.winLoss(complete.wins, complete.losses)}</span>
                  <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>({pct}%)</span>
                </span>
              );
            })()}
          </div>
        ))}
      </div>
    </section>
  );
}
