import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { createClient } from "@/lib/supabase/server";
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
import { MetricRegistry, type MetricSlug, MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

interface PageParams {
  params: Promise<{ date: string; slug: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { date, slug } = await params;
  const title = `${slug} ${date} 분석 | MoneyBall Score`;
  const description = `${slug} ${MLB_FACTOR_COUNTS.total}팩터 + Statcast ${MLB_FACTOR_COUNTS.statcast} + waterfall`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/mlb/games/${date}/${slug}`,
      languages: { 'en': `${SITE_URL}/en/mlb/games/${date}/${slug}`, 'ko': `${SITE_URL}/mlb/games/${date}/${slug}` },
    },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: "MoneyBall Score",
      title,
      description,
      url: `${SITE_URL}/mlb/games/${date}/${slug}`,
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
  home_bullpen_fip: number | null;
  away_bullpen_fip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
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

const MLB_EVENT_STATUS: Record<string, string> = {
  postponed: 'https://schema.org/EventPostponed',
  final: 'https://schema.org/EventCompleted',
  in_progress: 'https://schema.org/EventScheduled',
  scheduled: 'https://schema.org/EventScheduled',
};

export default async function GameDetail({ params }: PageParams) {
  const { date, slug } = await params;
  const [homeParam, awayParam] = slug.split('-vs-');
  if (!homeParam || !awayParam) notFound();

  // slug 는 canonical(Baseball-Reference) 코드 — mlb_schedule 은 StatsAPI 원본 컨벤션 저장
  // (7팀 alias, 사례 27). 정규화 없이 조회하면 그 7팀은 항상 미스매치로 silent 404.
  const homeCode = normalizeMlbTeamCode(homeParam) ?? (homeParam as MlbTeamCode);
  const awayCode = normalizeMlbTeamCode(awayParam) ?? (awayParam as MlbTeamCode);
  const dbHomeCode = toMlbStatsApiCode(homeCode);
  const dbAwayCode = toMlbStatsApiCode(awayCode);

  const supabase = await createClient();

  // MLB 경기는 games(KBO FK 스키마) 에 존재하지 않음 — mlb_schedule(팀 코드 string)
  // + predictions(external_game_id, league='mlb') 조인으로만 조회 가능 (migration 038).
  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, home_score, away_score, status, game_datetime_utc')
    .eq('game_date', date)
    .eq('home_team_code', dbHomeCode)
    .eq('away_team_code', dbAwayCode)
    .maybeSingle();
  const { data: scheduleRaw } = assertSelectOk(scheduleResult, 'MlbGameDetail schedule');
  const schedule = scheduleRaw as ScheduleRow | null;

  if (!schedule) notFound();

  const predResult = await supabase
    .from('predictions')
    .select(`
      external_game_id,
      home_win_prob,
      home_sp_fip,
      away_sp_fip,
      home_bullpen_fip,
      away_bullpen_fip,
      home_lineup_woba,
      away_lineup_woba,
      home_lineup_xwoba,
      away_lineup_xwoba,
      home_lineup_barrel_pct,
      away_lineup_barrel_pct
    `)
    .eq('league', 'mlb')
    .eq('scoring_rule', MLB_SCORING_RULE)
    .eq('external_game_id', schedule.external_game_id)
    .maybeSingle();
  const { data: predRaw } = assertSelectOk(predResult, 'MlbGameDetail prediction');
  const pred = predRaw as PredictionDetailRow | null;

  if (!pred) notFound();

  // predicted_winner 컬럼은 KBO 전용 FK(INT REFERENCES teams(id)) — MLB 는 항상 NULL.
  // 승자는 home_win_prob 로 derive (pipeline 이 실제 저장하는 유일한 확률 값).
  const home = homeCode;
  const away = awayCode;
  const homeWinProb = pred.home_win_prob ?? 0.5;
  const winnerCode = mlbShortTeamName(homeWinProb >= 0.5 ? home : away);
  const conf = Math.round((homeWinProb >= 0.5 ? homeWinProb : 1 - homeWinProb) * 100);

  // SportsEvent 스키마 — KBO analysis/game/[id] 패턴 parity (Google 스포츠 리치 결과 후보).
  const homeFullName = MLB_TEAMS[home].name;
  const awayFullName = MLB_TEAMS[away].name;
  const pageUrl = `${SITE_URL}/mlb/games/${date}/${slug}`;
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

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventLd) }}
      />
      <Breadcrumb items={[
        { label: 'MLB 분석', href: '/mlb' },
        { label: date, href: `/mlb/games/${date}` },
        { label: `${home} vs ${away}` },
      ]} />

      <h1 className="text-2xl md:text-3xl font-bold text-brand-700 dark:text-brand-100">
        {home} vs {away}
      </h1>

      <section className="rounded-lg bg-brand-50 dark:bg-brand-900 p-5">
        <div className="text-3xl font-bold text-brand-700 dark:text-brand-100">
          {winnerCode} {conf}%
        </div>
        {schedule.status === 'final' && schedule.home_score != null && schedule.away_score != null && (
          <p className="mt-2 text-sm text-brand-600 dark:text-brand-300 font-mono">
            최종: {away} {schedule.away_score} - {schedule.home_score} {home}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3 text-brand-700 dark:text-brand-100">{MLB_FACTOR_COUNTS.total} factor breakdown</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <FactorRow slug="sp_fip" home={pred.home_sp_fip} away={pred.away_sp_fip} />
          <FactorRow slug="bullpen_fip" home={pred.home_bullpen_fip} away={pred.away_bullpen_fip} />
          <FactorRow slug="lineup_woba" home={pred.home_lineup_woba} away={pred.away_lineup_woba} />
          <FactorRow label="타선 xwOBA" home={pred.home_lineup_xwoba} away={pred.away_lineup_xwoba} />
          <FactorRow label="Barrel%" home={pred.home_lineup_barrel_pct} away={pred.away_lineup_barrel_pct} />
        </dl>
      </section>
    </main>
  );
}

function FactorRow({
  slug,
  label,
  home,
  away,
}: {
  slug?: MetricSlug;
  label?: string;
  home: number | null;
  away: number | null;
}) {
  const resolved = slug ? MetricRegistry[slug].ko_name : label;
  return (
    <div className="border border-brand-200 dark:border-brand-800 rounded p-3">
      <dt className="text-xs text-brand-500 dark:text-brand-400">{resolved}</dt>
      <dd className="font-mono mt-1 text-brand-700 dark:text-brand-100">{home ?? '—'} / {away ?? '—'}</dd>
    </div>
  );
}
