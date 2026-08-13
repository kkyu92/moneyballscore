import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  SITE_URL,
  ACCURACY_GOOD_RATE,
  ACCURACY_BASELINE,
  confToWinProb,
  CLOSE_GAME_MARGIN,
  MATCHUP_RECENT_FORM_GAMES,
  MLB_FACTOR_PICK_STRONG,
  MLB_FACTOR_PICK_COMPLETE,
  mlbShortTeamName,
  type MlbTeamCode,
} from "@moneyball/shared";
import {
  mlbCanonicalPair,
  mlbPairsForTeam,
} from "@/lib/mlb/mlbCanonicalPair";
import {
  buildMlbMatchupProfile,
  type MlbMatchupGame,
} from "@/lib/mlb/buildMlbMatchupProfile";
import {
  buildMlbTeamFactorAverages,
  EMPTY_MLB_FACTOR_AVERAGES,
} from "@/lib/mlb/buildMlbTeamFactorAverages";
import {
  buildTeamRecentForm,
  EMPTY_RECENT_FORM,
} from "@/lib/teams/buildTeamRecentForm";
import { buildMlbSeasonHeadToHead } from "@/lib/mlb/buildMlbSeasonHeadToHead";
import { getMlbConvergencePickHeadToHeadRecord } from "@/lib/analysis/convergenceRecord";
import { buildMlbMatchupEloTrend } from "@/lib/mlb/buildMlbMatchupEloTrend";
import { MlbMatchupFactorCompare } from "@/components/matchup/MlbMatchupFactorCompare";
import { MlbMatchupEloChart } from "@/components/matchup/MlbMatchupEloChart";
import { MlbMatchupRecentForm } from "@/components/matchup/MlbMatchupRecentForm";
import { MlbMatchupSeasonHeadToHead } from "@/components/matchup/MlbMatchupSeasonHeadToHead";
import { MlbMatchupConvergencePickRecord } from "@/components/matchup/MlbMatchupConvergencePickRecord";
import { captureFallback } from "@/lib/observability/captureFallback";
import { ShareButtons } from "@/components/share/ShareButtons";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

// plan #24 Phase 1 MVP — KBO /matchup/[teamA]/[teamB] parity 축소판.
// header + summary + 팀별 성과(sideStats) + 경기 기록 테이블만. elo trend 는 원래 MLB Elo
// rating 시스템 부재로 block(cycle 2057) → plan #25 로 분리 구현 완료(migration 046/047,
// mlb_team_elo_history) → Phase 2b step 2(이번 cycle) 에서 MlbMatchupEloChart 로 노출.
// Phase 2a (cycle 2056) — 시즌 평균 팩터 비교(MlbMatchupFactorCompare) 추가.
// Phase 3a (cycle 2060) — 최근 폼(MlbMatchupRecentForm) 추가.
// Phase 3b (cycle 2063) — 시즌별 상대전적(MlbMatchupSeasonHeadToHead) 추가.
// Phase 3c (cycle 2064) — 수렴 픽 성적(MlbMatchupConvergencePickRecord) 추가. MLB 전용
// composite duel(computeMlbCompositeDuel) + cohort 상수(MLB_PRODUCTION_COHORT_RULES) 신규.
export const revalidate = 3600; // MATCHUP_ISR_SECONDS (Next.js 16 Turbopack: literal required)

