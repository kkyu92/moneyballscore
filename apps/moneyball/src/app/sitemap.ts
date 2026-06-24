import type { MetadataRoute } from 'next';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getRecentWeeks } from '@/lib/reviews/computeWeekRange';
import { getRecentMonths } from '@/lib/reviews/computeMonthRange';
import { allPairs } from '@/lib/matchup/canonicalPair';
import { listInsightsDates } from '@/lib/insights/loader';
import { listSeriesTopics } from '@/lib/insights/series';
import { listArchiveDates } from '@/lib/lotto/archive';
import { KBO_TEAMS, MLB_TEAMS, SITEMAP_ISR_SECONDS, assertSelectOk, errMsg } from '@moneyball/shared';

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

export const revalidate = 21600;

function createSitemapClient() {
  // cookie-free, no session — sitemap 전용. RLS 통과하는 public 데이터만 읽음.
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://moneyballscore.vercel.app';
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/predictions`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/calendar`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/analysis`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/reviews`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/dashboard`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/accuracy`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/changelog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/v2-shadow-monitor`, lastModified: now, changeFrequency: 'weekly', priority: 0.55 },
    { url: `${baseUrl}/insights`, lastModified: now, changeFrequency: 'daily', priority: 0.75 },
    { url: `${baseUrl}/glossary`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    // /reviews/weekly /reviews/monthly = redirect-only 페이지 (즉시 /reviews/(weekly|monthly)/{currentId} 로 308).
    // sitemap 에 두면 redirect chain → 중복 URL 인덱싱. dynamic block (weeklyReviewRoutes / monthlyReviewRoutes) 이 실제 컨텐츠 URL 커버.
    { url: `${baseUrl}/reviews/misses`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/players`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/teams`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/matchup`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/standings`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/mlb`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/mlb/team`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/mlb/standings`, lastModified: now, changeFrequency: 'daily', priority: 0.75 },
    { url: `${baseUrl}/mlb/players`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${baseUrl}/mlb/factors`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/mlb/wild-card`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/mlb/postseason`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    // /en/mlb/* English mirror static routes — Plan B Task 17 (cycle 1162)
    { url: `${baseUrl}/en/mlb`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/en/mlb/team`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${baseUrl}/en/mlb/standings`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/en/mlb/players`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/en/mlb/factors`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${baseUrl}/en/mlb/wild-card`, lastModified: now, changeFrequency: 'daily', priority: 0.65 },
    { url: `${baseUrl}/en/mlb/postseason`, lastModified: now, changeFrequency: 'daily', priority: 0.65 },
    { url: `${baseUrl}/seasons`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/picks`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    // /lotto hub — plan #7 Step C (cycle 1138). weekly 갱신.
    { url: `${baseUrl}/lotto`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    // /lotto/methodology — 통계 분석 방법론. /lotto/archive/[date] 는 plan #6 Step A (cycle 882~) 부터
    // indexable 활성 — lottoArchiveRoutes (아래) 가 동적 URL 추가. AdSense crawler 는 robots.ts 차단.
    { url: `${baseUrl}/lotto/methodology`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    // /lotto/archive — 회차 list index page (plan #6 Step B, cycle 883~). lottoArchiveRoutes 동적 URL 와
    // 별도 layer (index page 자체).
    { url: `${baseUrl}/lotto/archive`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  // 시즌별 URL (generateStaticParams 에서 2023~2026 정적 생성)
  // priority: 현재 시즌 0.8 / 직전 시즌 (currentYear-1) 0.7 (recent) / 그 외 0.65 (ancient)
  const currentYear = now.getFullYear();
  const seasonYearRoutes: MetadataRoute.Sitemap = [2023, 2024, 2025, 2026].map((year) => {
    const isCurrent = year === currentYear;
    const isRecent = year === currentYear - 1;
    return {
      url: `${baseUrl}/seasons/${year}`,
      lastModified: now,
      changeFrequency: (isCurrent ? 'daily' : 'monthly') as 'daily' | 'monthly',
      priority: isCurrent ? 0.8 : isRecent ? 0.7 : 0.65,
    };
  });

  // 45개 canonical 팀 매치업 URL
  const matchupRoutes: MetadataRoute.Sitemap = allPairs().map((p) => ({
    url: `${baseUrl}${p.path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.65,
  }));

  // 10팀 프로필 URL
  const teamProfileRoutes: MetadataRoute.Sitemap = Object.keys(KBO_TEAMS).map(
    (code) => ({
      url: `${baseUrl}/teams/${code}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.65,
    }),
  );

  // MLB 30팀 프로필 URL — Plan B Tier C+D Task 4 (cycle 1026 ship)
  const mlbTeamProfileRoutes: MetadataRoute.Sitemap = Object.keys(MLB_TEAMS).map(
    (code) => ({
      url: `${baseUrl}/mlb/team/${code}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }),
  );

  // MLB 30팀 Statcast deep-dive URL — plan #21 Step 1 (cycle 1092 ship)
  const mlbPlayersDetailRoutes: MetadataRoute.Sitemap = Object.keys(MLB_TEAMS).map(
    (code) => ({
      url: `${baseUrl}/mlb/players/${code}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.55,
    }),
  );

  // /en/mlb/team/[code] 30팀 English mirror — Plan B Task 17 (cycle 1162)
  const enMlbTeamProfileRoutes: MetadataRoute.Sitemap = Object.keys(MLB_TEAMS).map(
    (code) => ({
      url: `${baseUrl}/en/mlb/team/${code}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.55,
    }),
  );

  // /en/mlb/players/[id] 30팀 English mirror Statcast — Plan B Task 17 (cycle 1162)
  const enMlbPlayersDetailRoutes: MetadataRoute.Sitemap = Object.keys(MLB_TEAMS).map(
    (code) => ({
      url: `${baseUrl}/en/mlb/players/${code}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    }),
  );

  // 최근 12주 주간 리뷰 URL
  const weeklyReviewRoutes: MetadataRoute.Sitemap = getRecentWeeks(12).map(
    (w) => ({
      url: `${baseUrl}/reviews/weekly/${w.weekId}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }),
  );

  // 최근 6개월 월간 리뷰 URL
  const monthlyReviewRoutes: MetadataRoute.Sitemap = getRecentMonths(6).map(
    (m) => ({
      url: `${baseUrl}/reviews/monthly/${m.monthId}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
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
        url: `${baseUrl}/insights/${d}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } catch (e) {
    console.warn('[sitemap] insights dates query failed:', errMsg(e));
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
          url: `${baseUrl}/analysis/game/${g.id}`,
          lastModified: g.updated_at ? new Date(g.updated_at) : now,
          changeFrequency: 'weekly',
          priority: 0.75,
        });

        if (g.game_date && !seenDates.has(g.game_date)) {
          seenDates.add(g.game_date);
          predictionDateRoutes.push({
            url: `${baseUrl}/predictions/${g.game_date}`,
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
              url: `${baseUrl}/players/${spId}`,
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
  }

  // /lotto/archive/[date] 동적 URL — plan #6 Step A (cycle 882~). data/lotto-picks/ glob → 회차별 archive 색인 활성.
  // priority 0.6 weekly + lastModified = 추첨일 20:45 KST (KBO 추첨 시각).
  const lottoArchiveRoutes: MetadataRoute.Sitemap = listArchiveDates().map(
    (date) => ({
      url: `${baseUrl}/lotto/archive/${date}`,
      lastModified: new Date(`${date}T20:45:00+09:00`),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }),
  );

  // /insights/series/[topic] — 45 team-pair canonical slug (W-SEO, 2026-05-28).
  // 정적 generateStaticParams 와 정확히 매칭. priority 0.55 weekly.
  const insightsSeriesRoutes: MetadataRoute.Sitemap = listSeriesTopics().map(
    (topic) => ({
      url: `${baseUrl}/insights/series/${topic.slug}`,
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
    ...teamProfileRoutes,
    ...mlbTeamProfileRoutes,
    ...mlbPlayersDetailRoutes,
    ...enMlbTeamProfileRoutes,
    ...enMlbPlayersDetailRoutes,
    ...matchupRoutes,
    ...predictionDateRoutes,
    ...playerRoutes,
    ...analysisRoutes,
    ...insightsDateRoutes,
    ...insightsSeriesRoutes,
    ...lottoArchiveRoutes,
  ];
}
