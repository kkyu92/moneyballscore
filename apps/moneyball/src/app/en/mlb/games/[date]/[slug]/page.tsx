import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MlbDetailedFactorAnalysis } from "@/components/predictions/MlbDetailedFactorAnalysis";
import { MlbFactorWaterfallChart } from "@/components/predictions/MlbFactorWaterfallChart";
import { MlbGameOverview } from "@/components/predictions/MlbGameOverview";
import { MlbHistoricalAnalogMatchup } from "@/components/predictions/MlbHistoricalAnalogMatchup";
import { MlbRivalryMemorySurface } from "@/components/predictions/MlbRivalryMemorySurface";
import { ShareButtons } from "@/components/share/ShareButtons";
import { RelatedLinks, type RelatedLink } from "@/components/shared/RelatedLinks";
import { mlbCanonicalPair } from "@/lib/mlb/mlbCanonicalPair";
import { createClient } from "@/lib/supabase/server";
import { computeMlbCompositeDuel } from "@/lib/analysis/computeMlbCompositeDuel";
import { getMlbRecentConvergencePickRecord, computeWinRatePct } from "@/lib/analysis/convergenceRecord";
import { computeMlbWaterfall, type MlbWaterfallInput } from "@moneyball/kbo-data";
import {
  assertSelectOk,
  SITE_URL,
  MLB_SCORING_RULE,
  normalizeMlbTeamCode,
  toMlbStatsApiCode,
  mlbShortTeamName,
  MLB_TEAMS,
  MLB_COMPOSITE_DUEL_MIN_VALID,
  MLB_FACTOR_PICK_STRONG,
  MLB_FACTOR_PICK_COMPLETE,
  COMPOSITE_DUEL_FACTOR_LABEL_LIMIT,
  type MlbTeamCode,
} from "@moneyball/shared";

// KO page.tsx FACTOR_LABELS_SHORT(한글)의 EN 대응 — computeMlbCompositeDuel 이 다루는
// 6팩터(lineup_woba/bullpen_fip/sp_fip/sp_xfip/war/park_factor)만 필요. shortLabel 은
// en/mlb/factors/page.tsx KBO_FACTORS 표기와 동일 값 사용 (parity).
const EN_FACTOR_LABELS_SHORT: Record<string, string> = {
  sp_fip: "SP FIP",
  sp_xfip: "SP xFIP",
  lineup_woba: "Lineup wOBA",
  bullpen_fip: "Bullpen FIP",
  war: "Team WAR",
  park_factor: "PF",
};

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

interface PageParams {
  params: Promise<{ date: string; slug: string }>;
}

// 실제 dl breakdown 에 렌더되는 팩터만 정의 — KO page.tsx(cycle 2108 review-code heavy)와
// 동일 패턴, 카운트가 array.length 로 self-sync.
const GAME_DETAIL_FACTOR_ROWS: Array<{
  label: string;
  homeKey: keyof PredictionDetailRow;
  awayKey: keyof PredictionDetailRow;
}> = [
  { label: "SP FIP", homeKey: "home_sp_fip", awayKey: "away_sp_fip" },
  { label: "SP xFIP", homeKey: "home_sp_xfip", awayKey: "away_sp_xfip" },
  { label: "Bullpen FIP", homeKey: "home_bullpen_fip", awayKey: "away_bullpen_fip" },
  { label: "Lineup wOBA", homeKey: "home_lineup_woba", awayKey: "away_lineup_woba" },
  { label: "WAR", homeKey: "home_war_total", awayKey: "away_war_total" },
  { label: "Recent Form", homeKey: "home_recent_form", awayKey: "away_recent_form" },
  // head_to_head_rate is a single DB column (homeWinRate) — this array only feeds a
  // length count, the real pair-encoding lives in the waterfallInput below.
  { label: "Head-to-Head", homeKey: "head_to_head_rate", awayKey: "head_to_head_rate" },
  { label: "Elo", homeKey: "home_elo", awayKey: "away_elo" },
  { label: "Lineup xwOBA", homeKey: "home_lineup_xwoba", awayKey: "away_lineup_xwoba" },
  { label: "Barrel%", homeKey: "home_lineup_barrel_pct", awayKey: "away_lineup_barrel_pct" },
];

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { date, slug } = await params;
  const title = `${slug} ${date} Analysis | MoneyBall Score`;
  const description = `${slug} ${GAME_DETAIL_FACTOR_ROWS.length}-factor breakdown + waterfall.`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/en/mlb/games/${date}/${slug}`,
      languages: { en: `${SITE_URL}/en/mlb/games/${date}/${slug}`, ko: `${SITE_URL}/mlb/games/${date}/${slug}` },
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "MoneyBall Score",
      title,
      description,
      url: `${SITE_URL}/en/mlb/games/${date}/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

