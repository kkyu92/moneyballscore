import { RECENT_FORM_GAMES } from "@moneyball/shared";
import type { MlbTeamFactorAverages } from "@/lib/mlb/buildMlbTeamFactorAverages";
import { computeWinProbPct } from "@/lib/analysis/convergenceRecord";

interface Props {
  teamA: { shortName: string };
  teamB: { shortName: string };
  factorA: MlbTeamFactorAverages;
  factorB: MlbTeamFactorAverages;
  locale?: "ko" | "en";
}

type FactorKey = keyof Pick<
  MlbTeamFactorAverages,
  "spFip" | "lineupWoba" | "bullpenFip" | "recentForm" | "elo" | "lineupXwoba" | "lineupBarrelPct"
>;

interface FactorRow {
  key: FactorKey;
  label: string;
  shortLabel: string;
  /** "lower" = 낮을수록 우세, "higher" = 높을수록 우세 */
  direction: "lower" | "higher";
  format: (v: number) => string;
  /** native title 툴팁 — 비전문가용 약어 풀이 + 의미 */
  hint: string;
  /** glossary 앵커 slug — 없으면 일반 /glossary 로 연결 (xwOBA/Barrel% 는 MetricRegistry 미등록) */
  glossarySlug?: string;
}

interface Strings {
  title: string;
  gamesLabel: string;
  lowerBetter: string;
  higherBetter: string;
  balanceLabel: string;
  favored: (name: string) => string;
  balanced: string;
  footer: string;
}

const STRINGS: Record<"ko" | "en", Strings> = {
  ko: {
    title: "시즌 평균 팩터 비교",
    gamesLabel: "경기",
    lowerBetter: "낮을수록 우세",
    higherBetter: "높을수록 우세",
    balanceLabel: "팩터 균형",
    favored: (name) => `${name} 우세`,
    balanced: "균형",
    footer: "예측 전 시점 시즌 평균 · 진한 색이 우세 팩터",
  },
  en: {
    title: "Season Average Factor Comparison",
    gamesLabel: "games",
    lowerBetter: "lower is better",
    higherBetter: "higher is better",
    balanceLabel: "Factor balance",
    favored: (name) => `${name} favored`,
    balanced: "Balanced",
    footer: "Season averages as of prediction time · darker shade = favored factor",
  },
};

