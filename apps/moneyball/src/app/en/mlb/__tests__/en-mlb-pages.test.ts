import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function src(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8');
}

// ── Hub page (/en/mlb) ────────────────────────────────────────────────
describe('/en/mlb — hub page', () => {
  const PAGE = src('page.tsx');

  it('hreflang en/ko alternates present', () => {
    expect(PAGE).toMatch(/en:.*\/en\/mlb/);
    expect(PAGE).toMatch(/ko:.*\/mlb/);
  });

  it('revalidate = 1800', () => {
    expect(PAGE).toMatch(/export const revalidate = 1800/);
  });

  it('links to all 6 subpages', () => {
    expect(PAGE).toMatch(/\/en\/mlb\/standings/);
    expect(PAGE).toMatch(/\/en\/mlb\/players/);
    expect(PAGE).toMatch(/\/en\/mlb\/factors/);
    expect(PAGE).toMatch(/\/en\/mlb\/wild-card/);
    expect(PAGE).toMatch(/\/en\/mlb\/postseason/);
  });

  it('Supabase predictions query with league=mlb', () => {
    expect(PAGE).toMatch(/from\('predictions'\)/);
    expect(PAGE).toMatch(/eq\('league',\s*'mlb'\)/);
  });

  it('error fallback — renders without throwing when query fails', () => {
    expect(PAGE).toMatch(/result\.error/);
  });
});

// ── Standings (/en/mlb/standings) ────────────────────────────────────
describe('/en/mlb/standings — page', () => {
  const PAGE = src('standings/page.tsx');

  it('hreflang en/ko parity', () => {
    expect(PAGE).toMatch(/en:.*\/en\/mlb\/standings/);
    expect(PAGE).toMatch(/ko:.*\/mlb\/standings/);
  });

  it('revalidate = 21600', () => {
    expect(PAGE).toMatch(/export const revalidate = 21600/);
  });

  it('MLB_DIVISIONS import from @moneyball/shared', () => {
    expect(PAGE).toMatch(/MLB_DIVISIONS/);
    expect(PAGE).toMatch(/@moneyball\/shared/);
  });

  it('American League + National League rendered', () => {
    expect(PAGE).toMatch(/American League/);
    expect(PAGE).toMatch(/National League/);
  });

  it('team link href = /en/mlb/team/${code}', () => {
    expect(PAGE).toMatch(/\/en\/mlb\/team\/\$\{code\}/);
  });
});