interface PageProps {
  params: Promise<{ teamA: string; teamB: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { teamA, teamB } = await params;
  const pair = mlbCanonicalPair(teamA, teamB);
  if (!pair) return {};
  const a = mlbShortTeamName(pair.codeA);
  const b = mlbShortTeamName(pair.codeB);
  const title = `${a} vs ${b} — 상대전적 & 예측 성과 | MLB`;
  const description = `${a} vs ${b}의 올 시즌 맞대결 기록 · AI 예측 적중률 · 경기 리스트. MoneyBall Score MLB 매치업 분석.`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}${pair.path}`,
      languages: {
        en: `${SITE_URL}/en${pair.path}`,
        ko: `${SITE_URL}${pair.path}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${pair.path}`,
      type: "article",
      locale: "ko_KR",
      siteName: "MoneyBall Score",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MlbMatchupPage({ params }: PageProps) {
  const { teamA, teamB } = await params;

  const pair = mlbCanonicalPair(teamA, teamB);
  if (!pair) notFound();
  if (pair.codeA !== teamA || pair.codeB !== teamB) {
    redirect(pair.path);
  }

  const [profile, factorA, factorB, formA, formB, strongH2HStats, completeH2HStats, eloTrend] = await Promise.all([
    buildMlbMatchupProfile(pair),
    buildMlbTeamFactorAverages(pair.codeA).catch((err) =>
      captureFallback(err, EMPTY_MLB_FACTOR_AVERAGES, {
        route: "/mlb/matchup/[teamA]/[teamB]",
        source: "buildMlbTeamFactorAverages.codeA",
      }),
    ),
    buildMlbTeamFactorAverages(pair.codeB).catch((err) =>
      captureFallback(err, EMPTY_MLB_FACTOR_AVERAGES, {
        route: "/mlb/matchup/[teamA]/[teamB]",
        source: "buildMlbTeamFactorAverages.codeB",
      }),
    ),
    buildTeamRecentForm(pair.codeA, MATCHUP_RECENT_FORM_GAMES).catch((err) =>
      captureFallback(err, EMPTY_RECENT_FORM, {
        route: "/mlb/matchup/[teamA]/[teamB]",
        source: "buildTeamRecentForm.codeA",
      }),
    ),
    buildTeamRecentForm(pair.codeB, MATCHUP_RECENT_FORM_GAMES).catch((err) =>
      captureFallback(err, EMPTY_RECENT_FORM, {
        route: "/mlb/matchup/[teamA]/[teamB]",
        source: "buildTeamRecentForm.codeB",
      }),
    ),
    getMlbConvergencePickHeadToHeadRecord(pair.codeA, pair.codeB, MLB_FACTOR_PICK_STRONG).catch((err) =>
      captureFallback(err, [], {
        route: "/mlb/matchup/[teamA]/[teamB]",
        source: "getMlbConvergencePickHeadToHeadRecord(strong)",
      }),
    ),
    getMlbConvergencePickHeadToHeadRecord(pair.codeA, pair.codeB, MLB_FACTOR_PICK_COMPLETE).catch((err) =>
      captureFallback(err, [], {
        route: "/mlb/matchup/[teamA]/[teamB]",
        source: "getMlbConvergencePickHeadToHeadRecord(complete)",
      }),
    ),
    buildMlbMatchupEloTrend(pair.codeA, pair.codeB).catch((err) =>
      captureFallback(err, { points: [] }, {
        route: "/mlb/matchup/[teamA]/[teamB]",
        source: "buildMlbMatchupEloTrend",
      }),
    ),
  ]);
  const { teamA: tA, teamB: tB, sideStats, predictionAccuracy, games } = profile;

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear().toString();
  const thisYearGames = games
    .filter((g) => g.gameDate.startsWith(currentYear) && (g.status === "final" || g.gameDate <= todayStr))
    .sort((a, b) => b.gameDate.localeCompare(a.gameDate));
  const pastGames = games
    .filter((g) => !g.gameDate.startsWith(currentYear) && g.status === "final")
    .sort((a, b) => b.gameDate.localeCompare(a.gameDate));

  const otherMatchupsA = mlbPairsForTeam(tA.code).filter((p) => p.path !== pair.path);
  const otherMatchupsB = mlbPairsForTeam(tB.code).filter((p) => p.path !== pair.path);
  const seasonHeadToHead = buildMlbSeasonHeadToHead(games, tA.code, tB.code);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${tA.shortName} vs ${tB.shortName} 상대전적`,
    description: profile.summary,
    mainEntityOfPage: `${SITE_URL}${pair.path}`,
    publisher: { "@type": "Organization", name: "MoneyBall Score" },
  };

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { href: "/mlb/team", label: "MLB 팀" },
          { label: `${tA.shortName} vs ${tB.shortName}` },
        ]}
      />

      <header className="space-y-3 border-b border-gray-200 dark:border-[var(--color-border)] pb-5">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 flex-wrap">
          <span style={{ color: tA.color }}>{tA.shortName}</span>
          <span className="text-gray-400 dark:text-gray-500">vs</span>
          <span style={{ color: tB.color }}>{tB.shortName}</span>
        </h1>
      </header>

      <section className="bg-gradient-to-r from-brand-500/5 to-accent/5 dark:from-brand-500/10 dark:to-accent/10 rounded-xl border border-brand-500/20 p-6">
        <p className="text-base leading-relaxed text-gray-800 dark:text-gray-100">
          {profile.summary}
        </p>
      </section>

      {profile.finalGames > 0 && (
        <section aria-labelledby="mlb-matchup-side-title" className="space-y-3">
          <h2 id="mlb-matchup-side-title" className="text-xl font-bold">
            팀별 성과
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[sideStats.a, sideStats.b].map((s) => (
              <div
                key={s.teamCode}
                className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl p-5 border border-gray-200 dark:border-[var(--color-border)]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-6 h-6 rounded-full shrink-0"
                    style={{ backgroundColor: s.teamColor }}
                    aria-hidden
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.teamName}</p>
                </div>
                <p className="text-3xl font-bold mt-1">
                  {s.wins}
                  <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">승</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  홈 {s.homeWins}승 · 원정 {s.awayWins}승
                </p>
                {s.predictedToWin > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    AI가 {s.predictedToWin}회 승자로 지목 — 적중{" "}
                    {s.predictedToWinAndCorrect}/{s.predictedToWin}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <MlbMatchupFactorCompare
        teamA={{ shortName: tA.shortName }}
        teamB={{ shortName: tB.shortName }}
        factorA={factorA}
        factorB={factorB}
      />

      {eloTrend.points.length > 0 && (
        <section
          aria-labelledby="mlb-matchup-elo-trend-title"
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
        >
          <h2 id="mlb-matchup-elo-trend-title" className="text-lg font-bold mb-1">
            Elo 레이팅 추이 비교
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            시즌 경기별 두 팀의 Elo 변화
          </p>
          <MlbMatchupEloChart
            points={eloTrend.points}
            teamA={{ shortName: tA.shortName, color: tA.color }}
            teamB={{ shortName: tB.shortName, color: tB.color }}
          />
        </section>
      )}

      <MlbMatchupRecentForm
        teamA={{ shortName: tA.shortName }}
        teamB={{ shortName: tB.shortName }}
        formA={formA}
        formB={formB}
      />

      <MlbMatchupConvergencePickRecord
        titleId="mlb-matchup-convergence-title"
        teamA={{ code: tA.code, shortName: tA.shortName }}
        teamB={{ code: tB.code, shortName: tB.shortName }}
        strongStats={strongH2HStats}
        completeStats={completeH2HStats}
      />

      <MlbMatchupSeasonHeadToHead
        titleId="mlb-matchup-season-h2h-title"
        teamA={tA}
        teamB={tB}
        seasons={seasonHeadToHead}
      />

      {predictionAccuracy.verified > 0 && (
        <section
          aria-labelledby="mlb-matchup-pred-title"
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
        >
          <h2 id="mlb-matchup-pred-title" className="text-lg font-bold mb-3">
            AI 예측 성과 (이 매치업 한정)
          </h2>
          <div className="flex items-baseline gap-3">
            <p
              className={`text-3xl font-bold font-mono ${
                (predictionAccuracy.rate ?? 0) >= ACCURACY_GOOD_RATE
                  ? "text-brand-600 dark:text-brand-400"
                  : (predictionAccuracy.rate ?? 0) >= ACCURACY_BASELINE
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
              }`}
            >
              {predictionAccuracy.rate != null
                ? `${Math.round(predictionAccuracy.rate * 100)}%`
                : "-"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {predictionAccuracy.correct} / {predictionAccuracy.verified}경기
            </p>
          </div>
        </section>
      )}

      {games.length > 0 && (
        <section
          aria-labelledby="mlb-matchup-games-title"
          className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-5"
        >
          <h2 id="mlb-matchup-games-title" className="text-lg font-bold">
            경기 기록
          </h2>

          {thisYearGames.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                {currentYear}시즌
              </p>
              <GameTable games={thisYearGames} />
            </div>
          )}

          {pastGames.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                과거 기록
              </p>
              <GameTable games={pastGames} />
            </div>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 dark:border-[var(--color-border)] pt-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            {tA.shortName}의 다른 매치업
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherMatchupsA.slice(0, 9).map((p) => (
              <Link
                key={p.path}
                href={p.path}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                vs {mlbShortTeamName((p.codeA === tA.code ? p.codeB : p.codeA) as MlbTeamCode)}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            {tB.shortName}의 다른 매치업
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherMatchupsB.slice(0, 9).map((p) => (
              <Link
                key={p.path}
                href={p.path}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                vs {mlbShortTeamName((p.codeA === tB.code ? p.codeB : p.codeA) as MlbTeamCode)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <ShareButtons
          url={`${SITE_URL}${pair.path}`}
          title={`${tA.shortName} vs ${tB.shortName} 상대전적 & 예측 성과`}
          text={profile.summary}
        />
      </footer>
    </article>
  );
}

function GameTable({ games }: { games: MlbMatchupGame[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-[var(--color-border)]">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/40 border-b-2 border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400">
            <th className="py-2.5 px-3 font-semibold">일자</th>
            <th className="py-2.5 px-3 font-semibold">매치</th>
            <th className="py-2.5 px-3 font-semibold text-right">점수</th>
            <th className="py-2.5 px-3 font-semibold text-right">예측</th>
            <th className="py-2.5 px-3 font-semibold text-right">결과</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g, idx) => {
            const margin =
              g.status === "final" && g.homeScore != null && g.awayScore != null
                ? Math.abs(g.homeScore - g.awayScore)
                : null;
            const isClose = margin != null && margin <= CLOSE_GAME_MARGIN;
            const homeName = mlbShortTeamName(g.homeCode);
            const awayName = mlbShortTeamName(g.awayCode);
            const predName = g.predictedWinnerCode ? mlbShortTeamName(g.predictedWinnerCode) : null;
            const resultLabel =
              g.isCorrect == null ? (g.status === "final" ? "-" : "예정") : g.isCorrect ? "적중" : "실패";
            const resultClass =
              g.isCorrect == null
                ? "text-gray-400 dark:text-gray-500"
                : g.isCorrect
                  ? "text-brand-600 dark:text-brand-400 font-semibold"
                  : "text-red-600 dark:text-red-400";
            const rowBg = idx % 2 === 1 ? "bg-gray-50/60 dark:bg-gray-900/20" : "bg-white dark:bg-transparent";
            return (
              <tr
                key={g.gameId}
                data-margin-close={isClose ? "true" : "false"}
                className={`border-b border-gray-100 dark:border-[var(--color-border)] hover:bg-brand-50 dark:hover:bg-brand-500/5 transition-colors ${rowBg}`}
              >
                <td className="py-2.5 px-3 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {g.gameDate}
                </td>
                <td className="py-2.5 px-3">
                  <Link
                    href={`/mlb/games/${g.gameDate}/${g.homeCode}-vs-${g.awayCode}`}
                    className="text-sm font-medium text-gray-800 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    {awayName} vs {homeName}
                  </Link>
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  {g.homeScore != null && g.awayScore != null ? `${g.awayScore}-${g.homeScore}` : "—"}
                </td>
                <td className="py-2.5 px-3 text-right text-xs text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  {predName ?? "—"}
                  {g.confidence != null && (
                    <span className="text-gray-400 dark:text-gray-500 ml-1">
                      ({Math.round(confToWinProb(g.confidence) * 100)}%)
                    </span>
                  )}
                </td>
                <td className={`py-2.5 px-3 text-right text-xs ${resultClass}`}>{resultLabel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
