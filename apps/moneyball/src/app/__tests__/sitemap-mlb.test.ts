import { describe, it, expect, vi } from 'vitest';

// Mock 외부 의존성 — Supabase 호출 + insights/lotto loader X
// chainable + thenable builder — select/eq/in/order/limit 어떤 순서로 호출돼도
// 동일 fixture 로 resolve (cycle 2100 info-arch: mlb 예측/스케줄 조인 쿼리가
// 기존 select().order().limit() 체인과 다른 select().eq().eq()/.in().limit() 체인을 추가해
// 기존 mock(.order 만 지원) 이 새 체인에서 `.eq is not a function` 로 깨지던 것 정정).
function mlbSitemapFixture(table: string) {
  if (table === 'predictions') return [{ external_game_id: 'mlb-fixture-1' }];
  if (table === 'mlb_schedule') {
    return [{
      game_date: '2026-08-01',
      home_team_code: 'NYY',
      away_team_code: 'BOS',
      updated_at: '2026-08-01T00:00:00Z',
    }];
  }
  return [];
}

function makeQueryBuilder(data: unknown[]) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve({ data: data[0] ?? null }),
    then: (resolve: (v: { data: unknown[] }) => void) => resolve({ data }),
  };
  return builder;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => makeQueryBuilder(mlbSitemapFixture(table)),
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

  it('includes /mlb/matchup/[teamA]/[teamB] 435 canonical pairs (30 choose 2, plan #24 Phase 3b — cycle 2069 info-arch gap fix)', async () => {
    const urls = await sitemap();
    const matchupUrls = urls.filter((u) =>
      /\/mlb\/matchup\/[A-Z]{2,3}\/[A-Z]{2,3}$/.test(u.url) && !u.url.includes('/en/mlb/'),
    );
    expect(matchupUrls.length).toBe(435);
    const sample = matchupUrls.find((u) => u.url.endsWith('/mlb/matchup/LAD/NYY'));
    expect(sample).toBeDefined();
    expect(sample?.priority).toBeGreaterThan(0);
  });

  it('includes /mlb/games/[date] date index + /mlb/games/[date]/[slug] game detail (cycle 2100 info-arch — KBO analysis/game/[id] parity gap fix)', async () => {
    const urls = await sitemap();
    const dateIndex = urls.find((u) => u.url.endsWith('/mlb/games/2026-08-01') && !u.url.includes('/en/'));
    expect(dateIndex).toBeDefined();
    const gameDetail = urls.find((u) => u.url.endsWith('/mlb/games/2026-08-01/NYY-vs-BOS'));
    expect(gameDetail).toBeDefined();
    expect(gameDetail?.priority).toBeGreaterThan(0);
  });

  it('includes /mlb/calendar route (cycle 2123 explore-idea — KBO /calendar parity)', async () => {
    const urls = await sitemap();
    const calendar = urls.find((u) => u.url.endsWith('/mlb/calendar') && !u.url.includes('/en/'));
    expect(calendar).toBeDefined();
    expect(calendar?.priority).toBeGreaterThan(0);
  });

  it('includes /mlb/matchup index/picker route (cycle 2183 info-arch — 435 dynamic pairs existed but had no discoverable entry point, KBO /matchup parity)', async () => {
    const urls = await sitemap();
    const matchupIndex = urls.find((u) => u.url.endsWith('/mlb/matchup') && !u.url.includes('/en/'));
    expect(matchupIndex).toBeDefined();
    expect(matchupIndex?.priority).toBeGreaterThan(0);
  });

  it('includes /mlb/methodology route (cycle 2245 explore-idea — KBO /methodology parity)', async () => {
    const urls = await sitemap();
    const methodology = urls.find((u) => u.url.endsWith('/mlb/methodology') && !u.url.includes('/en/'));
    expect(methodology).toBeDefined();
    expect(methodology?.priority).toBeGreaterThan(0);
  });

  it('includes /mlb/reviews/weekly/[week] dynamic routes (plan #26 Phase 1b — weeklyReviewRoutes(KBO) parity)', async () => {
    const urls = await sitemap();
    const mlbWeeklyUrls = urls.filter((u) => /\/mlb\/reviews\/weekly\/\d{4}-W\d{2}$/.test(u.url));
    expect(mlbWeeklyUrls.length).toBeGreaterThan(0);
    // 즉시 redirect 인 index (/mlb/reviews/weekly 자체) 는 sitemap 미포함 (/reviews/weekly 와 동일 규칙).
    expect(urls.find((u) => u.url.endsWith('/mlb/reviews/weekly'))).toBeUndefined();
  });

  it('includes /lotto/check route (cycle 2250 info-arch — /lotto hub 에서 링크 + canonical 존재하지만 sitemap 누락 발견/수정)', async () => {
    const urls = await sitemap();
    const lottoCheck = urls.find((u) => u.url.endsWith('/lotto/check'));
    expect(lottoCheck).toBeDefined();
    expect(lottoCheck?.priority).toBeGreaterThan(0);
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

  it('/en/mlb/matchup/[teamA]/[teamB] 435 dynamic pairs present (cycle 2069 info-arch gap fix)', async () => {
    const urls = await sitemap();
    const enMatchup = urls.filter((u) => /\/en\/mlb\/matchup\/[A-Z]{2,3}\/[A-Z]{2,3}$/.test(u.url));
    expect(enMatchup.length).toBe(435);
    expect(enMatchup.find((u) => u.url.endsWith('/en/mlb/matchup/LAD/NYY'))).toBeDefined();
  });

  it('/en/mlb/games/[date]/[slug] mirror present (cycle 2100 info-arch)', async () => {
    const urls = await sitemap();
    const enGameDetail = urls.find((u) => u.url.endsWith('/en/mlb/games/2026-08-01/NYY-vs-BOS'));
    expect(enGameDetail).toBeDefined();
  });

  it('/en/mlb/matchup index/picker route present (cycle 2183 info-arch)', async () => {
    const urls = await sitemap();
    const enMatchupIndex = urls.find((u) => u.url.endsWith('/en/mlb/matchup'));
    expect(enMatchupIndex).toBeDefined();
  });

  it('/en/mlb/methodology route present (cycle 2245 explore-idea)', async () => {
    const urls = await sitemap();
    const enMethodology = urls.find((u) => u.url.endsWith('/en/mlb/methodology'));
    expect(enMethodology).toBeDefined();
  });
});