// ── Players hub (/en/mlb/players) ────────────────────────────────────
describe('/en/mlb/players — Statcast hub', () => {
  const PAGE = src('players/page.tsx');

  it('hreflang en/ko parity', () => {
    expect(PAGE).toMatch(/en:.*\/en\/mlb\/players/);
    expect(PAGE).toMatch(/ko:.*\/mlb\/players/);
  });

  it('revalidate = 21600', () => {
    expect(PAGE).toMatch(/export const revalidate = 21600/);
  });

  it('Statcast 4 factor labels present', () => {
    expect(PAGE).toMatch(/xwOBA|xwoba/i);
    expect(PAGE).toMatch(/[Bb]arrel/);
  });

  it('links to /en/mlb/players/[id] dynamic routes', () => {
    expect(PAGE).toMatch(/\/en\/mlb\/players\/\$\{/);
  });
});

// ── Factors (/en/mlb/factors) ─────────────────────────────────────────
describe('/en/mlb/factors — 14 factor weights', () => {
  const PAGE = src('factors/page.tsx');

  it('hreflang en/ko parity', () => {
    expect(PAGE).toMatch(/en:.*\/en\/mlb\/factors/);
    expect(PAGE).toMatch(/ko:.*\/mlb\/factors/);
  });

  it('revalidate = 21600', () => {
    expect(PAGE).toMatch(/export const revalidate = 21600/);
  });

  it('MLB_BASE_WEIGHTS import from @moneyball/kbo-data', () => {
    expect(PAGE).toMatch(/MLB_BASE_WEIGHTS/);
    expect(PAGE).toMatch(/@moneyball\/kbo-data/);
  });

  it('14 factors title in metadata', () => {
    expect(PAGE).toMatch(/14.*[Ff]actor/);
  });
});

// ── Wild Card (/en/mlb/wild-card) ─────────────────────────────────────
describe('/en/mlb/wild-card — AL/NL wild card race', () => {
  const PAGE = src('wild-card/page.tsx');

  it('hreflang en/ko parity', () => {
    expect(PAGE).toMatch(/en:.*\/en\/mlb\/wild-card/);
    expect(PAGE).toMatch(/ko:.*\/mlb\/wild-card/);
  });

  it('revalidate = 21600', () => {
    expect(PAGE).toMatch(/export const revalidate = 21600/);
  });

  it('AL + NL wild card mentioned', () => {
    expect(PAGE).toMatch(/Wild Card/i);
    expect(PAGE).toMatch(/AL|American/);
    expect(PAGE).toMatch(/NL|National/);
  });
});

// ── Postseason (/en/mlb/postseason) ──────────────────────────────────
describe('/en/mlb/postseason — bracket page', () => {
  const PAGE = src('postseason/page.tsx');

  it('hreflang en/ko parity', () => {
    expect(PAGE).toMatch(/en:.*\/en\/mlb\/postseason/);
    expect(PAGE).toMatch(/ko:.*\/mlb\/postseason/);
  });

  it('revalidate = 21600', () => {
    expect(PAGE).toMatch(/export const revalidate = 21600/);
  });

  it('4 rounds (WC/DS/LCS/WS) covered', () => {
    expect(PAGE).toMatch(/wc|[Ww]ild [Cc]ard/);
    expect(PAGE).toMatch(/ds|[Dd]ivision/);
    expect(PAGE).toMatch(/lcs|[Cc]hampionship/);
    expect(PAGE).toMatch(/ws|[Ww]orld [Ss]eries/);
  });
});

// ── Games [date] (/en/mlb/games/[date]) ──────────────────────────────
describe('/en/mlb/games/[date] — dynamic date page', () => {
  const PAGE = src('games/[date]/page.tsx');

  it('generateMetadata exports with date param', () => {
    expect(PAGE).toMatch(/generateMetadata/);
    expect(PAGE).toMatch(/date.*string/);
  });

  it('hreflang en/ko with date interpolation', () => {
    expect(PAGE).toMatch(/\/en\/mlb\/games\/\$\{date\}/);
    expect(PAGE).toMatch(/\/mlb\/games\/\$\{date\}/);
  });

  it('revalidate = 1800', () => {
    expect(PAGE).toMatch(/export const revalidate = 1800/);
  });

  it('date format guard — notFound on invalid date', () => {
    expect(PAGE).toMatch(/notFound/);
    expect(PAGE).toMatch(/20\[2-9\]\\d/);
  });

  it('Supabase predictions query with league=mlb', () => {
    expect(PAGE).toMatch(/from\('predictions'\)/);
  });
});

// ── Team hub (/en/mlb/team) ───────────────────────────────────────────
describe('/en/mlb/team — 30 team hub', () => {
  const PAGE = src('team/page.tsx');

  it('hreflang en/ko parity', () => {
    expect(PAGE).toMatch(/en:.*\/en\/mlb\/team/);
    expect(PAGE).toMatch(/ko:.*\/mlb\/team/);
  });

  it('revalidate = 21600', () => {
    expect(PAGE).toMatch(/export const revalidate = 21600/);
  });

  it('CollectionPage JSON-LD', () => {
    expect(PAGE).toMatch(/"@type":\s*"CollectionPage"/);
  });

  it('team link href = /en/mlb/team/${code}', () => {
    expect(PAGE).toMatch(/\/en\/mlb\/team\/\$\{code\}/);
  });

  it('MLB_TEAMS + MLB_DIVISIONS from @moneyball/shared', () => {
    expect(PAGE).toMatch(/MLB_TEAMS/);
    expect(PAGE).toMatch(/MLB_DIVISIONS/);
  });
});

// ── Team [code] (/en/mlb/team/[code]) ────────────────────────────────
describe('/en/mlb/team/[code] — team profile page', () => {
  const PAGE = src('team/[code]/page.tsx');

  it('generateStaticParams uses MLB_TEAMS_PRE_RENDER', () => {
    expect(PAGE).toMatch(/generateStaticParams/);
    expect(PAGE).toMatch(/MLB_TEAMS_PRE_RENDER/);
  });

  it('hreflang en/ko with code interpolation', () => {
    expect(PAGE).toMatch(/\/en\/mlb\/team\/\$\{/);
    expect(PAGE).toMatch(/\/mlb\/team\/\$\{/);
  });

  it('revalidate = 1800', () => {
    expect(PAGE).toMatch(/export const revalidate = 1800/);
  });

  it('notFound for invalid team code', () => {
    expect(PAGE).toMatch(/notFound/);
    expect(PAGE).toMatch(/isMlbTeamCode/);
  });

  it('buildMlbTeamProfile imported', () => {
    expect(PAGE).toMatch(/buildMlbTeamProfile/);
  });
});

// ── Players [id] (/en/mlb/players/[id]) ──────────────────────────────
describe('/en/mlb/players/[id] — Statcast team profile', () => {
  const PAGE = src('players/[id]/page.tsx');

  it('generateStaticParams uses MLB_TEAMS_PRE_RENDER', () => {
    expect(PAGE).toMatch(/generateStaticParams/);
    expect(PAGE).toMatch(/MLB_TEAMS_PRE_RENDER/);
  });

  it('hreflang en/ko with id interpolation', () => {
    expect(PAGE).toMatch(/\/en\/mlb\/players\/\$\{/);
    expect(PAGE).toMatch(/\/mlb\/players\/\$\{/);
  });

  it('revalidate = 21600', () => {
    expect(PAGE).toMatch(/export const revalidate = 21600/);
  });

  it('STATCAST_METRICS defined', () => {
    expect(PAGE).toMatch(/STATCAST_METRICS/);
  });

  it('notFound for invalid team code', () => {
    expect(PAGE).toMatch(/notFound/);
    expect(PAGE).toMatch(/isMlbTeamCode/);
  });
});
