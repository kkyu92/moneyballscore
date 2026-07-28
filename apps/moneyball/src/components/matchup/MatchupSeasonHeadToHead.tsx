import type { SeasonHeadToHead } from "@/lib/matchup/buildSeasonHeadToHead";
import type { TeamCode } from "@moneyball/shared";

// wave-609: /matchup/[teamA]/[teamB] 시즌별 상대전적 요약 —
// 기존 "경기 기록"(전체 게임 리스트, 시즌 flat dump)에는 시즌 단위 승패 트렌드가 없었음.
// 팀쌍당 시즌 8~16경기라 홈/어웨이·요일별 split(cycle 2011 검토, min-picks 5 불가)은 부적합하지만
// 시즌 전체 집계는 표본 문제 없이 바로 계산 가능.
export function MatchupSeasonHeadToHead({
  titleId,
  teamA,
  teamB,
  seasons,
}: {
  titleId: string;
  teamA: { code: TeamCode; shortName: string; color: string };
  teamB: { code: TeamCode; shortName: string; color: string };
  seasons: SeasonHeadToHead[];
}) {
  if (seasons.length === 0) return null;

  return (
    <section
      aria-labelledby={titleId}
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
    >
      <h2 id={titleId} className="text-lg font-bold mb-3">
        시즌별 상대전적
      </h2>
      <div className="space-y-1.5">
        {seasons.map((s) => (
          <div key={s.year} className="flex items-center gap-3 text-sm">
            <span className="font-mono text-gray-500 dark:text-gray-400 w-14 shrink-0">
              {s.year}
            </span>
            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex">
              <div
                style={{
                  width: `${(s.aWins / s.played) * 100}%`,
                  backgroundColor: teamA.color,
                }}
              />
              <div
                style={{
                  width: `${(s.bWins / s.played) * 100}%`,
                  backgroundColor: teamB.color,
                }}
              />
            </div>
            <span className="font-mono tabular-nums text-gray-700 dark:text-gray-200 whitespace-nowrap">
              {s.aWins}승 {s.bWins}승
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        {teamA.shortName} 승 — {teamB.shortName} 승 순서 (경기 결과 확정 경기만 집계)
      </p>
    </section>
  );
}
