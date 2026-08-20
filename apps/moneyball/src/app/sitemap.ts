import type { MetadataRoute } from 'next';
import * as Sentry from "@sentry/nextjs";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getRecentWeeks } from '@/lib/reviews/computeWeekRange';
import { getRecentMonths } from '@/lib/reviews/computeMonthRange';
import { allPairs } from '@/lib/matchup/canonicalPair';
import { mlbAllPairs } from '@/lib/mlb/mlbCanonicalPair';
import { listInsightsDates } from '@/lib/insights/loader';
import { listSeriesTopics } from '@/lib/insights/series';
import { listArchiveDates } from '@/lib/lotto/archive';
import { KBO_TEAMS, MLB_TEAMS, SITE_URL, assertSelectOk, errMsg, MLB_SCORING_RULE, normalizeMlbTeamCode } from '@moneyball/shared';

// Google Search Console "유형: 알수없음 / 상태: 가져올수없음" 대응.
//
// 원인 확정: 기존 `createClient` (lib/supabase/server) 는 `await cookies()` 호출 →
// Next.js 가 Request-time API 로 인식하여 route 를 dynamic 으로 강제 →
// `export const revalidate` 가 무력화 → 매 요청마다 Supabase 쿼리 실행 →
// Googlebot 첫 접촉 시 cold start + 쿼리 합산해서 timeout.
//
// 해결: sitemap 은 public 조회만 하니 cookie 의존 없는 anon client 를 inline 으로
// 생성해 route 가 **static** 으로 prerender 되도록 함. `SITEMAP_ISR_SECONDS` 가 이때
// 비로소 유효. 빌드 시점 1회 생성 + 6시간 ISR. warmup cron 은 ISR miss 시 즉시
// 재생성 트리거.

export const revalidate = 21600; // SITEMAP_ISR_SECONDS (Next.js 16 Turbopack: literal required)