interface PredictionDetailRow {
  external_game_id: string;
  home_win_prob: number | null;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_sp_xfip: number | null;
  away_sp_xfip: number | null;
  home_bullpen_fip: number | null;
  away_bullpen_fip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
  home_war_total: number | null;
  away_war_total: number | null;
  home_lineup_xwoba: number | null;
  away_lineup_xwoba: number | null;
  home_lineup_barrel_pct: number | null;
  away_lineup_barrel_pct: number | null;
  home_elo: number | null;
  away_elo: number | null;
  home_recent_form: number | null;
  away_recent_form: number | null;
  head_to_head_rate: number | null;
}

interface ScheduleRow {
  external_game_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  game_datetime_utc: string;
  home_starter_name: string | null;
  away_starter_name: string | null;
}

// KO page.tsx(cycle 2099) 와 동일 — SportsEvent JSON-LD eventStatus 매핑.
const MLB_EVENT_STATUS: Record<string, string> = {
  postponed: 'https://schema.org/EventPostponed',
  final: 'https://schema.org/EventCompleted',
  in_progress: 'https://schema.org/EventScheduled',
  scheduled: 'https://schema.org/EventScheduled',
};

export default async function GameDetailEn({ params }: PageParams) {
  const { date, slug } = await params;
  const [homeParam, awayParam] = slug.split('-vs-');
  if (!homeParam || !awayParam) notFound();

  // KO page.tsx(cycle 2099/2108) 와 동일 이유 — MLB 는 games(KBO FK 스키마) 에 없고
  // game_id=NULL(migration 038, mlb-pipeline.ts:451) 이라 KBO 전용 FK inner join 은 항상
  // 미스매치. 이 EN 미러는 그 조인을 그대로 써서 모든 MLB 경기가 silent 404 였음
  // (cycle 2108 review-code heavy 발견 — KO 는 cycle 2099 에 이미 고쳤지만 EN 미러는 미동기).
  const homeCode = normalizeMlbTeamCode(homeParam) ?? (homeParam as MlbTeamCode);
  const awayCode = normalizeMlbTeamCode(awayParam) ?? (awayParam as MlbTeamCode);
  const dbHomeCode = toMlbStatsApiCode(homeCode);
  const dbAwayCode = toMlbStatsApiCode(awayCode);

  const supabase = await createClient();

  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, home_score, away_score, status, game_datetime_utc, home_starter_name, away_starter_name')
    .eq('game_date', date)
    .eq('home_team_code', dbHomeCode)
    .eq('away_team_code', dbAwayCode)
    .maybeSingle();
  const { data: scheduleRaw } = assertSelectOk(scheduleResult, 'MlbGameDetailEn schedule');
  const schedule = scheduleRaw as ScheduleRow | null;

  if (!schedule) notFound();

  const predResult = await supabase
    .from('predictions')
    .select(`
      external_game_id,
      home_win_prob,
      home_sp_fip,
      away_sp_fip,
      home_sp_xfip,
      away_sp_xfip,
      home_bullpen_fip,
      away_bullpen_fip,
      home_lineup_woba,
      away_lineup_woba,
      home_war_total,
      away_war_total,
      home_lineup_xwoba,
      away_lineup_xwoba,
      home_lineup_barrel_pct,
      away_lineup_barrel_pct,
      home_elo,
      away_elo,
      home_recent_form,
      away_recent_form,
      head_to_head_rate
    `)
    .eq('league', 'mlb')
    .eq('scoring_rule', MLB_SCORING_RULE)
    .eq('external_game_id', schedule.external_game_id)
    .maybeSingle();
  const { data: predRaw } = assertSelectOk(predResult, 'MlbGameDetailEn prediction');
  const pred = predRaw as PredictionDetailRow | null;

  if (!pred) notFound();

  const home = homeCode;
  const away = awayCode;
  const homeWinProb = pred.home_win_prob ?? 0.5;
  const winnerCode = homeWinProb >= 0.5 ? home : away;
  const conf = Math.round((homeWinProb >= 0.5 ? homeWinProb : 1 - homeWinProb) * 100);

  // SportsEvent 스키마 — KO page.tsx(cycle 2099) parity.
  const homeFullName = MLB_TEAMS[home].name;
  const awayFullName = MLB_TEAMS[away].name;
  const pageUrl = `${SITE_URL}/en/mlb/games/${date}/${slug}`;
  const sportsEventLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${awayFullName} vs ${homeFullName}`,
    startDate: schedule.game_datetime_utc,
    sport: "Baseball",
    eventStatus: MLB_EVENT_STATUS[schedule.status] ?? MLB_EVENT_STATUS.scheduled,
    location: { "@type": "Place", name: MLB_TEAMS[home].stadium },
    homeTeam: { "@type": "SportsTeam", name: homeFullName },
    awayTeam: { "@type": "SportsTeam", name: awayFullName },
    url: pageUrl,
    organizer: {
      "@type": "SportsOrganization",
      "@id": "https://www.mlb.com",
      url: "https://www.mlb.com",
      name: "Major League Baseball",
      alternateName: "MLB",
    },
  };

  // waterfall bar 1회 계산 (server) — MlbGameOverview prose + MlbFactorWaterfallChart(client)
  // 양쪽이 동일 input 소비. KO page.tsx(cycle 2104/2110)와 동일 패턴.
  const waterfallInput: MlbWaterfallInput = {
    sp_fip: { home: pred.home_sp_fip, away: pred.away_sp_fip },
    sp_xfip: { home: pred.home_sp_xfip, away: pred.away_sp_xfip },
    bullpen_fip: { home: pred.home_bullpen_fip, away: pred.away_bullpen_fip },
    lineup_woba: { home: pred.home_lineup_woba, away: pred.away_lineup_woba },
    war: { home: pred.home_war_total, away: pred.away_war_total },
    // home_recent_form/away_recent_form 은 DB 에 0-1 승률(KBO 와 동일 컨벤션)로 저장되지만
    // mlb-waterfall.ts/mlb-base.ts 의 recent_form 계약은 mlb-pipeline.ts 가 computeMlbProbability
    // 호출 직전 *100 해 넘기는 0-100(백분율) 스케일 — KO page.tsx 와 동일 fix (cycle 2412).
    recent_form: {
      home: pred.home_recent_form == null ? null : pred.home_recent_form * 100,
      away: pred.away_recent_form == null ? null : pred.away_recent_form * 100,
    },
    head_to_head: {
      home: pred.head_to_head_rate,
      away: pred.head_to_head_rate == null ? null : 1 - pred.head_to_head_rate,
    },
    lineup_xwoba: { home: pred.home_lineup_xwoba, away: pred.away_lineup_xwoba },
    lineup_barrel_pct: { home: pred.home_lineup_barrel_pct, away: pred.away_lineup_barrel_pct },
    elo: { home: pred.home_elo, away: pred.away_elo },
    homeParkPf: MLB_TEAMS[home].parkPf,
    homeWinProb,
  };
  const waterfallBars = computeMlbWaterfall({ ...waterfallInput, locale: 'en' });

  // cycle 2461(KO)/cycle 2467(EN parity) — 팩터 수렴 픽 배지. KO page.tsx 와 동일 게이팅
  // 로직(6팩터만 유효, DEFAULT_WEIGHTS/judge verdict 대응 개념 없음).
  const convergenceDuel = computeMlbCompositeDuel({
    homeCode: home,
    homeLineupWoba: pred.home_lineup_woba,
    awayLineupWoba: pred.away_lineup_woba,
    homeBullpenFip: pred.home_bullpen_fip,
    awayBullpenFip: pred.away_bullpen_fip,
    homeSPFip: pred.home_sp_fip,
    awaySPFip: pred.away_sp_fip,
    homeSPXfip: pred.home_sp_xfip,
    awaySPXfip: pred.away_sp_xfip,
    homeWar: pred.home_war_total,
    awayWar: pred.away_war_total,
  });
  const isConvergencePick =
    convergenceDuel.validCount >= MLB_COMPOSITE_DUEL_MIN_VALID &&
    Math.abs(convergenceDuel.netScore) >= MLB_FACTOR_PICK_STRONG;
  const convergenceRecord = isConvergencePick
    ? await getMlbRecentConvergencePickRecord(MLB_FACTOR_PICK_STRONG)
    : { wins: 0, losses: 0, total: 0 };

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventLd) }}
      />
      <Breadcrumb items={[
        { label: 'MLB Analysis', href: '/en/mlb' },
        { label: date, href: `/en/mlb/games/${date}` },
        { label: `${home} vs ${away}` },
      ]} locale="en" />

      <h1 className="text-2xl md:text-3xl font-bold text-brand-700 dark:text-brand-100">
        {home} vs {away}
      </h1>

      {/* cycle 2457 explore-idea — KO page.tsx 와 동일 (parity) */}
      {(schedule.away_starter_name || schedule.home_starter_name) && (
        <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
          SP{' '}
          <span className="text-gray-600 dark:text-gray-300">
            {schedule.away_starter_name ?? 'TBD'}
          </span>
          {' vs '}
          <span className="text-gray-600 dark:text-gray-300">
            {schedule.home_starter_name ?? 'TBD'}
          </span>
        </p>
      )}

      <section className="rounded-lg bg-brand-50 dark:bg-brand-900 p-5">
        <div className="text-3xl font-bold text-brand-700 dark:text-brand-100">
          {winnerCode} {conf}%
        </div>
        {schedule.status === 'final' && schedule.home_score != null && schedule.away_score != null && (
          <p className="mt-2 text-sm text-brand-600 dark:text-brand-300 font-mono">
            Final: {away} {schedule.away_score} - {schedule.home_score} {home}
          </p>
        )}
      </section>

      <MlbGameOverview
        homeTeam={home}
        awayTeam={away}
        homeWinProb={homeWinProb}
        bars={waterfallBars}
        factorCount={GAME_DETAIL_FACTOR_ROWS.length}
        locale="en"
      />

      {/* cycle 2461(KO)/cycle 2467(EN parity) — factor convergence pick badge */}
      {isConvergencePick && (() => {
        const favoredHome = convergenceDuel.netScore > 0;
        const hw = convergenceDuel.homeWins;
        const aw = convergenceDuel.awayWins;
        const favoredName = mlbShortTeamName(favoredHome ? home : away);
        const ratio = favoredHome ? `${hw}:${aw}` : `${aw}:${hw}`;
        const convStrength = Math.abs(convergenceDuel.netScore);
        const favoredSlugs = favoredHome ? convergenceDuel.homeFavoredSlugs : convergenceDuel.awayFavoredSlugs;
        const opponentSlugs = favoredHome ? convergenceDuel.awayFavoredSlugs : convergenceDuel.homeFavoredSlugs;
        const isComplete = convStrength >= MLB_FACTOR_PICK_COMPLETE;
        const badgeClass = isComplete
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-300'
          : 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800/50 text-brand-700 dark:text-brand-300';
        const tierChipClass = isComplete
          ? 'bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300'
          : 'bg-brand-100 dark:bg-brand-800/40 text-brand-700 dark:text-brand-300';
        return (
          <div className={`rounded-lg border px-4 py-2.5 text-sm ${badgeClass}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs uppercase tracking-wide opacity-70">Factor Convergence Pick</span>
              <span className={`inline-block text-xs px-1.5 py-0 rounded font-semibold ${tierChipClass}`}>
                {isComplete ? 'Full Convergence' : 'Strong Convergence'}
              </span>
              <span className="font-semibold">{favoredName} favored</span>
              <span className="font-mono text-xs">{ratio}</span>
              {favoredSlugs.map((slugKey) => {
                const chipLabel = EN_FACTOR_LABELS_SHORT[slugKey];
                if (!chipLabel) return null;
                const chipClass = isComplete
                  ? 'bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-700/50'
                  : 'bg-brand-100 dark:bg-brand-800/40 text-brand-700 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-700/50';
                return (
                  <Link
                    key={slugKey}
                    href={`/en/mlb/factors#${slugKey}`}
                    className={`inline-block text-xs px-1.5 py-0.5 rounded transition-colors ${chipClass}`}
                  >
                    {chipLabel}
                  </Link>
                );
              })}
            </div>
            {!isComplete && opponentSlugs.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {opponentSlugs.map((slugKey) => {
                  const chipLabel = EN_FACTOR_LABELS_SHORT[slugKey];
                  if (!chipLabel) return null;
                  return (
                    <Link
                      key={slugKey}
                      href={`/en/mlb/factors#${slugKey}`}
                      className="inline-block text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/60 transition-colors"
                    >
                      {chipLabel}
                    </Link>
                  );
                })}
              </div>
            )}
            {convergenceRecord.total > 0 && (
              <p
                className="mt-1.5 text-[11px] tabular-nums opacity-60"
                title={`Last ${convergenceRecord.total} games factor convergence pick record`}
              >
                Last {convergenceRecord.total} games: {convergenceRecord.wins}W-{convergenceRecord.losses}L{' '}
                ({computeWinRatePct(convergenceRecord.wins, convergenceRecord.total)}%)
              </p>
            )}
          </div>
        );
      })()}

      {!isConvergencePick && convergenceDuel.validCount >= MLB_COMPOSITE_DUEL_MIN_VALID && (() => {
        const favoredHome = convergenceDuel.netScore > 0;
        const isTied = convergenceDuel.netScore === 0;
        const hw = convergenceDuel.homeWins;
        const aw = convergenceDuel.awayWins;
        const favoredName = isTied ? null : mlbShortTeamName(favoredHome ? home : away);
        const ratio = favoredHome ? `${hw}:${aw}` : `${aw}:${hw}`;
        const favoredSlugs = isTied
          ? []
          : (favoredHome ? convergenceDuel.homeFavoredSlugs : convergenceDuel.awayFavoredSlugs)
              .slice(0, COMPOSITE_DUEL_FACTOR_LABEL_LIMIT);
        const factorInline = favoredSlugs.map((s) => EN_FACTOR_LABELS_SHORT[s] ?? s).join('·');
        return (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/30 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs uppercase tracking-wide opacity-70">Factor Balance</span>
              {favoredName ? (
                <span className="font-semibold text-gray-700 dark:text-gray-300">{favoredName} favored</span>
              ) : (
                <span className="font-semibold text-gray-700 dark:text-gray-300">Even</span>
              )}
              <span className="font-mono text-xs">Factors {ratio}</span>
              {factorInline && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500">({factorInline})</span>
              )}
            </div>
          </div>
        );
      })()}

      <MlbDetailedFactorAnalysis
        homeTeam={home}
        awayTeam={away}
        bars={waterfallBars}
        values={waterfallInput}
        locale="en"
      />

      <MlbFactorWaterfallChart
        homeTeam={home}
        awayTeam={away}
        input={waterfallInput}
        locale="en"
      />

      <MlbRivalryMemorySurface
        homeTeam={home}
        awayTeam={away}
        asOfDate={date}
        locale="en"
      />

      <MlbHistoricalAnalogMatchup
        homeTeam={home}
        awayTeam={away}
        externalGameId={schedule.external_game_id}
        asOfDate={date}
        locale="en"
      />

      <footer className="border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <ShareButtons
          url={pageUrl}
          title={`${awayFullName} vs ${homeFullName} MLB AI prediction analysis`}
          text={`${date} ${awayFullName} vs ${homeFullName} sabermetrics-based AI analysis`}
          isEn
        />
      </footer>

      {(() => {
        const pair = mlbCanonicalPair(home, away);
        const items: RelatedLink[] = [
          { href: `/en/mlb/team/${home}`, label: `${homeFullName} team profile`, hint: 'Season stats' },
          { href: `/en/mlb/team/${away}`, label: `${awayFullName} team profile`, hint: 'Season stats' },
          ...(pair ? [{ href: `/en${pair.path}`, label: `${mlbShortTeamName(away)} vs ${mlbShortTeamName(home)} matchup`, hint: 'Factor compare + head-to-head' }] : []),
          { href: `/en/mlb/games/${date}`, label: `All games on ${date}`, hint: 'Other games same date' },
        ];
        return <RelatedLinks title="Related pages" items={items} />;
      })()}
    </main>
  );
}
