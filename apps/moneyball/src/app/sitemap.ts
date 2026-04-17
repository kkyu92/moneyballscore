import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

// v4-4 Task 1: 모든 /analysis/game/[id] URL 포함 (Eng 리뷰 A6)
// 과거 경기까지 SEO 크롤러에 노출해 AdSense 콘텐츠 양 확보.

export const revalidate = 3600; // 1시간 캐싱

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://moneyballscore.vercel.app';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/predictions`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/analysis`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/reviews`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/dashboard`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // 모든 past + 오늘 경기 /analysis/game/[id] URL
  const analysisRoutes: MetadataRoute.Sitemap = [];
  // 일자별 /predictions/[date] URL — 각 날짜는 포스트 역할
  const predictionDateRoutes: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createClient();
    const { data: games } = await supabase
      .from('games')
      .select('id, game_date, updated_at')
      .order('game_date', { ascending: false })
      .limit(5000); // 연 ~700 경기 × 7시즌 여유

    if (games) {
      const seenDates = new Set<string>();
      for (const g of games) {
        analysisRoutes.push({
          url: `${baseUrl}/analysis/game/${g.id}`,
          lastModified: g.updated_at ? new Date(g.updated_at) : undefined,
          changeFrequency: 'weekly',
          priority: 0.7,
        });

        if (g.game_date && !seenDates.has(g.game_date)) {
          seenDates.add(g.game_date);
          predictionDateRoutes.push({
            url: `${baseUrl}/predictions/${g.game_date}`,
            lastModified: g.updated_at ? new Date(g.updated_at) : undefined,
            changeFrequency: 'weekly',
            priority: 0.75,
          });
        }
      }
    }
  } catch (e) {
    console.warn('[sitemap] games query failed, serving static routes only:', e);
  }

  return [...staticRoutes, ...predictionDateRoutes, ...analysisRoutes];
}
