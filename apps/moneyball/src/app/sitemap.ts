import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getRecentWeeks } from '@/lib/reviews/computeWeekRange';
import { getRecentMonths } from '@/lib/reviews/computeMonthRange';
import { allPairs } from '@/lib/matchup/canonicalPair';
import { KBO_TEAMS } from '@moneyball/shared';

// Google Search Console "가져올 수 없음" 대응: sitemap 생성 시간을 Googlebot
// timeout 안에 유지 + 모든 URL lastmod 채워 크롤 가치 신호 확실화.
//
// - revalidate 6h 로 늘려 ISR miss 빈도 완화
// - pitcher leaderboard 추가 집계 쿼리 제거 (timeout 기여) — /players 랜딩만 유지
// - games 쿼리 select/limit 최소화, lastmod 전 URL fallback
// - warmup cron (.github/workflows/sitemap-warmup.yml) 과 쌍으로 동작

export const revalidate = 21600; // 6시간 (이전 1h)

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
  const analysisRoutes: MetadataRoute.Sitemap = [];
  const predictionDateRoutes: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createClient();
    // limit 5000 → 2500 (2023-2026 실제 ~1200 경기 + 여유). 선택 필드도 3개만.
    const { data: games } = await supabase
      .from('games')
      .select('id, game_date, updated_at')
      .order('game_date', { ascending: false })
      .limit(2500);

    if (games) {
      const seenDates = new Set<string>();
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
    ...analysisRoutes,
  ];
}
