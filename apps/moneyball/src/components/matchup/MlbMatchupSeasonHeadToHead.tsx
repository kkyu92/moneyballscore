import type { MlbSeasonHeadToHead } from "@/lib/mlb/buildMlbSeasonHeadToHead";
import type { MlbTeamCode } from "@moneyball/shared";
import { computeWinRatePct } from "@/lib/analysis/convergenceRecord";

interface Strings {
  title: string;
  footer: (a: string, b: string) => string;
}

const STRINGS: Record<"ko" | "en", Strings> = {
  ko: {
    title: "시즌별 상대전적",
    footer: (a, b) => `${a} 승 — ${b} 승 순서 (경기 결과 확정 경기만 집계)`,
  },
  en: {
    title: "Season Head-to-Head",
    footer: (a, b) => `${a} wins — ${b} wins order (completed games only)`,
  },
};

// KBO MatchupSeasonHeadToHead.tsx 의 MLB 대응 (plan #24 Phase 3). buildMlbSeasonHeadToHead
// 자체는 리그 무관 순수 함수이나 UI 문자열은 KO+EN 양쪽 라우트 필요해 locale prop 신규 작성
// (MlbMatchupRecentForm.tsx 와 동일 패턴).
export function MlbMatchupSeasonHeadToHead({
  titleId,
  teamA,
  teamB,
  seasons,
  locale = "ko",
}: {
  titleId: string;
  teamA: { code: MlbTeamCode; shortName: string; color: string };
  teamB: { code: MlbTeamCode; shortName: string; color: string };
  seasons: MlbSeasonHeadToHead[];
  locale?: "ko" | "en";
}) {
  if (seasons.length === 0) return null;
  const s = STRINGS[locale];

  return (
    <section
      aria-labelledby={titleId}
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
    >
      <h2 id={titleId} className="text-lg font-bold mb-3">
        {s.title}
      </h2>
      <div className="space-y-1.5">
        {seasons.map((season) => (
          <div key={season.year} className="flex items-center gap-3 text-sm">
            <span className="font-mono text-gray-500 dark:text-gray-400 w-14 shrink-0">
              {season.year}
            </span>
            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex">
              <div
                style={{
                  width: `${computeWinRatePct(season.aWins, season.played)}%`,
                  backgroundColor: teamA.color,
                }}
              />
              <div
                style={{
                  width: `${computeWinRatePct(season.bWins, season.played)}%`,
                  backgroundColor: teamB.color,
                }}
              />
            </div>
            <span className="font-mono tabular-nums text-gray-700 dark:text-gray-200 whitespace-nowrap">
              {season.aWins}-{season.bWins}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        {s.footer(teamA.shortName, teamB.shortName)}
      </p>
    </section>
  );
}
