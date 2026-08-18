import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MlbFactorWaterfallChart } from "@/components/predictions/MlbFactorWaterfallChart";
import { MlbGameOverview } from "@/components/predictions/MlbGameOverview";
import { MlbHistoricalAnalogMatchup } from "@/components/predictions/MlbHistoricalAnalogMatchup";
import { MlbRivalryMemorySurface } from "@/components/predictions/MlbRivalryMemorySurface";
import { ShareButtons } from "@/components/share/ShareButtons";
import { RelatedLinks, type RelatedLink } from "@/components/shared/RelatedLinks";
import { mlbCanonicalPair } from "@/lib/mlb/mlbCanonicalPair";
import { createClient } from "@/lib/supabase/server";
import { computeMlbWaterfall, type MlbWaterfallInput } from "@moneyball/kbo-data";
import {
  assertSelectOk,
  SITE_URL,
  MLB_SCORING_RULE,
  normalizeMlbTeamCode,
  toMlbStatsApiCode,
  mlbShortTeamName,
  MLB_TEAMS,
  type MlbTeamCode,
} from "@moneyball/shared";

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
}

interface ScheduleRow {
  external_game_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  game_datetime_utc: string;
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
    .select('external_game_id, home_score, away_score, status, game_datetime_utc')
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
      away_lineup_barrel_pct
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
    lineup_xwoba: { home: pred.home_lineup_xwoba, away: pred.away_lineup_xwoba },
    lineup_barrel_pct: { home: pred.home_lineup_barrel_pct, away: pred.away_lineup_barrel_pct },
    homeParkPf: MLB_TEAMS[home].parkPf,
    homeWinProb,
  };
  const waterfallBars = computeMlbWaterfall({ ...waterfallInput, locale: 'en' });

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

      <section>
        <h2 className="text-lg font-bold mb-3 text-brand-700 dark:text-brand-100">{GAME_DETAIL_FACTOR_ROWS.length} Factor Breakdown</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {GAME_DETAIL_FACTOR_ROWS.map((row) => (
            <FactorRow
              key={row.homeKey}
              label={row.label}
              home={pred[row.homeKey] as number | null}
              away={pred[row.awayKey] as number | null}
            />
          ))}
        </dl>
      </section>

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

function FactorRow({ label, home, away }: { label: string; home: number | null; away: number | null }) {
  return (
    <div className="border border-brand-200 dark:border-brand-800 rounded p-3">
      <dt className="text-xs text-brand-500 dark:text-brand-400">{label}</dt>
      <dd className="font-mono mt-1 text-brand-700 dark:text-brand-100">{home ?? '—'} / {away ?? '—'}</dd>
    </div>
  );
}