function createSitemapClient() {
  // cookie-free, no session — sitemap 전용. RLS 통과하는 public 데이터만 읽음.
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/predictions`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/calendar`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/analysis`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/reviews`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/dashboard`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/accuracy`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/changelog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    // /v2-shadow-monitor — v1.8 유지 확정(2026-07-06) 이후 결론된 실험 archive. noindex 처리 + sitemap 제거 (cycle 1802 IA).
    { url: `${SITE_URL}/insights`, lastModified: now, changeFrequency: 'daily', priority: 0.75 },
    { url: `${SITE_URL}/glossary`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    // /reviews/weekly /reviews/monthly = redirect-only 페이지 (즉시 /reviews/(weekly|monthly)/{currentId} 로 308).
    // sitemap 에 두면 redirect chain → 중복 URL 인덱싱. dynamic block (weeklyReviewRoutes / monthlyReviewRoutes) 이 실제 컨텐츠 URL 커버.
    { url: `${SITE_URL}/reviews/misses`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/players`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/teams`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/matchup`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/standings`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/mlb`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/mlb/analysis`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/mlb/team`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/mlb/matchup`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/mlb/standings`, lastModified: now, changeFrequency: 'daily', priority: 0.75 },
    { url: `${SITE_URL}/mlb/players`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${SITE_URL}/mlb/factors`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/mlb/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/mlb/wild-card`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/mlb/postseason`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/mlb/calendar`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/mlb/accuracy`, lastModified: now, changeFrequency: 'daily', priority: 0.75 },
    { url: `${SITE_URL}/mlb/predictions`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/mlb/reviews`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/mlb/reviews/misses`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    // /mlb/reviews/weekly = redirect-only 페이지 (즉시 /mlb/reviews/weekly/{currentWeekId} 로
    // 308, /reviews/weekly 와 동일 사유) — dynamic block (mlbWeeklyReviewRoutes) 이 실제
    // 컨텐츠 URL 커버 (plan #26 Phase 1b).
    // /mlb/reviews/monthly = 동일 사유 redirect-only 페이지 (mlbMonthlyReviewRoutes, plan #26 Phase 2).
    // /en/mlb/* English mirror static routes
    { url: `${SITE_URL}/en/mlb`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/en/mlb/team`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${SITE_URL}/en/mlb/matchup`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${SITE_URL}/en/mlb/standings`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/en/mlb/players`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/en/mlb/factors`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${SITE_URL}/en/mlb/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.55 },
    { url: `${SITE_URL}/en/mlb/wild-card`, lastModified: now, changeFrequency: 'daily', priority: 0.65 },
    { url: `${SITE_URL}/en/mlb/postseason`, lastModified: now, changeFrequency: 'daily', priority: 0.65 },
    { url: `${SITE_URL}/en/mlb/calendar`, lastModified: now, changeFrequency: 'daily', priority: 0.65 },
    { url: `${SITE_URL}/en/mlb/accuracy`, lastModified: now, changeFrequency: 'daily', priority: 0.65 },
    { url: `${SITE_URL}/en/mlb/predictions`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/en/mlb/analysis`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/en/mlb/reviews`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/en/mlb/reviews/misses`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/seasons`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/picks`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    // /lotto hub — weekly 갱신.
    { url: `${SITE_URL}/lotto`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    // /lotto/methodology — 통계 분석 방법론. /lotto/archive/[date] 는 lottoArchiveRoutes (아래) 가 동적 URL 추가.
    // AdSense crawler 는 robots.ts 차단.
    { url: `${SITE_URL}/lotto/methodology`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    // /lotto/archive — 회차 list index page. lottoArchiveRoutes 동적 URL 와
    // 별도 layer (index page 자체).
    { url: `${SITE_URL}/lotto/archive`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    // /lotto/check — 조합 검증 페이지 (cycle 2250 IA: /lotto hub 에서 링크되고 canonical 도 있지만 sitemap 누락 발견/수정).
    { url: `${SITE_URL}/lotto/check`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
  ];

  // 시즌별 URL (generateStaticParams 에서 2023~2026 정적 생성)
  // priority: 현재 시즌 0.8 / 직전 시즌 (currentYear-1) 0.7 (recent) / 그 외 0.65 (ancient)
  const currentYear = now.getFullYear();
  const seasonYearRoutes: MetadataRoute.Sitemap = [2023, 2024, 2025, 2026].map((year) => {
    const isCurrent = year === currentYear;
    const isRecent = year === currentYear - 1;
    return {
      url: `${SITE_URL}/seasons/${year}`,
      lastModified: now,
      changeFrequency: (isCurrent ? 'daily' : 'monthly') as 'daily' | 'monthly',
      priority: isCurrent ? 0.8 : isRecent ? 0.7 : 0.65,
    };
  });

  // 45개 canonical 팀 매치업 URL
  const matchupRoutes: MetadataRoute.Sitemap = allPairs().map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.65,
  }));

  // KBO 팀 프로필 URL (KBO_TEAM_COUNT)
  const teamProfileRoutes: MetadataRoute.Sitemap = Object.keys(KBO_TEAMS).map(
    (code) => ({
      url: `${SITE_URL}/teams/${code}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.65,
    }),
  );

  // KBO 팀별 최근 N경기 URL (KBO_TEAM_COUNT) — /teams/[code]/recent
  const teamRecentRoutes: MetadataRoute.Sitemap = Object.keys(KBO_TEAMS).map(
    (code) => ({
      url: `${SITE_URL}/teams/${code}/recent`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }),
  );

  // MLB 팀 프로필 URL (MLB_TEAM_COUNT)
  const mlbTeamProfileRoutes: MetadataRoute.Sitemap = Object.keys(MLB_TEAMS).map(
    (code) => ({
      url: `${SITE_URL}/mlb/team/${code}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }),
  );

  // MLB 팀 Statcast deep-dive URL (MLB_TEAM_COUNT)
  const mlbPlayersDetailRoutes: MetadataRoute.Sitemap = Object.keys(MLB_TEAMS).map(
    (code) => ({
      url: `${SITE_URL}/mlb/players/${code}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.55,
    }),
  );

  // /en/mlb/team/[code] English mirror (MLB_TEAM_COUNT)
  const enMlbTeamProfileRoutes: MetadataRoute.Sitemap = Object.keys(MLB_TEAMS).map(
    (code) => ({
      url: `${SITE_URL}/en/mlb/team/${code}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.55,
    }),
  );

  // MLB 435개 canonical 팀 매치업 URL (30 choose 2) — plan #24 Phase 3b 라우트, sitemap 미반영 gap (cycle 2069 info-arch)
  const mlbMatchupRoutes: MetadataRoute.Sitemap = mlbAllPairs().map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  // /en/mlb/matchup/[teamA]/[teamB] English mirror (435 pairs)
  const enMlbMatchupRoutes: MetadataRoute.Sitemap = mlbAllPairs().map((p) => ({
    url: `${SITE_URL}/en${p.path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.45,
  }));

  // /en/mlb/players/[id] English mirror Statcast (MLB_TEAM_COUNT)
  const enMlbPlayersDetailRoutes: MetadataRoute.Sitemap = Object.keys(MLB_TEAMS).map(
    (code) => ({
      url: `${SITE_URL}/en/mlb/players/${code}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    }),
  );

  // 최근 12주 주간 리뷰 URL
  const weeklyReviewRoutes: MetadataRoute.Sitemap = getRecentWeeks(12).map(
    (w) => ({
      url: `${SITE_URL}/reviews/weekly/${w.weekId}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }),
  );

  // 최근 6개월 월간 리뷰 URL
  const monthlyReviewRoutes: MetadataRoute.Sitemap = getRecentMonths(6).map(
    (m) => ({
      url: `${SITE_URL}/reviews/monthly/${m.monthId}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    }),
  );

  // 최근 12주 MLB 주간 리뷰 URL (weeklyReviewRoutes(KBO) 대응, plan #26 Phase 1b)
  const mlbWeeklyReviewRoutes: MetadataRoute.Sitemap = getRecentWeeks(12).map(
    (w) => ({
      url: `${SITE_URL}/mlb/reviews/weekly/${w.weekId}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.65,
    }),
  );

  // 최근 6개월 MLB 월간 리뷰 URL (monthlyReviewRoutes(KBO) 대응, plan #26 Phase 2)
  const mlbMonthlyReviewRoutes: MetadataRoute.Sitemap = getRecentMonths(6).map(
    (m) => ({
      url: `${SITE_URL}/mlb/reviews/monthly/${m.monthId}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.65,
    }),
  );

  // 모든 past + 오늘 경기 /analysis/game/[id] URL + 일자별 /predictions/[date]
  // + 등판 기록 있는 모든 선발 투수 /players/[id] URL
  const analysisRoutes: MetadataRoute.Sitemap = [];
  const predictionDateRoutes: MetadataRoute.Sitemap = [];
  const playerRoutes: MetadataRoute.Sitemap = [];
  const insightsDateRoutes: MetadataRoute.Sitemap = [];

  try {
    const insightsDates = await listInsightsDates(90);
    for (const d of insightsDates) {
      insightsDateRoutes.push({
        url: `${SITE_URL}/insights/${d}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } catch (e) {
    console.warn('[sitemap] insights dates query failed:', errMsg(e));
    Sentry.captureException(e, { tags: { silent_drift_family: 'wave_174', component: 'sitemap', op: 'insights-dates-query' } });
  }

  try {
    const supabase = createSitemapClient();
    // limit 5000 → 2500 (2023-2026 실제 ~1200 경기 + 여유). 선택 필드도 5개만.
    // home_sp_id / away_sp_id 추가 — distinct 모아서 /players/[id] 동적 생성.
    const result = await supabase
      .from('games')
      .select('id, game_date, updated_at, home_sp_id, away_sp_id')
      .order('game_date', { ascending: false })
      .limit(2500);
    const { data: games } = assertSelectOk(result, 'sitemap.games');

    if (games) {
      const seenDates = new Set<string>();
      const seenPlayers = new Set<number>();
      for (const g of games) {
        analysisRoutes.push({
          url: `${SITE_URL}/analysis/game/${g.id}`,
          lastModified: g.updated_at ? new Date(g.updated_at) : now,
          changeFrequency: 'weekly',
          priority: 0.75,
        });

        if (g.game_date && !seenDates.has(g.game_date)) {
          seenDates.add(g.game_date);
          predictionDateRoutes.push({
            url: `${SITE_URL}/predictions/${g.game_date}`,
            lastModified: g.updated_at ? new Date(g.updated_at) : now,
            changeFrequency: 'weekly',
            priority: 0.75,
          });
        }

        // 선발 투수 ID 수집 — home/away 양쪽. /players/[id] 는 numeric player_id.
        for (const spId of [g.home_sp_id, g.away_sp_id]) {
          if (typeof spId === 'number' && spId > 0 && !seenPlayers.has(spId)) {
            seenPlayers.add(spId);
            playerRoutes.push({
              url: `${SITE_URL}/players/${spId}`,
              lastModified: g.updated_at ? new Date(g.updated_at) : now,
              changeFrequency: 'weekly',
              priority: 0.6,
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('[sitemap] games query failed, serving static routes only:', errMsg(e));
    Sentry.captureException(e, { tags: { silent_drift_family: 'wave_174', component: 'sitemap', op: 'games-query' } });
  }

  // /mlb/games/[date] 날짜 색인 + /mlb/games/[date]/[slug] 개별 경기 상세 —
  // KBO analysisRoutes(/analysis/game/[id]) parity gap (cycle 2100 info-arch,
  // 개별 경기 페이지 자체는 cycle 2098/2099 이미 shipped 됐으나 sitemap 미반영이었음).
  // predictions(league='mlb') 먼저 조회 후 mlb_schedule 조인 — schedule 만 있고
  // prediction 없는 (미래 예정) 경기는 상세 페이지가 notFound() 라 sitemap 제외.
  const mlbGameDateRoutes: MetadataRoute.Sitemap = [];
  const mlbGameDetailRoutes: MetadataRoute.Sitemap = [];
  const enMlbGameDateRoutes: MetadataRoute.Sitemap = [];
  const enMlbGameDetailRoutes: MetadataRoute.Sitemap = [];

  try {
    const mlbSupabase = createSitemapClient();
    const mlbPredResult = await mlbSupabase
      .from('predictions')
      .select('external_game_id')
      .eq('league', 'mlb')
      .eq('scoring_rule', MLB_SCORING_RULE)
      .limit(3000);
    const { data: mlbPreds } = assertSelectOk(mlbPredResult, 'sitemap.mlb-predictions');
    const mlbGameIds = (mlbPreds ?? []).map((p) => p.external_game_id);

    if (mlbGameIds.length > 0) {
      const mlbScheduleResult = await mlbSupabase
        .from('mlb_schedule')
        .select('game_date, home_team_code, away_team_code, updated_at')
        .in('external_game_id', mlbGameIds)
        .limit(3000);
      const { data: mlbGames } = assertSelectOk(mlbScheduleResult, 'sitemap.mlb-schedule');

      const seenMlbDates = new Set<string>();
      for (const g of mlbGames ?? []) {
        const homeCode = normalizeMlbTeamCode(g.home_team_code);
        const awayCode = normalizeMlbTeamCode(g.away_team_code);
        if (!homeCode || !awayCode) continue;

        const lastMod = g.updated_at ? new Date(g.updated_at) : now;

        if (!seenMlbDates.has(g.game_date)) {
          seenMlbDates.add(g.game_date);
          mlbGameDateRoutes.push({ url: `${SITE_URL}/mlb/games/${g.game_date}`, lastModified: lastMod, changeFrequency: 'daily', priority: 0.6 });
          enMlbGameDateRoutes.push({ url: `${SITE_URL}/en/mlb/games/${g.game_date}`, lastModified: lastMod, changeFrequency: 'daily', priority: 0.55 });
        }

        const slug = `${homeCode}-vs-${awayCode}`;
        mlbGameDetailRoutes.push({ url: `${SITE_URL}/mlb/games/${g.game_date}/${slug}`, lastModified: lastMod, changeFrequency: 'weekly', priority: 0.65 });
        enMlbGameDetailRoutes.push({ url: `${SITE_URL}/en/mlb/games/${g.game_date}/${slug}`, lastModified: lastMod, changeFrequency: 'weekly', priority: 0.6 });
      }
    }
  } catch (e) {
    console.warn('[sitemap] mlb games query failed:', errMsg(e));
    Sentry.captureException(e, { tags: { silent_drift_family: 'wave_624', component: 'sitemap', op: 'mlb-games-query' } });
  }

  // /lotto/archive/[date] 동적 URL — data/lotto-picks/ glob → 회차별 archive 색인 활성.
  // priority 0.6 weekly + lastModified = 추첨일 20:45 KST (KBO 추첨 시각).
  const lottoArchiveRoutes: MetadataRoute.Sitemap = listArchiveDates().map(
    (date) => ({
      url: `${SITE_URL}/lotto/archive/${date}`,
      lastModified: new Date(`${date}T20:45:00+09:00`),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }),
  );

  // /insights/series/[topic] — 45 team-pair canonical slug (W-SEO, 2026-05-28).
  // 정적 generateStaticParams 와 정확히 매칭. priority 0.55 weekly.
  const insightsSeriesRoutes: MetadataRoute.Sitemap = listSeriesTopics().map(
    (topic) => ({
      url: `${SITE_URL}/insights/series/${topic.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.55,
    }),
  );

  return [
    ...staticRoutes,
    ...seasonYearRoutes,
    ...weeklyReviewRoutes,
    ...monthlyReviewRoutes,
    ...mlbWeeklyReviewRoutes,
    ...mlbMonthlyReviewRoutes,
    ...teamProfileRoutes,
    ...teamRecentRoutes,
    ...mlbTeamProfileRoutes,
    ...mlbPlayersDetailRoutes,
    ...enMlbTeamProfileRoutes,
    ...enMlbPlayersDetailRoutes,
    ...matchupRoutes,
    ...mlbMatchupRoutes,
    ...enMlbMatchupRoutes,
    ...predictionDateRoutes,
    ...playerRoutes,
    ...analysisRoutes,
    ...mlbGameDateRoutes,
    ...mlbGameDetailRoutes,
    ...enMlbGameDateRoutes,
    ...enMlbGameDetailRoutes,
    ...insightsDateRoutes,
    ...insightsSeriesRoutes,
    ...lottoArchiveRoutes,
  ];
}
