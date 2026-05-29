import { describe, it, expect, vi } from 'vitest';

// Mock 외부 의존성 — Supabase 호출 + insights/lotto loader X
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: [] }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/insights/loader', () => ({
  listInsightsDates: async () => [],
}));

vi.mock('@/lib/insights/series', () => ({
  listSeriesTopics: () => [],
}));

vi.mock('@/lib/lotto/archive', () => ({
  listArchiveDates: () => [],
}));

import sitemap from '../sitemap';

describe('sitemap MLB URL coverage', () => {
  it('includes /mlb hub route', async () => {
    const urls = await sitemap();
    const mlbHub = urls.find((u) => u.url.endsWith('/mlb'));
    expect(mlbHub).toBeDefined();
    expect(mlbHub?.priority).toBeGreaterThan(0.7);
  });

  it('does NOT include placeholder routes (login/settings/community)', async () => {
    const urls = await sitemap();
    expect(urls.find((u) => u.url.endsWith('/login'))).toBeUndefined();
    expect(urls.find((u) => u.url.endsWith('/settings'))).toBeUndefined();
    expect(urls.find((u) => u.url.endsWith('/community'))).toBeUndefined();
  });

  it('preserves existing KBO routes (regression)', async () => {
    const urls = await sitemap();
    const hasHome = urls.find((u) => u.url === 'https://moneyballscore.vercel.app');
    const hasPredictions = urls.find((u) => u.url.endsWith('/predictions'));
    expect(hasHome).toBeDefined();
    expect(hasPredictions).toBeDefined();
  });
});
