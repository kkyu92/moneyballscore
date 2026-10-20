import type { Metadata } from "next";
import Link from "next/link";
import { shortTeamName, KBO_TEAM_COUNT, KBO_PLAYOFF_TEAM_COUNT, KBO_SEASON_YEAR, RECENT_FORM_GAMES, STANDINGS_ISR_HOURS, ELO_NEUTRAL, SITE_URL, parseRecent10Record, VENUE_RECORD_MIN_GAMES, VENUE_WIN_RATE_HIGH, VENUE_WIN_RATE_LOW, PRODUCTION_COHORT_RULES } from "@moneyball/shared";
import { buildStandings } from "@/lib/standings/buildStandings";
import { buildAllTeamAccuracy } from "@/lib/standings/buildTeamAccuracy";
import { buildEloTrend } from "@/lib/standings/buildEloTrend";
import { computeMagicNumber } from "@/lib/standings/computeMagicNumber";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { EloTrendChart } from "@/components/dashboard/EloTrendChart";
import { TeamAccuracySortControl } from "@/components/standings/TeamAccuracySortControl";
import { TeamAccuracyList } from "@/components/standings/TeamAccuracyList";
import { FACTOR_LABELS_TECHNICAL } from "@/lib/predictions/factorLabels";
import { captureFallback } from "@/lib/observability/captureFallback";

export const revalidate = 3600; // STANDINGS_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export const metadata: Metadata = {
  title: "KBO 팀 순위",
  description: `${KBO_SEASON_YEAR} KBO 리그 팀 순위표 — 승·무·패, 승률, 게임차, 최근${RECENT_FORM_GAMES}경기. ${STANDINGS_ISR_HOURS}시간마다 자동 업데이트.`,
  alternates: { canonical: `${SITE_URL}/standings` },
  openGraph: {
    title: `KBO 팀 순위 ${KBO_SEASON_YEAR}`,
    description: `${KBO_SEASON_YEAR} KBO 리그 실시간 팀 순위표. 승·무·패, 승률, 게임차, 최근${RECENT_FORM_GAMES}경기 성적.`,
    url: `${SITE_URL}/standings`,
    type: "website",
    locale: "ko_KR",
    siteName: "MoneyBall Score",
  },
  twitter: {
    card: "summary_large_image",
    title: `KBO 팀 순위 ${KBO_SEASON_YEAR} | MoneyBall Score`,
    description: `${KBO_SEASON_YEAR} KBO 리그 실시간 팀 순위표. 승·무·패, 승률, 게임차, 최근${RECENT_FORM_GAMES}경기 성적.`,
  },
};

function formatWinPct(v: number): string {
  if (v === 0) return "-.---";
  return v.toFixed(3).replace(/^0/, "");
}

function formatGB(gb: number | null): string {
  if (gb === null) return "-";
  if (gb === 0) return "0.0";
  return gb % 1 === 0 ? `${gb}.0` : String(gb);
}

function MagicNumberBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] px-3 py-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-lg font-bold tabular-nums text-brand-600 dark:text-brand-400">
        {value === 0 ? "확정" : value}
      </span>
    </div>
  );
}

function Recent10({ text }: { text: string }) {
  const { wins, losses } = parseRecent10Record(text) ?? { wins: 0, losses: 0 };
  return (
    <span className="tabular-nums text-xs font-mono">
      <span className="text-brand-600 dark:text-brand-400">{wins}승</span>
      <span className="text-gray-400 dark:text-gray-500 mx-0.5">·</span>
      <span className="text-red-600 dark:text-red-400">{losses}패</span>
    </span>
  );
}