// plan #24 Phase 2a — KBO MatchupFactorCompare.tsx 의 MLB 대응. KBO 는 8팩터(FIP/xFIP/
// wOBA/불펜FIP/최근폼/Elo/SFR/WAR)지만 이 컴포넌트는 buildMlbTeamFactorAverages.ts 가
// 수집하는 7팩터(spFip/lineupWoba/bullpenFip/recentForm/elo/lineupXwoba/lineupBarrelPct)만
// 표시 — xFIP/WAR 는 mlb-pipeline.ts 가 실제로 저장함(home_sp_xfip/away_sp_xfip,
// home_war_total/away_war_total — computeMlbCompositeDuel.ts 도 이 값으로 duel 계산 중)에도
// buildMlbTeamFactorAverages.ts 가 아직 집계하지 않는 builder-level gap (표시 확장 시 그쪽
// SELECT 컬럼만 추가하면 됨). SFR(defense_sfr) 만 MLB 파이프라인 자체가 진짜 미구현
// placeholder — computeMlbCompositeDuel.ts cycle 2771 정정과 동일 결론, 본 주석 정정은 그
// 결론이 이 파일엔 반영 안 돼있던 drift (review-code sweep). MetricRegistry 에 xwoba/
// barrel_pct slug 가 없어(KBO 전용 10팩터 registry) 라벨/힌트를 이 컴포넌트에 로컬로 둠 —
// glossary 앵커도 미보유 항목은 일반 /glossary 로 연결.
// locale prop — KBO matchup 은 KO 전용이지만 MLB matchup 은 Phase 1 부터 KO+EN 양쪽
// 라우트가 있어(en/mlb/matchup) 팩터 비교도 동일 parity 유지.
function buildFactors(locale: "ko" | "en"): FactorRow[] {
  if (locale === "en") {
    return [
      {
        key: "spFip",
        label: "Starting Pitching",
        shortLabel: "SP",
        direction: "lower",
        format: (v) => v.toFixed(2),
        hint:
          "FIP — Fielding Independent Pitching. ERA-like metric using only outcomes a pitcher directly controls (K/BB/HR). Lower is better.",
        glossarySlug: "fip",
      },
      {
        key: "lineupWoba",
        label: "Lineup Power",
        shortLabel: "wOBA",
        direction: "higher",
        format: (v) => v.toFixed(3),
        hint:
          "wOBA — Weighted On-Base Average. Combines all offensive outcomes into a single value-weighted rate stat. Higher is better.",
        glossarySlug: "woba",
      },
      {
        key: "bullpenFip",
        label: "Bullpen Stability",
        shortLabel: "Bullpen",
        direction: "lower",
        format: (v) => v.toFixed(2),
        hint: "Bullpen FIP — combined FIP of relief pitchers. Lower is better.",
        glossarySlug: "bullpen-fip",
      },
      {
        key: "recentForm",
        label: "Recent Form",
        shortLabel: "Form",
        direction: "higher",
        format: (v) => `${computeWinProbPct(v)}%`,
        hint: `Recent form — win rate over the last ${RECENT_FORM_GAMES} games. Higher is better.`,
        glossarySlug: "recent-form",
      },
      {
        key: "elo",
        label: "Team Strength",
        shortLabel: "Elo",
        direction: "higher",
        format: (v) => v.toFixed(0),
        hint: "Elo — relative team strength rating. Higher is stronger.",
        glossarySlug: "elo",
      },
      {
        key: "lineupXwoba",
        label: "Batted Ball Quality (xwOBA)",
        shortLabel: "xwOBA",
        direction: "higher",
        format: (v) => v.toFixed(3),
        hint:
          "xwOBA — Statcast expected wOBA based on exit velocity and launch angle. Removes luck (defense, wind). Higher is better.",
      },
      {
        key: "lineupBarrelPct",
        label: "Batted Ball Quality (Barrel%)",
        shortLabel: "Barrel%",
        direction: "higher",
        format: (v) => `${v.toFixed(1)}%`,
        hint:
          "Barrel% — share of batted balls in the optimal exit velocity/launch angle zone for extra-base hits. Higher is better.",
      },
    ];
  }
  return [
    {
      key: "spFip",
      label: "선발 투수력",
      shortLabel: "선발",
      direction: "lower",
      format: (v) => v.toFixed(2),
      hint:
        "FIP — Fielding Independent Pitching. 선발투수가 직접 통제할 수 있는 결과(삼진·볼넷·홈런)만 본 평균자책점 지표. 낮을수록 우세.",
      glossarySlug: "fip",
    },
    {
      key: "lineupWoba",
      label: "타선 화력",
      shortLabel: "타선",
      direction: "higher",
      format: (v) => v.toFixed(3),
      hint:
        "wOBA — Weighted On-Base Average. 안타·볼넷·홈런 등 출루 결과별 가치를 가중치로 합산한 종합 타격 지표. 높을수록 우세.",
      glossarySlug: "woba",
    },
    {
      key: "bullpenFip",
      label: "불펜 안정성",
      shortLabel: "불펜",
      direction: "lower",
      format: (v) => v.toFixed(2),
      hint:
        "불펜 FIP — 중계/마무리 투수진의 종합 FIP. 선발 강판 후 경기 결과에 큰 영향. 낮을수록 우세.",
      glossarySlug: "bullpen-fip",
    },
    {
      key: "recentForm",
      label: "최근 폼",
      shortLabel: "폼",
      direction: "higher",
      format: (v) => `${computeWinProbPct(v)}%`,
      hint: `최근 폼 — 최근 ${RECENT_FORM_GAMES}경기 승률. 높을수록 우세.`,
      glossarySlug: "recent-form",
    },
    {
      key: "elo",
      label: "팀 전력",
      shortLabel: "Elo",
      direction: "higher",
      format: (v) => v.toFixed(0),
      hint: "Elo — 체스에서 유래한 상대평가 레이팅. 높을수록 강팀.",
      glossarySlug: "elo",
    },
    {
      key: "lineupXwoba",
      label: "타구 품질(xwOBA)",
      shortLabel: "xwOBA",
      direction: "higher",
      format: (v) => v.toFixed(3),
      hint:
        "xwOBA — Statcast 타구 발사각/속도 기반 기대 wOBA. 운(수비 시프트·바람 등) 요소를 제거한 타격 잠재력. 높을수록 우세.",
    },
    {
      key: "lineupBarrelPct",
      label: "타구 품질(Barrel%)",
      shortLabel: "Barrel%",
      direction: "higher",
      format: (v) => `${v.toFixed(1)}%`,
      hint:
        "Barrel% — 타구 발사각/속도가 장타로 이어지기 가장 좋은 구간(barrel)에 든 타구 비율. 높을수록 강한 타구 생산 우세.",
    },
  ];
}

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

