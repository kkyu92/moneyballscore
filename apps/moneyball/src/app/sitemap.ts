import type { MetadataRoute } from 'next';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getRecentWeeks } from '@/lib/reviews/computeWeekRange';
import { getRecentMonths } from '@/lib/reviews/computeMonthRange';
import { allPairs } from '@/lib/matchup/canonicalPair';
import { KBO_TEAMS } from '@moneyball/shared';

// Google Search Console "유형: 알수없음 / 상태: 가져올수없음" 대응.
//
// 원인 확정: 기존 `createClient` (lib/supabase/server) 는 `await cookies()` 호출 →
// Next.js 가 Request-time API 로 인식하여 route 를 dynamic 으로 강제 →
// `export const revalidate` 가 무력화 → 매 요청마다 Supabase 쿼리 실행 →
// Googlebot 첫 접촉 시 cold start + 쿼리 합산해서 timeout.
//
// 해결: sitemap 은 public 조회만 하니 cookie 의존 없는 anon client 를 inline 으로
// 생성해 route 가 **static** 으로 prerender 되도록 함. `revalidate=21600` 이 이때
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
    { url: `${baseUrl}/analysis`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/reviews`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/dashboard`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/reviews/weekly`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/reviews/monthly`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/reviews/misses`, lastModified: now, changeFrequency: 'daily', priority: 0.75 },
    { url: `${baseUrl}/players`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/teams`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/matchup`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

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

  try {
    const supabase = createSitemapClient();
    // limit 5000 → 2500 (2023-2026 실제 ~1200 경기 + 여유). 선택 필드도 5개만.
    // home_sp_id / away_sp_id 추가 — distinct 모아서 /players/[id] 동적 생성.
    const { data: games } = await supabase
      .from('games')
      .select('id, game_date, updated_at, home_sp_id, away_sp_id')
      .order('game_date', { ascending: false })
      .limit(2500);

    if (games) {
      const seenDates = new Set<string>();
      const seenPlayers = new Set<number>();
      for (const g of games) {
        analysisRoutes.push({
          url: `${baseUrl}/analysis/game/${g.id}`,
          lastModified: g.updated_at ? new Date(g.updated_at) : now,
          changeFrequency: 'weekly',
          priority: 0.7,
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
    console.warn('[sitemap] games query failed, serving static routes only:', e);
  }

  return [
    ...staticRoutes,
    ...weeklyReviewRoutes,
    ...monthlyReviewRoutes,
    ...teamProfileRoutes,
    ...matchupRoutes,
    ...predictionDateRoutes,
    ...playerRoutes,
    ...analysisRoutes,
  ];
}
