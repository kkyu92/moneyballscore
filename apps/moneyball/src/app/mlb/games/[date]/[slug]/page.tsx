import type { Metadata } from "next";
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
import { computeMlbWaterfall, type MetricSlug, type MlbWaterfallInput } from "@moneyball/kbo-data";

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

interface PageParams {
  params: Promise<{ date: string; slug: string }>;
}

// 실제 dl breakdown 에 렌더되는 팩터만 정의 (park_factor/home_advantage/recent_form 등
// plan #25 Phase 3-gated placeholder 는 제외 — review-code heavy, cycle 2108: 이전엔
// 전체 모델 팩터 총합 상수(14)를 그대로 heading/description 에 써서 표시 숫자와
// 실제 7행 렌더 mismatch 가 있었음. cycle 2102 가 5→7행으로 늘렸지만 카운트 클레임
// 자체는 안 고쳐 재발 — 배열 길이로 self-sync 시켜 재재발 차단).
const GAME_DETAIL_FACTOR_ROWS: Array<{
  slug?: MetricSlug;
  label?: string;
  homeKey: keyof PredictionDetailRow;
  awayKey: keyof PredictionDetailRow;
  statcast?: boolean;
}> = [
  { slug: 'sp_fip', homeKey: 'home_sp_fip', awayKey: 'away_sp_fip' },
  { slug: 'sp_xfip', homeKey: 'home_sp_xfip', awayKey: 'away_sp_xfip' },
  { slug: 'bullpen_fip', homeKey: 'home_bullpen_fip', awayKey: 'away_bullpen_fip' },
  { slug: 'lineup_woba', homeKey: 'home_lineup_woba', awayKey: 'away_lineup_woba' },
  { slug: 'war', homeKey: 'home_war_total', awayKey: 'away_war_total' },
  { slug: 'recent_form', homeKey: 'home_recent_form', awayKey: 'away_recent_form' },
  // head_to_head_rate 는 DB 단일 컬럼(homeWinRate) — 이 배열은 length 로만 카운트되고
  // homeKey/awayKey 실값 자체는 소비 안 함(팩터-상세 표는 buildMlbFactorDetailRows 가
  // waterfallInput 에서 별도로 pair 인코딩해 렌더, mlb-waterfall.ts 참조).
  { slug: 'head_to_head', homeKey: 'head_to_head_rate', awayKey: 'head_to_head_rate' },
  { slug: 'elo', homeKey: 'home_elo', awayKey: 'away_elo' },
  { label: '타선 xwOBA', homeKey: 'home_lineup_xwoba', awayKey: 'away_lineup_xwoba', statcast: true },
  { label: 'Barrel%', homeKey: 'home_lineup_barrel_pct', awayKey: 'away_lineup_barrel_pct', statcast: true },
];
const GAME_DETAIL_STATCAST_COUNT = GAME_DETAIL_FACTOR_ROWS.filter((r) => r.statcast).length;

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { date, slug } = await params;
  const title = `${slug} ${date} 분석 | MoneyBall Score`;
  const description = `${slug} ${GAME_DETAIL_FACTOR_ROWS.length}팩터 (Statcast ${GAME_DETAIL_STATCAST_COUNT}) + waterfall`;
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

  // waterfall bar 1회 계산 (server) — MlbGameOverview prose + MlbFactorWaterfallChart(client)
  // 양쪽이 동일 input 소비. computeMlbWaterfall 은 pure/deterministic 이라 클라이언트 재계산도
  // 항상 동일 결과(중복 계산 자체는 무해, 서버 fetch/DB 재조회 없음).
  const waterfallInput: MlbWaterfallInput = {
    sp_fip: { home: pred.home_sp_fip, away: pred.away_sp_fip },
    sp_xfip: { home: pred.home_sp_xfip, away: pred.away_sp_xfip },
    bullpen_fip: { home: pred.home_bullpen_fip, away: pred.away_bullpen_fip },
    lineup_woba: { home: pred.home_lineup_woba, away: pred.away_lineup_woba },
    war: { home: pred.home_war_total, away: pred.away_war_total },
    // head_to_head_rate 는 DB 단일 컬럼(homeWinRate) — mlb-waterfall.ts 계약대로
    // {home: rate, away: 1-rate} 대칭 pair 로 인코딩 (null 이면 양쪽 null 로 bar skip).
    recent_form: { home: pred.home_recent_form, away: pred.away_recent_form },
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
  const waterfallBars = computeMlbWaterfall(waterfallInput);

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

      <MlbGameOverview
        homeTeam={home}
        awayTeam={away}
        homeWinProb={homeWinProb}
        bars={waterfallBars}
        factorCount={GAME_DETAIL_FACTOR_ROWS.length}
      />

      <MlbDetailedFactorAnalysis
        homeTeam={home}
        awayTeam={away}
        bars={waterfallBars}
        values={waterfallInput}
      />

      <MlbFactorWaterfallChart
        homeTeam={home}
        awayTeam={away}
        input={waterfallInput}
      />

      <MlbRivalryMemorySurface
        homeTeam={home}
        awayTeam={away}
        asOfDate={date}
      />

      <MlbHistoricalAnalogMatchup
        homeTeam={home}
        awayTeam={away}
        externalGameId={schedule.external_game_id}
        asOfDate={date}
      />

      <footer className="border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <ShareButtons
          url={pageUrl}
          title={`${awayFullName} vs ${homeFullName} MLB AI 승부예측 분석`}
          text={`${date} ${awayFullName} vs ${homeFullName} 세이버메트릭스 기반 AI 분석`}
        />
      </footer>

      {(() => {
        const pair = mlbCanonicalPair(home, away);
        const items: RelatedLink[] = [
          { href: `/mlb/team/${home}`, label: `${homeFullName} 팀 프로필`, hint: '시즌 통계' },
          { href: `/mlb/team/${away}`, label: `${awayFullName} 팀 프로필`, hint: '시즌 통계' },
          ...(pair ? [{ href: pair.path, label: `${mlbShortTeamName(away)} vs ${mlbShortTeamName(home)} 매치업`, hint: '팩터 비교 + 상대전적' }] : []),
          { href: `/mlb/games/${date}`, label: `${date} 전체 경기`, hint: '같은 날짜 다른 경기' },
        ];
        return <RelatedLinks title="관련 페이지" items={items} />;
      })()}
    </main>
  );
}