export function MlbMatchupFactorCompare({
  teamA,
  teamB,
  factorA,
  factorB,
  locale = "ko",
}: Props) {
  if (factorA.sampleN === 0 && factorB.sampleN === 0) return null;

  const s = STRINGS[locale];
  const factors = buildFactors(locale);

  return (
    <section
      aria-labelledby="mlb-matchup-factor-title"
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
    >
      <div className="flex items-baseline justify-between mb-4">
        <h2 id="mlb-matchup-factor-title" className="text-lg font-bold">
          {s.title}
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {teamA.shortName} {factorA.sampleN}
          {s.gamesLabel} · {teamB.shortName} {factorB.sampleN}
          {s.gamesLabel}
        </span>
      </div>

      <div className="space-y-3">
        {factors.map((f) => {
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
            <div key={f.key} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm">
              <div
                className={`text-right font-mono px-2 py-1 rounded transition-colors ${
                  aWins ? "bg-brand-500/10 dark:bg-brand-500/20" : ""
                } ${aClass}`}
              >
                {a != null ? f.format(a) : "-"}
              </div>

              <div className="flex flex-col items-center gap-1 min-w-[8rem]">
                <a
                  href={f.glossarySlug ? `/glossary#${f.glossarySlug}` : "/glossary"}
                  className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-none cursor-help hover:text-brand-600 dark:hover:text-brand-300 underline decoration-dotted decoration-gray-400 dark:decoration-gray-500 underline-offset-2"
                  title={f.hint}
                >
                  {f.label}
                </a>
                <div className="relative w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  {aWins && (
                    <div className="absolute inset-y-0 left-0 right-[50%] bg-brand-500/50 dark:bg-brand-400/60 rounded-l-full" />
                  )}
                  {bWins && (
                    <div className="absolute inset-y-0 left-[50%] right-0 bg-brand-500/50 dark:bg-brand-400/60 rounded-r-full" />
                  )}
                  <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 dark:bg-gray-500 -translate-x-px" />
                </div>
                <span className="text-2xs text-gray-400 dark:text-gray-500 leading-none">
                  {f.direction === "lower" ? s.lowerBetter : s.higherBetter}
                </span>
              </div>

              <div
                className={`text-left font-mono px-2 py-1 rounded transition-colors ${
                  bWins ? "bg-brand-500/10 dark:bg-brand-500/20" : ""
                } ${bClass}`}
              >
                {b != null ? f.format(b) : "-"}
              </div>
            </div>
          );
        })}
      </div>

      {(() => {
        const results = factors.map((f) => ({
          shortLabel: f.shortLabel,
          winner: compare(factorA[f.key], factorB[f.key], f.direction),
        }));
        const aWinLabels = results.filter((r) => r.winner === "a").map((r) => r.shortLabel);
        const bWinLabels = results.filter((r) => r.winner === "b").map((r) => r.shortLabel);
        const aN = aWinLabels.length;
        const bN = bWinLabels.length;
        if (aN + bN === 0) return null;
        const favoredA = aN > bN;
        const isTied = aN === bN;
        const favoredName = isTied ? null : favoredA ? teamA.shortName : teamB.shortName;
        const favoredLabels = favoredA ? aWinLabels : bWinLabels;
        const ratio = favoredA ? `${aN}:${bN}` : isTied ? `${aN}:${bN}` : `${bN}:${aN}`;
        return (
          <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/30 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs uppercase tracking-wide opacity-70">{s.balanceLabel}</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {favoredName ? s.favored(favoredName) : s.balanced}
              </span>
              <span className="font-mono text-xs">
                {locale === "en" ? "Factors " : "팩터 "}
                {ratio}
              </span>
              {favoredLabels.length > 0 && !isTied && (
                <span className="text-2xs text-gray-400 dark:text-gray-500">
                  ({favoredLabels.join("·")})
                </span>
              )}
            </div>
          </div>
        );
      })()}

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">{s.footer}</p>
    </section>
  );
}