// wave-488: 홈/원정 성적 — StandingRow.homeWins/homeLosses (column 8, kbo-official scraper) 는 이미 fetch 중이나 테이블에 미노출
function HomeAwayRecord({ wins, losses, homeWins, homeLosses }: { wins: number; losses: number; homeWins?: number; homeLosses?: number }) {
  if (homeWins === undefined || homeLosses === undefined) {
    return <span className="text-gray-300 dark:text-gray-600">-</span>;
  }
  const awayWins = Math.max(0, wins - homeWins);
  const awayLosses = Math.max(0, losses - homeLosses);
  const homeTotal = homeWins + homeLosses;
  const awayTotal = awayWins + awayLosses;
  const homeWinRate = homeTotal > 0 ? homeWins / homeTotal : null;
  const awayWinRate = awayTotal > 0 ? awayWins / awayTotal : null;
  return (
    <span className="tabular-nums text-xs font-mono whitespace-nowrap">
      {homeTotal >= VENUE_RECORD_MIN_GAMES && homeWinRate !== null ? (
        <span className={
          homeWinRate >= VENUE_WIN_RATE_HIGH
            ? "text-brand-500 dark:text-brand-400"
            : homeWinRate <= VENUE_WIN_RATE_LOW
              ? "text-orange-500 dark:text-orange-400"
              : "text-gray-500 dark:text-gray-400"
        }>홈{homeWins}승{homeLosses}패</span>
      ) : (
        <span className="text-gray-300 dark:text-gray-600">홈-</span>
      )}
      <span className="text-gray-300 dark:text-gray-700 mx-0.5">/</span>
      {awayTotal >= VENUE_RECORD_MIN_GAMES && awayWinRate !== null ? (
        <span className={
          awayWinRate >= VENUE_WIN_RATE_HIGH
            ? "text-brand-500 dark:text-brand-400"
            : awayWinRate <= VENUE_WIN_RATE_LOW
              ? "text-orange-500 dark:text-orange-400"
              : "text-gray-500 dark:text-gray-400"
        }>원{awayWins}승{awayLosses}패</span>
      ) : (
        <span className="text-gray-300 dark:text-gray-600">원-</span>
      )}
    </span>
  );
}

