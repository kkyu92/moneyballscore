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

  it('includes /mlb/factors route (14 factor weight explainer)', async () => {
    const urls = await sitemap();
    const factors = urls.find((u) => u.url.endsWith('/mlb/factors'));
    expect(factors).toBeDefined();
    expect(factors?.priority).toBeGreaterThanOrEqual(0.65);
  });

  it('includes /mlb/players/[id] dynamic routes for 30 teams (plan #21 Step 1)', async () => {
    const urls = await sitemap();
    const playerDetailUrls = urls.filter((u) =>
      /\/mlb\/players\/[A-Z]{2,3}$/.test(u.url) && !u.url.includes('/en/mlb/'),
    );
    expect(playerDetailUrls.length).toBe(30);
    // sample: LAD
    const lad = playerDetailUrls.find((u) => u.url.endsWith('/mlb/players/LAD'));
    expect(lad).toBeDefined();
    expect(lad?.priority).toBeGreaterThan(0);
  });
});

describe('sitemap /en/mlb/* English mirror URL coverage', () => {
  it('/en/mlb hub — priority ≥ 0.8', async () => {
    const urls = await sitemap();
    const hub = urls.find((u) => u.url.endsWith('/en/mlb'));
    expect(hub).toBeDefined();
    expect(hub?.priority).toBeGreaterThanOrEqual(0.8);
  });

  it('/en/mlb 6 static routes present', async () => {
    const urls = await sitemap();
    const enStatic = [
      '/en/mlb/team',
      '/en/mlb/standings',
      '/en/mlb/players',
      '/en/mlb/factors',
      '/en/mlb/wild-card',
      '/en/mlb/postseason',
    ];
    for (const path of enStatic) {
      expect(urls.find((u) => u.url.endsWith(path))).toBeDefined();
    }
  });

  it('/en/mlb/team/[code] 30 dynamic routes present', async () => {
    const urls = await sitemap();
    const enTeam = urls.filter((u) => /\/en\/mlb\/team\/[A-Z]{2,3}$/.test(u.url));
    expect(enTeam.length).toBe(30);
    expect(enTeam.find((u) => u.url.endsWith('/en/mlb/team/LAD'))).toBeDefined();
  });

  it('/en/mlb/players/[id] 30 dynamic Statcast routes present', async () => {
    const urls = await sitemap();
    const enPlayers = urls.filter((u) => /\/en\/mlb\/players\/[A-Z]{2,3}$/.test(u.url));
    expect(enPlayers.length).toBe(30);
    expect(enPlayers.find((u) => u.url.endsWith('/en/mlb/players/NYY'))).toBeDefined();
  });
});
