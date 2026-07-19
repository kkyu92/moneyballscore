import { MetricRegistry, type MetricSlug } from "@moneyball/kbo-data";
import { RECENT_FORM_GAMES } from "@moneyball/shared";
import type { TeamFactorAverages } from "@/lib/teams/buildTeamFactorAverages";
import { FACTOR_LABELS_SHORT } from "@/lib/predictions/factorLabels";

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
  /** MetricRegistry slug — label 단일 source */
  slug: MetricSlug;
  /** "lower" = 낮을수록 우세, "higher" = 높을수록 우세 */
  direction: "lower" | "higher";
  format: (v: number) => string;
  /** native title 툴팁 — 비전문가용 약어 풀이 + 의미 */
  hint: string;
  /** /glossary anchor slug */
  glossarySlug: string;
}

const FACTORS: FactorRow[] = [
  {
    key: "spFip",
    slug: "sp_fip",
    direction: "lower",
    format: (v) => v.toFixed(2),
    hint:
      "FIP — Fielding Independent Pitching. 선발투수가 직접 통제할 수 있는 결과(삼진·볼넷·홈런)만 본 평균자책점 지표. 낮을수록 우세.",
    glossarySlug: "fip",
  },
  {
    key: "lineupWoba",
    slug: "lineup_woba",
    direction: "higher",
    format: (v) => v.toFixed(3),
    hint:
      "wOBA — Weighted On-Base Average. 안타·볼넷·홈런 등 출루 결과별 가치를 가중치로 합산한 종합 타격 지표. 높을수록 우세.",
    glossarySlug: "woba",
  },
  {
    key: "bullpenFip",
    slug: "bullpen_fip",
    direction: "lower",
    format: (v) => v.toFixed(2),
    hint:
      "불펜 FIP — 중계/마무리 투수진의 종합 FIP. 선발 강판 후 경기 결과에 큰 영향. 낮을수록 우세.",
    glossarySlug: "bullpen-fip",
  },
  {
    key: "recentForm",
    slug: "recent_form",
    direction: "higher",
    format: (v) => `${Math.round(v * 100)}%`,
    hint: `최근 폼 — 최근 ${RECENT_FORM_GAMES}경기 승률. 높을수록 우세.`,
    glossarySlug: "recent-form",
  },
  {
    key: "elo",
    slug: "elo",
    direction: "higher",
    format: (v) => v.toFixed(0),
    hint:
      "Elo — 체스에서 유래한 상대평가 레이팅. KBO Fancy Stats 기준. 높을수록 강팀.",
    glossarySlug: "elo",
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
                <a
                  href={`/glossary#${f.glossarySlug}`}
                  className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-none cursor-help hover:text-brand-600 dark:hover:text-brand-300 underline decoration-dotted decoration-gray-400 dark:decoration-gray-500 underline-offset-2"
                  title={f.hint}
                >
                  {MetricRegistry[f.slug].ko_name}
                </a>
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

      {/* wave-486: N:M 팩터 균형 배지 — 5팩터 비교 후 종합 verdict 표시 (wave-480 DETAIL / wave-482 LIST 패턴 적용) */}
      {(() => {
        const results = FACTORS.map((f) => ({
          slug: f.slug,
          winner: compare(factorA[f.key], factorB[f.key], f.direction),
        }));
        const aWinSlugs = results.filter((r) => r.winner === 'a').map((r) => r.slug as string);
        const bWinSlugs = results.filter((r) => r.winner === 'b').map((r) => r.slug as string);
        const aN = aWinSlugs.length;
        const bN = bWinSlugs.length;
        if (aN + bN === 0) return null;
        const favoredA = aN > bN;
        const isTied = aN === bN;
        const favoredName = isTied ? null : (favoredA ? teamA.shortName : teamB.shortName);
        const favoredSlugs = favoredA ? aWinSlugs : bWinSlugs;
        const ratio = favoredA ? `${aN}:${bN}` : isTied ? `${aN}:${bN}` : `${bN}:${aN}`;
        const factorLabels = favoredSlugs.map((s) => FACTOR_LABELS_SHORT[s] ?? s).join('·');
        return (
          <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/30 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs uppercase tracking-wide opacity-70">팩터 균형</span>
              {favoredName ? (
                <span className="font-semibold text-gray-700 dark:text-gray-300">{favoredName} 우세</span>
              ) : (
                <span className="font-semibold text-gray-700 dark:text-gray-300">균형</span>
              )}
              <span className="font-mono text-xs">팩터 {ratio}</span>
              {factorLabels && !isTied && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500">({factorLabels})</span>
              )}
            </div>
          </div>
        );
      })()}

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
        예측 전 시점 시즌 평균 · 진한 색이 우세 팩터
      </p>
    </section>
  );
}