export default async function StandingsPage() {
  // 서버 장애(DB 연결 실패 등)로 인한 fallback 과 "실제 데이터 없음" 을 구분하기 위해
  // Promise.allSettled 로 각 fetch 의 성공/실패를 순수 파생값으로 추적 (컴포넌트 내 재할당 금지 lint 룰 준수).
  const [standingsR, teamAccuracyR, eloTrendR] = await Promise.allSettled([
    buildStandings(),
    buildAllTeamAccuracy({ cohort: PRODUCTION_COHORT_RULES }),
    buildEloTrend(),
  ]);
  const standings = standingsR.status === "fulfilled" ? standingsR.value : captureFallback(standingsR.reason, [], { route: "/standings", source: "buildStandings" });
  const teamAccuracyResult = teamAccuracyR.status === "fulfilled" ? teamAccuracyR.value : captureFallback(teamAccuracyR.reason, { rows: [], degraded: true }, { route: "/standings", source: "buildAllTeamAccuracy" });
  const teamAccuracy = teamAccuracyResult.rows;
  const eloTrend = eloTrendR.status === "fulfilled" ? eloTrendR.value : captureFallback(eloTrendR.reason, { points: [], teams: [], degraded: true }, { route: "/standings", source: "buildEloTrend" });

  const dbDegraded = teamAccuracyResult.degraded || eloTrend.degraded || [standingsR, teamAccuracyR, eloTrendR].some((r) => r !== null && r.status === "rejected");

  // 현재 Elo: eloTrend 마지막 데이터 포인트에서 팀별 추출 (신규 DB 쿼리 0건)
  const currentEloMap = new Map<string, number>();
  const lastEloPoint = eloTrend.points[eloTrend.points.length - 1];
  if (lastEloPoint) {
    for (const [key, val] of Object.entries(lastEloPoint)) {
      if (key !== 'date' && typeof val === 'number') currentEloMap.set(key, val);
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${KBO_SEASON_YEAR} KBO 팀 순위`,
    description: `${KBO_SEASON_YEAR} KBO 리그 팀 순위표`,
    numberOfItems: standings.length,
    itemListElement: standings.map((row, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: shortTeamName(row.teamCode),
    })),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb items={[{ label: "팀 순위" }]} />

      {dbDegraded && (
        <div
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          일시적인 서비스 장애로 일부 정보가 표시되지 않을 수 있습니다. 잠시 후 다시 시도해주세요.
        </div>
      )}

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{KBO_SEASON_YEAR} KBO 팀 순위</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          KBO 공식 집계 기준 · {STANDINGS_ISR_HOURS}시간마다 갱신
        </p>
        <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
          현재 정규시즌 {KBO_TEAM_COUNT}팀의 승·무·패, 승률, 게임차, 최근 {RECENT_FORM_GAMES}경기 성적을
          실시간으로 표시. Elo 컬럼 = AI 모델 현재 팀 전력 평가 ({ELO_NEUTRAL} 기준 — 높을수록 강팀). 하단에서 팀별 적중률 + 30일 Elo 추이 차트도 확인하세요. 모델 방법론은{" "}
          <Link
            href="/methodology"
            className="text-brand-500 hover:underline"
          >
            /methodology
          </Link>{" "}
          참조.
        </p>
      </header>

      {standings.length >= 2 && (() => {
        const championshipMN = computeMagicNumber(standings[0], standings[1]);
        const playoffLeader = standings[KBO_PLAYOFF_TEAM_COUNT - 1];
        const playoffChaser = standings[KBO_PLAYOFF_TEAM_COUNT];
        const playoffMN = playoffLeader && playoffChaser ? computeMagicNumber(playoffLeader, playoffChaser) : null;
        if (championshipMN === null && playoffMN === null) return null;
        return (
          <div className="flex flex-wrap gap-2">
            {championshipMN !== null && (
              <MagicNumberBadge label={`${shortTeamName(standings[0].teamCode)} 우승 매직넘버`} value={championshipMN} />
            )}
            {playoffMN !== null && playoffLeader && (
              <MagicNumberBadge label={`${shortTeamName(playoffLeader.teamCode)} 가을야구 매직넘버`} value={playoffMN} />
            )}
          </div>
        );
      })()}

      {standings.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-8 text-center text-gray-500 dark:text-gray-400">
          순위 데이터를 불러오는 중입니다. 잠시 후 다시 확인해 주세요.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-[var(--color-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-[var(--color-surface-card)]/50 border-b border-gray-200 dark:border-[var(--color-border)]">
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 w-10">순위</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">팀</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 tabular-nums">경기</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 tabular-nums">승</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 tabular-nums">무</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 tabular-nums">패</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 tabular-nums">승률</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 tabular-nums">게임차</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">최근{RECENT_FORM_GAMES}</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-300" title={`홈/원정 성적 (${VENUE_RECORD_MIN_GAMES}경기 미만은 표본 부족으로 -로 표시)`}>홈/원정</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 tabular-nums" title={`Elo 레이팅 (기준: ${ELO_NEUTRAL})`}>Elo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {standings.map((row) => {
                  const isTop3 = row.rank <= 3;
                  const isLast = row.rank === standings.length;
                  const currentElo = currentEloMap.get(row.teamCode);
                  const eloAboveNeutral = currentElo != null && currentElo >= ELO_NEUTRAL;
                  return (
                    <tr
                      key={row.teamCode}
                      className={`transition-colors hover:bg-gray-50 dark:hover:bg-[var(--color-surface-card)]/30 ${
                        isTop3
                          ? "bg-brand-50/40 dark:bg-brand-900/10"
                          : isLast
                          ? "bg-red-50/30 dark:bg-red-900/10"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            row.rank === 1
                              ? "bg-accent text-brand-900"
                              : row.rank <= 3
                              ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Link
                          href={`/teams/${row.teamCode}`}
                          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                        >
                          <TeamLogo team={row.teamCode} size={28} />
                          <span className="font-medium">{shortTeamName(row.teamCode)}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{row.games}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-brand-700 dark:text-brand-400">{row.wins}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-400 dark:text-gray-500">{row.draws}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-red-600 dark:text-red-400">{row.losses}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-mono font-semibold">
                        {formatWinPct(row.winPct)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                        {formatGB(row.gamesBehind)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {row.recent10 ? <Recent10 text={row.recent10} /> : <span className="text-gray-300 dark:text-gray-600">-</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <HomeAwayRecord wins={row.wins} losses={row.losses} homeWins={row.homeWins} homeLosses={row.homeLosses} />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-mono text-xs">
                        {currentElo != null ? (
                          <span className={eloAboveNeutral ? "text-brand-600 dark:text-brand-400 font-semibold" : "text-gray-500 dark:text-gray-400"}>
                            {Math.round(currentElo)}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
        출처: KBO 공식 · {STANDINGS_ISR_HOURS}시간마다 갱신
      </p>

      {eloTrend.points.length > 0 && (
        <section aria-labelledby="elo-trend-title">
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h2 id="elo-trend-title" className="text-base font-bold">팀별 {FACTOR_LABELS_TECHNICAL.elo} 추이</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">{KBO_SEASON_YEAR} 시즌 · AI 예측 기반</span>
            </div>
            <EloTrendChart points={eloTrend.points} teams={eloTrend.teams} />
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              경기 직전 AI 예측에 사용된 Elo 레이팅. 상승세 팀일수록 예측 모델이 높은 전력으로 평가.
            </p>
          </div>
        </section>
      )}

      {teamAccuracy.length > 0 && (
        <section aria-labelledby="prediction-accuracy-title" className="space-y-3">
          <TeamAccuracySortControl />
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h2 id="prediction-accuracy-title" className="text-base font-bold">MoneyBall 예측 적중률</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">팀별 · 시즌 누적</span>
            </div>
            <TeamAccuracyList rows={teamAccuracy} />
          </div>
        </section>
      )}
    </div>
  );
}
