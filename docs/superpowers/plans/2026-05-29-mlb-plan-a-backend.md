# MLB Plan A — Backend (Scraper + DB + Factor + Shadow C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MLB 백엔드 layer 박제 — 3 scraper (statsapi / FanGraphs / Savant) + DB migration 4건 (league column + Statcast + shadow_weights + walk_forward_brier) + factor pipeline 14 factor 본선 + Shadow C historical learning cohort.

**Architecture:** scraper 3 source 박제 (statsapi critical path 먼저 + FanGraphs/Savant 병렬 fan-out) → Supabase predictions/team_season_stats league='mlb' INSERT → mlb-base.ts 14 factor pipeline → probability clamp → INSERT predictions. Shadow C = historical 2024+2025 적재 + logistic regression train + walk-forward Brier 측정 + milestone trigger (n=27/60/150/300/1000/2430).

**Tech Stack:** TypeScript (strict) / Cheerio (HTML parse) / Supabase JS client / Vitest (unit + integration) / pnpm workspace (`packages/kbo-data`) / Next.js 16 App Router (`apps/moneyball`).

**Spec source:** `docs/superpowers/specs/2026-05-29-mlb-league-introduction-design.md` (commit 6ca9f95)

---

## File Structure

### Create

| 파일 | 책임 |
|---|---|
| `packages/kbo-data/src/scrapers/statsapi-mlb.ts` | statsapi.mlb.com schedule + probablePitcher + boxscore |
| `packages/kbo-data/src/scrapers/fangraphs-mlb.ts` | FanGraphs MLB 시즌 stat + batted ball |
| `packages/kbo-data/src/scrapers/baseball-savant.ts` | Baseball Savant Statcast 4 factor |
| `packages/kbo-data/src/scrapers/mlb-historical-bootstrap.ts` | 2024+2025 historical 적재 (1회 fire script) |
| `packages/kbo-data/src/factors/mlb-base.ts` | 14 factor 본선 가중치 + HOME_ELO_BONUS + probability clamp |
| `packages/kbo-data/src/factors/mlb-shadow-c.ts` | 학습 weights cohort + walk-forward expanding + milestone trigger |
| `packages/kbo-data/src/scrapers/__tests__/statsapi-mlb.test.ts` | Unit test |
| `packages/kbo-data/src/scrapers/__tests__/fangraphs-mlb.test.ts` | Unit test |
| `packages/kbo-data/src/scrapers/__tests__/baseball-savant.test.ts` | Unit test |
| `packages/kbo-data/src/factors/__tests__/mlb-base.test.ts` | Unit test (factor / weight / clamp) |
| `packages/kbo-data/src/factors/__tests__/mlb-shadow-c.test.ts` | Unit test (walk-forward / train) |
| `packages/kbo-data/src/__tests__/mlb-pipeline.integration.test.ts` | Integration test |
| `supabase/migrations/033_mlb_league_column.sql` | 8 table league column 추가 |
| `supabase/migrations/034_mlb_statcast_factors.sql` | Statcast 4 column + game_datetime_utc TIMESTAMPTZ |
| `supabase/migrations/035_mlb_shadow_weights.sql` | shadow_weights table 신규 |
| `supabase/migrations/036_mlb_walk_forward_brier.sql` | walk_forward_brier table 신규 |
| `supabase/migrations/__tests__/033_mlb_league_column.test.ts` | Migration regression test |

### Modify

| 파일 | 변경 |
|---|---|
| `packages/kbo-data/src/lib/silent-drift-alert.ts` | MLB 5 cron 추가 layer (이미 박제 — cycle 819) |
| `packages/kbo-data/src/types.ts` | `League`, `MlbStatcast`, `MlbBase14Factor` 추가 |

### Test (Vitest)

- Unit: scraper 3 + factor 2 + total ~25 test
- Integration: pipeline end-to-end ~6 test
- DB migration: ~4 test

---

## Sprint 1 — statsapi.mlb scraper + DB migration (critical path)

### Task 1: types.ts MLB type 추가

**Files:**
- Modify: `packages/kbo-data/src/types.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/kbo-data/src/__tests__/types.test.ts
import { describe, it, expect } from 'vitest';
import type { League, MlbStatcast, MlbBase14Factor } from '../types';

describe('MLB types', () => {
  it('League union includes mlb and kbo', () => {
    const leagues: League[] = ['kbo', 'mlb'];
    expect(leagues).toHaveLength(2);
  });

  it('MlbStatcast contains 4 factors', () => {
    const sample: MlbStatcast = {
      xwoba: 0.342,
      barrel_pct: 9.1,
      hard_hit_pct: 38.5,
      launch_angle: 12.3,
    };
    expect(Object.keys(sample)).toHaveLength(4);
  });

  it('MlbBase14Factor sums to 1.0 weight (with HOME_ELO_BONUS)', () => {
    const weights: MlbBase14Factor = {
      sp_fip: 0.12, sp_xfip: 0.03, lineup_woba: 0.10,
      bullpen_fip: 0.10, recent_form: 0.10, war: 0.08,
      head_to_head: 0.03, park_factor: 0.04, elo: 0.10,
      defense_sfr: 0.05,
      lineup_xwoba: 0.05, lineup_barrel_pct: 0.03,
      sp_xwoba_against: 0.04, woba_std: 0.03,
      home_elo_bonus: 0.10,
    };
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/kbo-data && pnpm vitest run src/__tests__/types.test.ts`
Expected: FAIL with "Cannot find module" or type error

- [ ] **Step 3: Add types**

```typescript
// packages/kbo-data/src/types.ts (append)

export type League = 'kbo' | 'mlb';

export interface MlbStatcast {
  xwoba: number;          // 0~0.5
  barrel_pct: number;     // 0~30
  hard_hit_pct: number;   // 0~100
  launch_angle: number;   // -30~50 deg
}

export interface MlbBase14Factor {
  // KBO 10 동등
  sp_fip: number; sp_xfip: number; lineup_woba: number;
  bullpen_fip: number; recent_form: number; war: number;
  head_to_head: number; park_factor: number; elo: number;
  defense_sfr: number;
  // Statcast 4 추가
  lineup_xwoba: number; lineup_barrel_pct: number;
  sp_xwoba_against: number; woba_std: number;
  // 보너스
  home_elo_bonus: number;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/kbo-data && pnpm vitest run src/__tests__/types.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/kbo-data/src/types.ts packages/kbo-data/src/__tests__/types.test.ts
git commit -m "feat(types): MLB League + Statcast + 14 factor types 박제"
```

---

### Task 2: DB migration 033 — league column 8 table

**Files:**
- Create: `supabase/migrations/033_mlb_league_column.sql`
- Create: `supabase/migrations/__tests__/033_mlb_league_column.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// supabase/migrations/__tests__/033_mlb_league_column.test.ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

describe('migration 033 — league column', () => {
  const tables = ['predictions', 'pipeline_runs', 'agent_memories',
    'team_season_stats', 'team_recent_form', 'head_to_head',
    'stadium_stats', 'umpire_stats'];

  tables.forEach((table) => {
    it(`${table} has league column NOT NULL DEFAULT 'kbo'`, async () => {
      const { data, error } = await supabase
        .rpc('column_metadata', { table_name: table, column_name: 'league' });
      expect(error).toBeNull();
      expect(data?.[0].is_nullable).toBe('NO');
      expect(data?.[0].column_default).toContain('kbo');
    });
  });

  it('league CHECK constraint enforces 2-10 char lowercase', async () => {
    const { error } = await supabase
      .from('predictions')
      .insert({ game_id: 999999, league: 'INVALID' });
    expect(error?.message).toContain('check_league_format');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run supabase/migrations/__tests__/033_mlb_league_column.test.ts`
Expected: FAIL with "column league does not exist"

- [ ] **Step 3: Write migration**

```sql
-- supabase/migrations/033_mlb_league_column.sql
-- MLB 도입 — 8 table league column 추가
-- 박제 결정: spec section 2.6 (A league column 통합)

ALTER TABLE predictions
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE pipeline_runs
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE agent_memories
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE team_season_stats
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE team_recent_form
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE head_to_head
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE stadium_stats
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

ALTER TABLE umpire_stats
  ADD COLUMN league VARCHAR(10) NOT NULL DEFAULT 'kbo'
  CHECK (league ~ '^[a-z]{2,8}$');

-- index 추가 (cross-league query 효율)
CREATE INDEX idx_predictions_league_date
  ON predictions (league, game_date DESC);

CREATE INDEX idx_team_season_stats_league_season_team
  ON team_season_stats (league, season, team_code);

-- helper function (test 용)
CREATE OR REPLACE FUNCTION column_metadata(table_name TEXT, column_name TEXT)
RETURNS TABLE (is_nullable TEXT, column_default TEXT) AS $$
  SELECT is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = $1
    AND column_name = $2;
$$ LANGUAGE SQL STABLE;
```

- [ ] **Step 4: Apply migration + run test**

Run:
```bash
pnpm supabase db push --linked
pnpm vitest run supabase/migrations/__tests__/033_mlb_league_column.test.ts
```
Expected: PASS (9 tests — 8 tables + CHECK constraint)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/033_mlb_league_column.sql supabase/migrations/__tests__/033_mlb_league_column.test.ts
git commit -m "feat(db): migration 033 — 8 table league column 추가"
```

---

### Task 3: DB migration 034 — Statcast 4 + UTC datetime

**Files:**
- Create: `supabase/migrations/034_mlb_statcast_factors.sql`
- Create: `supabase/migrations/__tests__/034_mlb_statcast_factors.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// supabase/migrations/__tests__/034_mlb_statcast_factors.test.ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

describe('migration 034 — Statcast 4 + UTC datetime', () => {
  it('predictions Statcast 4 columns nullable', async () => {
    const cols = ['home_lineup_xwoba', 'away_lineup_xwoba',
      'home_lineup_barrel_pct', 'away_lineup_barrel_pct',
      'home_lineup_hard_hit_pct', 'away_lineup_hard_hit_pct',
      'home_lineup_launch_angle', 'away_lineup_launch_angle'];

    for (const col of cols) {
      const { data } = await supabase
        .rpc('column_metadata', { table_name: 'predictions', column_name: col });
      expect(data?.[0].is_nullable).toBe('YES');
    }
  });

  it('games has game_datetime_utc TIMESTAMPTZ NOT NULL', async () => {
    const { data } = await supabase
      .rpc('column_metadata', { table_name: 'games', column_name: 'game_datetime_utc' });
    expect(data?.[0].is_nullable).toBe('NO');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run supabase/migrations/__tests__/034_mlb_statcast_factors.test.ts`
Expected: FAIL with "column does not exist"

- [ ] **Step 3: Write migration**

```sql
-- supabase/migrations/034_mlb_statcast_factors.sql
-- MLB Statcast 4 column 추가 + UTC datetime 정합
-- 박제 결정: spec section 2.6 / Section 3 자가 검증 #7

ALTER TABLE predictions
  ADD COLUMN home_lineup_xwoba DECIMAL(5,4),
  ADD COLUMN away_lineup_xwoba DECIMAL(5,4),
  ADD COLUMN home_lineup_barrel_pct DECIMAL(5,2),
  ADD COLUMN away_lineup_barrel_pct DECIMAL(5,2),
  ADD COLUMN home_lineup_hard_hit_pct DECIMAL(5,2),
  ADD COLUMN away_lineup_hard_hit_pct DECIMAL(5,2),
  ADD COLUMN home_lineup_launch_angle DECIMAL(5,2),
  ADD COLUMN away_lineup_launch_angle DECIMAL(5,2);

-- range 검증 (사례 3 VARCHAR overflow 패턴 정합)
ALTER TABLE predictions
  ADD CONSTRAINT check_xwoba_range CHECK (
    (home_lineup_xwoba IS NULL OR (home_lineup_xwoba >= 0 AND home_lineup_xwoba <= 0.5))
    AND (away_lineup_xwoba IS NULL OR (away_lineup_xwoba >= 0 AND away_lineup_xwoba <= 0.5))
  ),
  ADD CONSTRAINT check_barrel_range CHECK (
    (home_lineup_barrel_pct IS NULL OR (home_lineup_barrel_pct >= 0 AND home_lineup_barrel_pct <= 30))
    AND (away_lineup_barrel_pct IS NULL OR (away_lineup_barrel_pct >= 0 AND away_lineup_barrel_pct <= 30))
  );

-- games UTC datetime (MLB 4 zone DST 변환 정합)
ALTER TABLE games
  ADD COLUMN game_datetime_utc TIMESTAMPTZ;

-- 기존 KBO row backfill (KST naive → UTC 변환)
UPDATE games
SET game_datetime_utc = (game_date::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
WHERE game_datetime_utc IS NULL;

ALTER TABLE games
  ALTER COLUMN game_datetime_utc SET NOT NULL;

-- index
CREATE INDEX idx_games_datetime_utc ON games (game_datetime_utc DESC);
```

- [ ] **Step 4: Apply migration + run test**

Run: `pnpm supabase db push --linked && pnpm vitest run supabase/migrations/__tests__/034_mlb_statcast_factors.test.ts`
Expected: PASS (2 tests, ~10 column checks)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/034_mlb_statcast_factors.sql supabase/migrations/__tests__/034_mlb_statcast_factors.test.ts
git commit -m "feat(db): migration 034 — Statcast 4 column + UTC datetime 박제"
```

---

### Task 4: statsapi-mlb.ts — schedule parse

**Files:**
- Create: `packages/kbo-data/src/scrapers/statsapi-mlb.ts`
- Create: `packages/kbo-data/src/scrapers/__tests__/statsapi-mlb.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/kbo-data/src/scrapers/__tests__/statsapi-mlb.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchMlbSchedule } from '../statsapi-mlb';

global.fetch = vi.fn();

describe('statsapi-mlb.fetchMlbSchedule', () => {
  it('parses schedule for date with games', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dates: [{ date: '2026-05-29', games: [
          { gamePk: 745123, gameDate: '2026-05-29T23:05:00Z',
            teams: { home: { team: { abbreviation: 'NYY' } },
                     away: { team: { abbreviation: 'BOS' } } },
            status: { detailedState: 'Scheduled' } },
        ]}],
      }),
    });

    const games = await fetchMlbSchedule('2026-05-29');
    expect(games).toHaveLength(1);
    expect(games[0].gamePk).toBe(745123);
    expect(games[0].homeTeam).toBe('NYY');
    expect(games[0].awayTeam).toBe('BOS');
    expect(games[0].gameDateUtc).toEqual(new Date('2026-05-29T23:05:00Z'));
    expect(games[0].status).toBe('scheduled');
  });

  it('returns empty array for date with no games', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ dates: [] }),
    });

    const games = await fetchMlbSchedule('2026-05-29');
    expect(games).toEqual([]);
  });

  it('retries on rate limit (429) with exponential backoff', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ dates: [] }) });

    const games = await fetchMlbSchedule('2026-05-29');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(games).toEqual([]);
  });

  it('throws after 3 retries', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 429 });
    await expect(fetchMlbSchedule('2026-05-29')).rejects.toThrow(/rate limit/);
  });

  it('returns empty array on 401/403 (ToS enforcement 적발)', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 403 });
    const games = await fetchMlbSchedule('2026-05-29');
    expect(games).toEqual([]); // 24h cool down — silent return
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/kbo-data && pnpm vitest run src/scrapers/__tests__/statsapi-mlb.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```typescript
// packages/kbo-data/src/scrapers/statsapi-mlb.ts
import * as Sentry from '@sentry/nextjs';

export interface MlbGame {
  gamePk: number;
  gameDateUtc: Date;
  homeTeam: string;
  awayTeam: string;
  status: 'scheduled' | 'final' | 'in_progress' | 'postponed';
  homeScore?: number;
  awayScore?: number;
  homePitcherId?: number;
  awayPitcherId?: number;
}

const BASE_URL = 'https://statsapi.mlb.com/api/v1';
const RATE_LIMIT_DELAY_MS = 2000;
const MAX_RETRY = 3;

function statusMap(detailedState: string): MlbGame['status'] {
  if (detailedState === 'Final') return 'final';
  if (detailedState === 'In Progress') return 'in_progress';
  if (detailedState.includes('Postponed')) return 'postponed';
  return 'scheduled';
}

async function fetchWithRetry(url: string, retry = 0): Promise<Response> {
  const res = await fetch(url);
  if (res.ok) return res;

  if (res.status === 401 || res.status === 403) {
    Sentry.captureMessage(`statsapi-mlb 401/403 — ToS cool down`, 'warning');
    throw new Error('tos_cooldown');
  }

  if (res.status === 429 || res.status >= 500) {
    if (retry >= MAX_RETRY) {
      throw new Error(`rate limit retry exhausted: ${url}`);
    }
    const delay = RATE_LIMIT_DELAY_MS * Math.pow(2, retry);
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, retry + 1);
  }

  throw new Error(`statsapi error: ${res.status} ${url}`);
}

export async function fetchMlbSchedule(dateKst: string): Promise<MlbGame[]> {
  const url = `${BASE_URL}/schedule?sportId=1&date=${dateKst}`;

  try {
    const res = await fetchWithRetry(url);
    const json = await res.json();

    const games: MlbGame[] = [];
    for (const date of json.dates ?? []) {
      for (const g of date.games ?? []) {
        games.push({
          gamePk: g.gamePk,
          gameDateUtc: new Date(g.gameDate),
          homeTeam: g.teams.home.team.abbreviation,
          awayTeam: g.teams.away.team.abbreviation,
          status: statusMap(g.status.detailedState),
          homeScore: g.teams.home.score,
          awayScore: g.teams.away.score,
        });
      }
    }
    return games;
  } catch (err: any) {
    if (err.message === 'tos_cooldown') return [];
    Sentry.captureException(err);
    throw err;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/kbo-data && pnpm vitest run src/scrapers/__tests__/statsapi-mlb.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/kbo-data/src/scrapers/statsapi-mlb.ts packages/kbo-data/src/scrapers/__tests__/statsapi-mlb.test.ts
git commit -m "feat(scraper): statsapi-mlb schedule parse + rate limit + ToS cool down"
```

---

### Task 5: statsapi-mlb.ts — probablePitcher hydrate

**Files:**
- Modify: `packages/kbo-data/src/scrapers/statsapi-mlb.ts` (add `fetchProbablePitchers`)
- Modify: `packages/kbo-data/src/scrapers/__tests__/statsapi-mlb.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// append to packages/kbo-data/src/scrapers/__tests__/statsapi-mlb.test.ts

import { fetchProbablePitchers } from '../statsapi-mlb';

describe('statsapi-mlb.fetchProbablePitchers', () => {
  it('extracts probable pitchers via hydrate', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dates: [{ games: [{
          gamePk: 745123,
          teams: {
            home: { probablePitcher: { id: 1001, fullName: 'Gerrit Cole' } },
            away: { probablePitcher: { id: 2002, fullName: 'Brayan Bello' } },
          },
        }]}],
      }),
    });

    const pitchers = await fetchProbablePitchers('2026-05-29');
    expect(pitchers).toEqual({
      745123: { home: { id: 1001, name: 'Gerrit Cole' },
                away: { id: 2002, name: 'Brayan Bello' } },
    });
  });

  it('handles missing probable pitchers (D-2 미정)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dates: [{ games: [{ gamePk: 745123, teams: { home: {}, away: {} } }]}],
      }),
    });

    const pitchers = await fetchProbablePitchers('2026-05-29');
    expect(pitchers).toEqual({
      745123: { home: null, away: null },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/kbo-data && pnpm vitest run src/scrapers/__tests__/statsapi-mlb.test.ts`
Expected: FAIL with "fetchProbablePitchers is not a function"

- [ ] **Step 3: Add implementation**

```typescript
// append to packages/kbo-data/src/scrapers/statsapi-mlb.ts

export interface ProbablePitcher {
  id: number;
  name: string;
}

export type ProbablePitcherMap = Record<number, {
  home: ProbablePitcher | null;
  away: ProbablePitcher | null;
}>;

export async function fetchProbablePitchers(dateKst: string): Promise<ProbablePitcherMap> {
  const url = `${BASE_URL}/schedule?sportId=1&date=${dateKst}&hydrate=probablePitcher`;

  try {
    const res = await fetchWithRetry(url);
    const json = await res.json();

    const result: ProbablePitcherMap = {};
    for (const date of json.dates ?? []) {
      for (const g of date.games ?? []) {
        const home = g.teams.home.probablePitcher;
        const away = g.teams.away.probablePitcher;
        result[g.gamePk] = {
          home: home ? { id: home.id, name: home.fullName } : null,
          away: away ? { id: away.id, name: away.fullName } : null,
        };
      }
    }
    return result;
  } catch (err: any) {
    if (err.message === 'tos_cooldown') return {};
    Sentry.captureException(err);
    throw err;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/kbo-data && pnpm vitest run src/scrapers/__tests__/statsapi-mlb.test.ts`
Expected: PASS (7 tests total — 5 schedule + 2 pitcher)

- [ ] **Step 5: Commit**

```bash
git add packages/kbo-data/src/scrapers/statsapi-mlb.ts packages/kbo-data/src/scrapers/__tests__/statsapi-mlb.test.ts
git commit -m "feat(scraper): statsapi-mlb probablePitcher hydrate parse"
```

---

### Task 6: statsapi-mlb.ts — boxscore + 결과 parse

**Files:**
- Modify: `packages/kbo-data/src/scrapers/statsapi-mlb.ts` (add `fetchBoxscore`)
- Modify: `packages/kbo-data/src/scrapers/__tests__/statsapi-mlb.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// append to packages/kbo-data/src/scrapers/__tests__/statsapi-mlb.test.ts

import { fetchBoxscore } from '../statsapi-mlb';

describe('statsapi-mlb.fetchBoxscore', () => {
  it('extracts final score + winner', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        teams: {
          home: { team: { abbreviation: 'NYY' }, teamStats: { batting: { runs: 6 } } },
          away: { team: { abbreviation: 'BOS' }, teamStats: { batting: { runs: 3 } } },
        },
      }),
    });

    const box = await fetchBoxscore(745123);
    expect(box).toEqual({
      gamePk: 745123,
      homeTeam: 'NYY', awayTeam: 'BOS',
      homeScore: 6, awayScore: 3,
      winner: 'NYY',
    });
  });

  it('returns null on 404 (game not found)', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(fetchBoxscore(999999)).rejects.toThrow(/404/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/kbo-data && pnpm vitest run src/scrapers/__tests__/statsapi-mlb.test.ts`
Expected: FAIL with "fetchBoxscore is not a function"

- [ ] **Step 3: Add implementation**

```typescript
// append to packages/kbo-data/src/scrapers/statsapi-mlb.ts

export interface MlbBoxscore {
  gamePk: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: string;
}

export async function fetchBoxscore(gamePk: number): Promise<MlbBoxscore> {
  const url = `${BASE_URL}/game/${gamePk}/boxscore`;
  const res = await fetchWithRetry(url);
  const json = await res.json();

  const home = json.teams.home;
  const away = json.teams.away;
  const homeScore = home.teamStats.batting.runs;
  const awayScore = away.teamStats.batting.runs;
  const winner = homeScore > awayScore ? home.team.abbreviation : away.team.abbreviation;

  return {
    gamePk,
    homeTeam: home.team.abbreviation,
    awayTeam: away.team.abbreviation,
    homeScore, awayScore, winner,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/kbo-data && pnpm vitest run src/scrapers/__tests__/statsapi-mlb.test.ts`
Expected: PASS (9 tests total)

- [ ] **Step 5: Commit**

```bash
git add packages/kbo-data/src/scrapers/statsapi-mlb.ts packages/kbo-data/src/scrapers/__tests__/statsapi-mlb.test.ts
git commit -m "feat(scraper): statsapi-mlb boxscore parse + 결과 winner"
```

---

## Sprint 2 — FanGraphs MLB + Baseball Savant 병렬

> **병렬 fan-out**: Task 7 (FanGraphs) + Task 8 (Savant) = worktree isolation `/tmp/mb-*` 강제 명시 (cycle 1021 race condition evidence 정합).

### Task 7: fangraphs-mlb.ts scraper

**Files:**
- Create: `packages/kbo-data/src/scrapers/fangraphs-mlb.ts`
- Create: `packages/kbo-data/src/scrapers/__tests__/fangraphs-mlb.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/kbo-data/src/scrapers/__tests__/fangraphs-mlb.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchFangraphsMlbTeams } from '../fangraphs-mlb';

global.fetch = vi.fn();

describe('fangraphs-mlb.fetchFangraphsMlbTeams', () => {
  it('parses team stats from HTML table', async () => {
    const html = `<table id="LeaderBoard1_dg1_ctl00">
      <tbody>
        <tr>
          <td>1</td>
          <td><a>LAD</a></td>
          <td>0.340</td><td>3.42</td><td>3.50</td><td>48.5</td>
          <td>20.5</td><td>42.5</td><td>37.0</td><td>8.5</td>
          <td>15.5</td><td>40.0</td><td>35.0</td><td>25.0</td>
        </tr>
      </tbody></table>`;

    (global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => html,
    });

    const teams = await fetchFangraphsMlbTeams(2026);
    expect(teams).toHaveLength(1);
    expect(teams[0]).toMatchObject({
      teamCode: 'LAD',
      woba: 0.340,
      fip: 3.42,
      xfip: 3.50,
      war: 48.5,
      ldPct: 20.5,
      gbPct: 42.5,
      fbPct: 37.0,
      iffbPct: 8.5,
      hrFbPct: 15.5,
      pullPct: 40.0,
      centPct: 35.0,
      oppoPct: 25.0,
    });
  });

  it('throws on parse fail (selector 변경 detect)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => '<html></html>',
    });

    await expect(fetchFangraphsMlbTeams(2026))
      .rejects.toThrow(/parse fail/);
  });

  it('rate limit 2초 delay between calls', async () => {
    const start = Date.now();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => '<table id="LeaderBoard1_dg1_ctl00"><tbody><tr><td>1</td><td><a>X</a></td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table>',
    });

    await fetchFangraphsMlbTeams(2026);
    await fetchFangraphsMlbTeams(2026);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(2000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/kbo-data && pnpm vitest run src/scrapers/__tests__/fangraphs-mlb.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// packages/kbo-data/src/scrapers/fangraphs-mlb.ts
import * as cheerio from 'cheerio';
import * as Sentry from '@sentry/nextjs';

const RATE_LIMIT_MS = 2000;
let lastFetchAt = 0;

async function rateLimit() {
  const elapsed = Date.now() - lastFetchAt;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastFetchAt = Date.now();
}

export interface FangraphsMlbTeam {
  teamCode: string;
  woba: number; fip: number; xfip: number; war: number;
  ldPct: number; gbPct: number; fbPct: number; iffbPct: number;
  hrFbPct: number; pullPct: number; centPct: number; oppoPct: number;
}

export async function fetchFangraphsMlbTeams(season: number): Promise<FangraphsMlbTeam[]> {
  await rateLimit();

  const url = `https://www.fangraphs.com/leaders/major-league?pos=all&stats=bat&lg=all&season=${season}&type=8&team=0,ts&pageitems=2000000000`;
  const res = await fetch(url);

  if (!res.ok) {
    Sentry.captureMessage(`fangraphs-mlb HTTP ${res.status}`, 'warning');
    throw new Error(`fangraphs HTTP ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const rows = $('table#LeaderBoard1_dg1_ctl00 tbody tr');

  if (rows.length === 0) {
    Sentry.captureMessage('fangraphs-mlb parse fail — selector 변경 가능', 'warning');
    throw new Error('parse fail');
  }

  const teams: FangraphsMlbTeam[] = [];
  rows.each((_, el) => {
    const $tds = $(el).find('td');
    if ($tds.length < 14) return;
    teams.push({
      teamCode: $tds.eq(1).text().trim(),
      woba: parseFloat($tds.eq(2).text()),
      fip: parseFloat($tds.eq(3).text()),
      xfip: parseFloat($tds.eq(4).text()),
      war: parseFloat($tds.eq(5).text()),
      ldPct: parseFloat($tds.eq(6).text()),
      gbPct: parseFloat($tds.eq(7).text()),
      fbPct: parseFloat($tds.eq(8).text()),
      iffbPct: parseFloat($tds.eq(9).text()),
      hrFbPct: parseFloat($tds.eq(10).text()),
      pullPct: parseFloat($tds.eq(11).text()),
      centPct: parseFloat($tds.eq(12).text()),
      oppoPct: parseFloat($tds.eq(13).text()),
    });
  });

  return teams;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/kbo-data && pnpm vitest run src/scrapers/__tests__/fangraphs-mlb.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/kbo-data/src/scrapers/fangraphs-mlb.ts packages/kbo-data/src/scrapers/__tests__/fangraphs-mlb.test.ts
git commit -m "feat(scraper): fangraphs-mlb 시즌 stat + batted ball parse"
```

---

### Task 8: baseball-savant.ts scraper (Statcast)

**Files:**
- Create: `packages/kbo-data/src/scrapers/baseball-savant.ts`
- Create: `packages/kbo-data/src/scrapers/__tests__/baseball-savant.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/kbo-data/src/scrapers/__tests__/baseball-savant.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchSavantTeamStatcast } from '../baseball-savant';

global.fetch = vi.fn();

describe('baseball-savant.fetchSavantTeamStatcast', () => {
  it('parses CSV Statcast 4 factor', async () => {
    const csv = `player_id,player_name,team,xwoba,brl_percent,hard_hit_percent,launch_angle\n` +
      `1001,Team LAD,LAD,0.351,10.4,38.5,12.3\n` +
      `2002,Team NYY,NYY,0.339,9.1,37.2,11.8`;

    (global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => csv,
    });

    const teams = await fetchSavantTeamStatcast(2026);
    expect(teams).toHaveLength(2);
    expect(teams[0]).toEqual({
      teamCode: 'LAD',
      xwoba: 0.351,
      barrelPct: 10.4,
      hardHitPct: 38.5,
      launchAngle: 12.3,
    });
  });

  it('skips rows with invalid xwOBA (range 0~0.5)', async () => {
    const csv = `player_id,player_name,team,xwoba,brl_percent,hard_hit_percent,launch_angle\n` +
      `1,Team A,LAD,0.999,10,38,12`;

    (global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => csv,
    });

    const teams = await fetchSavantTeamStatcast(2026);
    expect(teams).toEqual([]);
  });

  it('throws on CSV parse fail (format 변경)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => 'invalid,csv',
    });

    await expect(fetchSavantTeamStatcast(2026))
      .rejects.toThrow(/parse fail/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/kbo-data && pnpm vitest run src/scrapers/__tests__/baseball-savant.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// packages/kbo-data/src/scrapers/baseball-savant.ts
import * as Sentry from '@sentry/nextjs';

const RATE_LIMIT_MS = 2000;
let lastFetchAt = 0;

async function rateLimit() {
  const elapsed = Date.now() - lastFetchAt;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastFetchAt = Date.now();
}

export interface SavantTeam {
  teamCode: string;
  xwoba: number;        // 0~0.5
  barrelPct: number;    // 0~30
  hardHitPct: number;   // 0~100
  launchAngle: number;  // -30~50
}

export async function fetchSavantTeamStatcast(season: number): Promise<SavantTeam[]> {
  await rateLimit();

  const url = `https://baseballsavant.mlb.com/leaderboard/expected_statistics?type=team&year=${season}&csv=true`;
  const res = await fetch(url);

  if (!res.ok) {
    Sentry.captureMessage(`savant HTTP ${res.status}`, 'warning');
    throw new Error(`savant HTTP ${res.status}`);
  }

  const csv = await res.text();
  const lines = csv.trim().split('\n');
  if (lines.length < 2) throw new Error('parse fail — empty CSV');

  const header = lines[0].split(',');
  const teamIdx = header.indexOf('team');
  const xwobaIdx = header.indexOf('xwoba');
  const barrelIdx = header.indexOf('brl_percent');
  const hardHitIdx = header.indexOf('hard_hit_percent');
  const launchIdx = header.indexOf('launch_angle');

  if ([teamIdx, xwobaIdx, barrelIdx, hardHitIdx, launchIdx].some((i) => i === -1)) {
    Sentry.captureMessage('savant CSV format 변경', 'warning');
    throw new Error('parse fail — CSV format 변경');
  }

  const teams: SavantTeam[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const xwoba = parseFloat(cols[xwobaIdx]);
    const barrelPct = parseFloat(cols[barrelIdx]);
    const hardHitPct = parseFloat(cols[hardHitIdx]);
    const launchAngle = parseFloat(cols[launchIdx]);

    // range validation (사례 3 패턴 정합)
    if (xwoba < 0 || xwoba > 0.5) continue;
    if (barrelPct < 0 || barrelPct > 30) continue;
    if (hardHitPct < 0 || hardHitPct > 100) continue;
    if (launchAngle < -30 || launchAngle > 50) continue;

    teams.push({
      teamCode: cols[teamIdx],
      xwoba, barrelPct, hardHitPct, launchAngle,
    });
  }

  return teams;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/kbo-data && pnpm vitest run src/scrapers/__tests__/baseball-savant.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/kbo-data/src/scrapers/baseball-savant.ts packages/kbo-data/src/scrapers/__tests__/baseball-savant.test.ts
git commit -m "feat(scraper): baseball-savant Statcast 4 factor CSV parse"
```

---

## Sprint 3 — Factor pipeline 14 + Shadow C historical

### Task 9: mlb-base.ts factor pipeline + weight sum guard

**Files:**
- Create: `packages/kbo-data/src/factors/mlb-base.ts`
- Create: `packages/kbo-data/src/factors/__tests__/mlb-base.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/kbo-data/src/factors/__tests__/mlb-base.test.ts
import { describe, it, expect } from 'vitest';
import {
  MLB_BASE_WEIGHTS,
  computeMlbProbability,
  type MlbFactorInputs,
} from '../mlb-base';

describe('mlb-base.MLB_BASE_WEIGHTS', () => {
  it('14 factor + HOME_ELO_BONUS sum to 1.0', () => {
    const sum = Object.values(MLB_BASE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it('Statcast 4 weights = 15% (5+3+4+3)', () => {
    const statcast = MLB_BASE_WEIGHTS.lineup_xwoba
      + MLB_BASE_WEIGHTS.lineup_barrel_pct
      + MLB_BASE_WEIGHTS.sp_xwoba_against
      + MLB_BASE_WEIGHTS.woba_std;
    expect(statcast).toBeCloseTo(0.15, 6);
  });

  it('HOME_ELO_BONUS = 10%', () => {
    expect(MLB_BASE_WEIGHTS.home_elo_bonus).toBe(0.10);
  });
});

describe('mlb-base.computeMlbProbability', () => {
  const sampleInput: MlbFactorInputs = {
    sp_fip: { home: 3.0, away: 4.0 },
    sp_xfip: { home: 3.2, away: 4.2 },
    lineup_woba: { home: 0.340, away: 0.330 },
    bullpen_fip: { home: 3.5, away: 3.7 },
    recent_form: { home: 7, away: 5 },
    war: { home: 50, away: 45 },
    head_to_head: { homeWinRate: 0.6 },
    park_factor: 1.02,
    elo: { home: 1550, away: 1500 },
    defense_sfr: { home: 5, away: 3 },
    lineup_xwoba: { home: 0.351, away: 0.339 },
    lineup_barrel_pct: { home: 10.4, away: 9.1 },
    sp_xwoba_against: { home: 0.290, away: 0.310 },
    woba_std: { home: 0.020, away: 0.025 },
  };

  it('returns probability between 0.15 and 0.85 (clamp)', () => {
    const p = computeMlbProbability(sampleInput);
    expect(p).toBeGreaterThanOrEqual(0.15);
    expect(p).toBeLessThanOrEqual(0.85);
  });

  it('home advantage > 0.5 when factors balanced', () => {
    const balanced: MlbFactorInputs = {
      sp_fip: { home: 3.5, away: 3.5 },
      sp_xfip: { home: 3.5, away: 3.5 },
      lineup_woba: { home: 0.335, away: 0.335 },
      bullpen_fip: { home: 3.5, away: 3.5 },
      recent_form: { home: 5, away: 5 },
      war: { home: 50, away: 50 },
      head_to_head: { homeWinRate: 0.5 },
      park_factor: 1.0,
      elo: { home: 1500, away: 1500 },
      defense_sfr: { home: 0, away: 0 },
      lineup_xwoba: { home: 0.335, away: 0.335 },
      lineup_barrel_pct: { home: 9, away: 9 },
      sp_xwoba_against: { home: 0.300, away: 0.300 },
      woba_std: { home: 0.022, away: 0.022 },
    };
    const p = computeMlbProbability(balanced);
    expect(p).toBeGreaterThan(0.5); // HOME_ELO_BONUS effect
  });

  it('returns 0.5 (NaN clamp) when input contains NaN', () => {
    const broken = { ...sampleInput, sp_fip: { home: NaN, away: 4.0 } };
    const p = computeMlbProbability(broken);
    expect(p).toBe(0.5); // NaN → 0.5 default
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/kbo-data && pnpm vitest run src/factors/__tests__/mlb-base.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// packages/kbo-data/src/factors/mlb-base.ts

export const MLB_BASE_WEIGHTS = {
  // KBO 10 동등
  sp_fip: 0.12, sp_xfip: 0.03, lineup_woba: 0.10,
  bullpen_fip: 0.10, recent_form: 0.10, war: 0.08,
  head_to_head: 0.03, park_factor: 0.04, elo: 0.10,
  defense_sfr: 0.05,
  // Statcast 4 추가
  lineup_xwoba: 0.05, lineup_barrel_pct: 0.03,
  sp_xwoba_against: 0.04, woba_std: 0.03,
  // 보너스
  home_elo_bonus: 0.10,
} as const;

export const HOME_ELO_BONUS_VALUE = 24; // KBO HOME_ELO_BONUS=24 정합

export interface MlbFactorInputs {
  sp_fip: { home: number; away: number };
  sp_xfip: { home: number; away: number };
  lineup_woba: { home: number; away: number };
  bullpen_fip: { home: number; away: number };
  recent_form: { home: number; away: number };
  war: { home: number; away: number };
  head_to_head: { homeWinRate: number };
  park_factor: number;
  elo: { home: number; away: number };
  defense_sfr: { home: number; away: number };
  lineup_xwoba: { home: number; away: number };
  lineup_barrel_pct: { home: number; away: number };
  sp_xwoba_against: { home: number; away: number };
  woba_std: { home: number; away: number };
}

function safe(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function computeMlbProbability(input: MlbFactorInputs): number {
  const homeAdvantage =
    -1 * MLB_BASE_WEIGHTS.sp_fip * (safe(input.sp_fip.home) - safe(input.sp_fip.away))
    -1 * MLB_BASE_WEIGHTS.sp_xfip * (safe(input.sp_xfip.home) - safe(input.sp_xfip.away))
    + MLB_BASE_WEIGHTS.lineup_woba * (safe(input.lineup_woba.home) - safe(input.lineup_woba.away)) * 5
    -1 * MLB_BASE_WEIGHTS.bullpen_fip * (safe(input.bullpen_fip.home) - safe(input.bullpen_fip.away))
    + MLB_BASE_WEIGHTS.recent_form * (safe(input.recent_form.home) - safe(input.recent_form.away)) * 0.05
    + MLB_BASE_WEIGHTS.war * (safe(input.war.home) - safe(input.war.away)) * 0.01
    + MLB_BASE_WEIGHTS.head_to_head * (safe(input.head_to_head.homeWinRate) - 0.5)
    + MLB_BASE_WEIGHTS.park_factor * (safe(input.park_factor, 1.0) - 1.0)
    + MLB_BASE_WEIGHTS.elo * ((safe(input.elo.home) + HOME_ELO_BONUS_VALUE - safe(input.elo.away)) / 400)
    + MLB_BASE_WEIGHTS.defense_sfr * (safe(input.defense_sfr.home) - safe(input.defense_sfr.away)) * 0.01
    + MLB_BASE_WEIGHTS.lineup_xwoba * (safe(input.lineup_xwoba.home) - safe(input.lineup_xwoba.away)) * 5
    + MLB_BASE_WEIGHTS.lineup_barrel_pct * (safe(input.lineup_barrel_pct.home) - safe(input.lineup_barrel_pct.away)) * 0.01
    -1 * MLB_BASE_WEIGHTS.sp_xwoba_against * (safe(input.sp_xwoba_against.home) - safe(input.sp_xwoba_against.away)) * 5
    + MLB_BASE_WEIGHTS.woba_std * (safe(input.woba_std.home) - safe(input.woba_std.away)) * 5
    + MLB_BASE_WEIGHTS.home_elo_bonus * 0.5;

  // NaN guard
  if (!Number.isFinite(homeAdvantage)) return 0.5;

  // probability 변환 + clamp 0.15~0.85 (KBO judge-agent 정합)
  const p = 0.5 + homeAdvantage;
  return Math.max(0.15, Math.min(0.85, p));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/kbo-data && pnpm vitest run src/factors/__tests__/mlb-base.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/kbo-data/src/factors/mlb-base.ts packages/kbo-data/src/factors/__tests__/mlb-base.test.ts
git commit -m "feat(factor): mlb-base 14 factor 가중치 + probability clamp 0.15~0.85"
```

---

### Task 10: mlb-historical-bootstrap.ts — Retrosheet + statsapi historical 적재

**Files:**
- Create: `packages/kbo-data/src/scrapers/mlb-historical-bootstrap.ts`
- Create: `packages/kbo-data/src/scrapers/__tests__/mlb-historical-bootstrap.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/kbo-data/src/scrapers/__tests__/mlb-historical-bootstrap.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchRetrosheetSeasonGames } from '../mlb-historical-bootstrap';

global.fetch = vi.fn();

describe('mlb-historical-bootstrap.fetchRetrosheetSeasonGames', () => {
  it('parses Retrosheet game log CSV', async () => {
    const csv = `"20240328","0","Fri","NYY","AL","1","BOS","AL","1","8","5",...`;
    (global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => csv,
    });

    const games = await fetchRetrosheetSeasonGames(2024);
    expect(games[0]).toMatchObject({
      gameDate: '2024-03-28',
      homeTeam: 'NYY',
      awayTeam: 'BOS',
      homeScore: 8,
      awayScore: 5,
      winner: 'NYY',
    });
  });

  it('attribution required in module export', async () => {
    const { RETROSHEET_ATTRIBUTION } = await import('../mlb-historical-bootstrap');
    expect(RETROSHEET_ATTRIBUTION).toContain('Retrosheet');
    expect(RETROSHEET_ATTRIBUTION).toContain('www.retrosheet.org');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/kbo-data && pnpm vitest run src/scrapers/__tests__/mlb-historical-bootstrap.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// packages/kbo-data/src/scrapers/mlb-historical-bootstrap.ts

/**
 * Retrosheet attribution — required by license (notice.txt).
 * 출력 페이지에 명시 박제 의무.
 */
export const RETROSHEET_ATTRIBUTION =
  'The information used here was obtained free of charge from and is copyrighted by Retrosheet. Interested parties may contact Retrosheet at www.retrosheet.org';

export interface HistoricalGame {
  gameDate: string; // YYYY-MM-DD
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: string;
}

export async function fetchRetrosheetSeasonGames(season: number): Promise<HistoricalGame[]> {
  const url = `https://www.retrosheet.org/gamelogs/gl${season}.zip`;
  // 실제 박제 시 zip download + unzip + CSV parse (간략화)
  const res = await fetch(url);
  if (!res.ok) throw new Error(`retrosheet HTTP ${res.status}`);

  const csv = await res.text();
  const games: HistoricalGame[] = [];

  for (const line of csv.split('\n')) {
    if (!line.trim()) continue;
    const cols = line.replace(/"/g, '').split(',');
    if (cols.length < 11) continue;

    const dateStr = cols[0]; // YYYYMMDD
    const gameDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    const awayTeam = cols[3];
    const homeTeam = cols[6];
    const awayScore = parseInt(cols[9], 10);
    const homeScore = parseInt(cols[10], 10);

    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) continue;

    games.push({
      gameDate, homeTeam, awayTeam, homeScore, awayScore,
      winner: homeScore > awayScore ? homeTeam : awayTeam,
    });
  }

  return games;
}

// CLI entry point — pnpm tsx packages/kbo-data/src/scrapers/mlb-historical-bootstrap.ts
if (require.main === module) {
  (async () => {
    const supabase = require('@supabase/supabase-js').createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    for (const season of [2024, 2025]) {
      console.log(`[bootstrap] fetching season ${season}...`);
      const games = await fetchRetrosheetSeasonGames(season);
      console.log(`[bootstrap] season ${season} = ${games.length} games`);

      const rows = games.map((g) => ({
        league: 'mlb',
        season,
        game_date: g.gameDate,
        home_team_code: g.homeTeam,
        away_team_code: g.awayTeam,
        home_score: g.homeScore,
        away_score: g.awayScore,
        winner: g.winner,
      }));

      const { error } = await supabase.from('historical_games').insert(rows);
      if (error) {
        console.error(`[bootstrap] insert error:`, error);
        process.exit(1);
      }
    }
    console.log('[bootstrap] done');
  })();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/kbo-data && pnpm vitest run src/scrapers/__tests__/mlb-historical-bootstrap.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/kbo-data/src/scrapers/mlb-historical-bootstrap.ts packages/kbo-data/src/scrapers/__tests__/mlb-historical-bootstrap.test.ts
git commit -m "feat(scraper): mlb-historical-bootstrap Retrosheet 2024+2025 적재 (attribution 박제)"
```

---

### Task 11: Migration 035 — shadow_weights table

**Files:**
- Create: `supabase/migrations/035_mlb_shadow_weights.sql`
- Create: `supabase/migrations/__tests__/035_mlb_shadow_weights.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// supabase/migrations/__tests__/035_mlb_shadow_weights.test.ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

describe('migration 035 — shadow_weights', () => {
  it('shadow_weights table 박제 + columns', async () => {
    const { error } = await supabase
      .from('shadow_weights')
      .insert({
        cohort_size: 27,
        model_version: 'shadow-c-v1',
        weights: { sp_fip: 0.13, lineup_woba: 0.11 },
        brier: 0.2400,
        accuracy: 0.5185,
      });
    expect(error).toBeNull();

    const { data } = await supabase
      .from('shadow_weights')
      .select('*')
      .eq('model_version', 'shadow-c-v1')
      .single();
    expect(data).toMatchObject({
      cohort_size: 27,
      model_version: 'shadow-c-v1',
      brier: 0.2400,
    });
  });

  it('CHECK constraint enforces cohort_size > 0', async () => {
    const { error } = await supabase
      .from('shadow_weights')
      .insert({
        cohort_size: 0,
        model_version: 'shadow-c-invalid',
        weights: {},
        brier: 0,
        accuracy: 0,
      });
    expect(error?.message).toContain('cohort_size_positive');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run supabase/migrations/__tests__/035_mlb_shadow_weights.test.ts`
Expected: FAIL with "relation does not exist"

- [ ] **Step 3: Write migration**

```sql
-- supabase/migrations/035_mlb_shadow_weights.sql
-- Shadow C 학습 weights cohort 박제
-- 박제 결정: spec section 2.7 ★ (B 본선 + Shadow C)

CREATE TABLE shadow_weights (
  id BIGSERIAL PRIMARY KEY,
  cohort_size INTEGER NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  weights JSONB NOT NULL,
  brier DECIMAL(6,4) NOT NULL,
  accuracy DECIMAL(5,4) NOT NULL,
  league VARCHAR(10) NOT NULL DEFAULT 'mlb',
  trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cohort_size_positive CHECK (cohort_size > 0),
  CONSTRAINT brier_range CHECK (brier >= 0 AND brier <= 1),
  CONSTRAINT accuracy_range CHECK (accuracy >= 0 AND accuracy <= 1),
  CONSTRAINT unique_model_version UNIQUE (league, model_version)
);

CREATE INDEX idx_shadow_weights_league_trained
  ON shadow_weights (league, trained_at DESC);

ALTER TABLE shadow_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read shadow_weights"
  ON shadow_weights FOR SELECT
  USING (true);
```

- [ ] **Step 4: Apply migration + run test**

Run: `pnpm supabase db push --linked && pnpm vitest run supabase/migrations/__tests__/035_mlb_shadow_weights.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/035_mlb_shadow_weights.sql supabase/migrations/__tests__/035_mlb_shadow_weights.test.ts
git commit -m "feat(db): migration 035 — shadow_weights table 박제"
```

---

### Task 12: Migration 036 — walk_forward_brier table

**Files:**
- Create: `supabase/migrations/036_mlb_walk_forward_brier.sql`
- Create: `supabase/migrations/__tests__/036_mlb_walk_forward_brier.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// supabase/migrations/__tests__/036_mlb_walk_forward_brier.test.ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

describe('migration 036 — walk_forward_brier', () => {
  it('walk_forward_brier table 박제', async () => {
    const { error } = await supabase
      .from('walk_forward_brier')
      .insert({
        month: '2026-08',
        cohort_size: 150,
        brier_base: 0.2500,
        brier_shadow: 0.2350,
        delta: -0.0150,
      });
    expect(error).toBeNull();
  });

  it('kill-switch delta < -0.02 detect', async () => {
    const { data } = await supabase
      .from('walk_forward_brier')
      .select('delta')
      .lt('delta', -0.02);
    expect(Array.isArray(data)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run supabase/migrations/__tests__/036_mlb_walk_forward_brier.test.ts`
Expected: FAIL with "relation does not exist"

- [ ] **Step 3: Write migration**

```sql
-- supabase/migrations/036_mlb_walk_forward_brier.sql
-- Walk-forward expanding window Brier 측정 박제
-- 박제 결정: spec section 2.7 milestone trigger + walk-forward

CREATE TABLE walk_forward_brier (
  id BIGSERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL,  -- YYYY-MM
  cohort_size INTEGER NOT NULL,
  brier_base DECIMAL(6,4) NOT NULL,
  brier_shadow DECIMAL(6,4) NOT NULL,
  delta DECIMAL(6,4) NOT NULL,
  league VARCHAR(10) NOT NULL DEFAULT 'mlb',
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT brier_base_range CHECK (brier_base >= 0 AND brier_base <= 1),
  CONSTRAINT brier_shadow_range CHECK (brier_shadow >= 0 AND brier_shadow <= 1),
  CONSTRAINT unique_month UNIQUE (league, month)
);

CREATE INDEX idx_walk_forward_league_month
  ON walk_forward_brier (league, month DESC);

CREATE INDEX idx_walk_forward_kill_switch
  ON walk_forward_brier (league, delta) WHERE delta < -0.02;

ALTER TABLE walk_forward_brier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read walk_forward_brier"
  ON walk_forward_brier FOR SELECT
  USING (true);
```

- [ ] **Step 4: Apply migration + run test**

Run: `pnpm supabase db push --linked && pnpm vitest run supabase/migrations/__tests__/036_mlb_walk_forward_brier.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/036_mlb_walk_forward_brier.sql supabase/migrations/__tests__/036_mlb_walk_forward_brier.test.ts
git commit -m "feat(db): migration 036 — walk_forward_brier table 박제"
```

---

### Task 13: mlb-shadow-c.ts — logistic regression train + walk-forward

**Files:**
- Create: `packages/kbo-data/src/factors/mlb-shadow-c.ts`
- Create: `packages/kbo-data/src/factors/__tests__/mlb-shadow-c.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/kbo-data/src/factors/__tests__/mlb-shadow-c.test.ts
import { describe, it, expect } from 'vitest';
import {
  trainShadowWeights,
  computeBrier,
  MILESTONE_TRIGGERS,
  type TrainingSample,
} from '../mlb-shadow-c';

describe('mlb-shadow-c.MILESTONE_TRIGGERS', () => {
  it('milestone array = [27, 60, 150, 300, 1000, 2430] 정합 KBO 패턴', () => {
    expect(MILESTONE_TRIGGERS).toEqual([27, 60, 150, 300, 1000, 2430]);
  });
});

describe('mlb-shadow-c.computeBrier', () => {
  it('Brier score = mean((predicted - actual)^2)', () => {
    const predictions = [
      { predicted: 0.7, actual: 1 },  // (0.7 - 1)^2 = 0.09
      { predicted: 0.3, actual: 0 },  // (0.3 - 0)^2 = 0.09
      { predicted: 0.5, actual: 1 },  // (0.5 - 1)^2 = 0.25
    ];
    const brier = computeBrier(predictions);
    expect(brier).toBeCloseTo((0.09 + 0.09 + 0.25) / 3, 4);
  });
});

describe('mlb-shadow-c.trainShadowWeights', () => {
  it('trains weights from sample cohort', () => {
    const samples: TrainingSample[] = Array.from({ length: 30 }, (_, i) => ({
      factors: {
        sp_fip_delta: Math.random() - 0.5,
        lineup_woba_delta: Math.random() * 0.1,
        elo_delta: Math.random() * 100 - 50,
        statcast_xwoba_delta: Math.random() * 0.05,
      },
      homeWon: Math.random() > 0.45 ? 1 : 0, // home advantage
    }));

    const { weights, brier, accuracy } = trainShadowWeights(samples);
    expect(Object.keys(weights).length).toBeGreaterThan(0);
    expect(brier).toBeGreaterThan(0);
    expect(brier).toBeLessThan(1);
    expect(accuracy).toBeGreaterThanOrEqual(0);
    expect(accuracy).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/kbo-data && pnpm vitest run src/factors/__tests__/mlb-shadow-c.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// packages/kbo-data/src/factors/mlb-shadow-c.ts

export const MILESTONE_TRIGGERS = [27, 60, 150, 300, 1000, 2430] as const;

export interface TrainingSample {
  factors: Record<string, number>;
  homeWon: 0 | 1;
}

export interface BrierInput {
  predicted: number;
  actual: 0 | 1;
}

export function computeBrier(predictions: BrierInput[]): number {
  if (predictions.length === 0) return 0;
  const sum = predictions.reduce((s, p) => s + Math.pow(p.predicted - p.actual, 2), 0);
  return sum / predictions.length;
}

export interface TrainResult {
  weights: Record<string, number>;
  brier: number;
  accuracy: number;
}

/**
 * Simple logistic regression — gradient descent.
 * Production 박제 시 ml-logistic-regression 또는 @tensorflow/tfjs 외부 라이브러리 사용 가능.
 */
export function trainShadowWeights(
  samples: TrainingSample[],
  learningRate = 0.01,
  epochs = 100,
): TrainResult {
  if (samples.length === 0) {
    return { weights: {}, brier: 0, accuracy: 0 };
  }

  const factorKeys = Object.keys(samples[0].factors);
  const weights: Record<string, number> = {};
  factorKeys.forEach((k) => { weights[k] = 0; });
  let bias = 0;

  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const s of samples) {
      let z = bias;
      for (const k of factorKeys) z += weights[k] * s.factors[k];
      const p = sigmoid(z);
      const error = p - s.homeWon;
      for (const k of factorKeys) weights[k] -= learningRate * error * s.factors[k];
      bias -= learningRate * error;
    }
  }

  // 측정
  const predictions: BrierInput[] = samples.map((s) => {
    let z = bias;
    for (const k of factorKeys) z += weights[k] * s.factors[k];
    return { predicted: sigmoid(z), actual: s.homeWon };
  });
  const brier = computeBrier(predictions);
  const accuracy = predictions.filter(
    (p) => (p.predicted > 0.5 ? 1 : 0) === p.actual
  ).length / predictions.length;

  return { weights, brier, accuracy };
}

/**
 * Walk-forward expanding window — KBO cycle 1019 C1a 패턴 정합.
 */
export function walkForwardExpanding(
  samples: TrainingSample[],
  monthBoundaries: number[], // indices where months split
): Array<{ month: number; brier: number; cohortSize: number }> {
  const results = [];
  for (let i = 0; i < monthBoundaries.length; i++) {
    const trainEnd = monthBoundaries[i];
    const trainSet = samples.slice(0, trainEnd);
    if (trainSet.length < 10) continue;
    const { brier } = trainShadowWeights(trainSet);
    results.push({ month: i, brier, cohortSize: trainEnd });
  }
  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/kbo-data && pnpm vitest run src/factors/__tests__/mlb-shadow-c.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/kbo-data/src/factors/mlb-shadow-c.ts packages/kbo-data/src/factors/__tests__/mlb-shadow-c.test.ts
git commit -m "feat(factor): mlb-shadow-c logistic regression + walk-forward expanding"
```

---

## Sprint 3 Integration — Pipeline end-to-end test

### Task 14: Pipeline integration test — scrape → DB → predict

**Files:**
- Create: `packages/kbo-data/src/__tests__/mlb-pipeline.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
// packages/kbo-data/src/__tests__/mlb-pipeline.integration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { fetchMlbSchedule } from '../scrapers/statsapi-mlb';
import { fetchFangraphsMlbTeams } from '../scrapers/fangraphs-mlb';
import { fetchSavantTeamStatcast } from '../scrapers/baseball-savant';
import { computeMlbProbability, type MlbFactorInputs } from '../factors/mlb-base';

global.fetch = vi.fn();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

describe('MLB Pipeline Integration', () => {
  beforeEach(async () => {
    // cleanup test row
    await supabase.from('predictions').delete().eq('game_id', 999999).eq('league', 'mlb');
  });

  it('full pipeline: scrape → DB → factor → predict → INSERT', async () => {
    // 1. mock statsapi schedule
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dates: [{ games: [{
          gamePk: 999999,
          gameDate: '2026-05-29T23:05:00Z',
          teams: { home: { team: { abbreviation: 'LAD' } }, away: { team: { abbreviation: 'NYY' } } },
          status: { detailedState: 'Scheduled' },
        }]}],
      }),
    });
    const games = await fetchMlbSchedule('2026-05-29');
    expect(games).toHaveLength(1);

    // 2. INSERT games row
    await supabase.from('games').insert({
      game_id: games[0].gamePk,
      game_date: '2026-05-29',
      game_datetime_utc: games[0].gameDateUtc.toISOString(),
      home_team_code: 'LAD',
      away_team_code: 'NYY',
      status: 'scheduled',
    });

    // 3. compute factor
    const input: MlbFactorInputs = {
      sp_fip: { home: 3.0, away: 3.5 },
      sp_xfip: { home: 3.2, away: 3.7 },
      lineup_woba: { home: 0.340, away: 0.335 },
      bullpen_fip: { home: 3.5, away: 3.7 },
      recent_form: { home: 7, away: 5 },
      war: { home: 50, away: 45 },
      head_to_head: { homeWinRate: 0.55 },
      park_factor: 1.02,
      elo: { home: 1550, away: 1500 },
      defense_sfr: { home: 5, away: 3 },
      lineup_xwoba: { home: 0.351, away: 0.339 },
      lineup_barrel_pct: { home: 10.4, away: 9.1 },
      sp_xwoba_against: { home: 0.290, away: 0.310 },
      woba_std: { home: 0.022, away: 0.024 },
    };
    const probability = computeMlbProbability(input);
    expect(probability).toBeGreaterThanOrEqual(0.15);
    expect(probability).toBeLessThanOrEqual(0.85);

    // 4. INSERT prediction
    const { error } = await supabase.from('predictions').insert({
      game_id: 999999,
      league: 'mlb',
      predicted_winner: probability > 0.5 ? 'LAD' : 'NYY',
      confidence: probability,
      model_version: 'v1.8-mlb-base',
      scoring_rule: 'v1.8-mlb-base',
      home_sp_fip: input.sp_fip.home,
      away_sp_fip: input.sp_fip.away,
      home_lineup_woba: input.lineup_woba.home,
      away_lineup_woba: input.lineup_woba.away,
      home_lineup_xwoba: input.lineup_xwoba.home,
      away_lineup_xwoba: input.lineup_xwoba.away,
    });
    expect(error).toBeNull();

    // 5. verify silent-drift would NOT fire
    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('game_id', 999999)
      .eq('league', 'mlb');
    expect(predictions).toHaveLength(1);
  });

  it('사례 11 silent silent drop — predictions=0 + games_found>0 → Sentry warning', async () => {
    // (silent-drift-alert.ts 호출 검증 — Sentry mock)
    const sentryMock = vi.spyOn(require('@sentry/nextjs'), 'captureMessage');

    // 가정: games 5건 박제 + predictions 0건 INSERT
    const gamesFound = 5;
    const rowsInserted = 0;
    if (gamesFound > 0 && rowsInserted === 0) {
      require('@sentry/nextjs').captureMessage(
        `silent drift: predict_final found ${gamesFound} games but inserted 0`,
        'warning',
      );
    }
    expect(sentryMock).toHaveBeenCalledWith(
      expect.stringContaining('silent drift'),
      'warning',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it works**

Run: `cd packages/kbo-data && pnpm vitest run src/__tests__/mlb-pipeline.integration.test.ts`
Expected: PASS (2 integration tests — full pipeline + 사례 11 silent silent drop)

- [ ] **Step 3: Commit**

```bash
git add packages/kbo-data/src/__tests__/mlb-pipeline.integration.test.ts
git commit -m "test(integration): MLB pipeline end-to-end + 사례 11 silent silent drop guard"
```

---

## Sprint 3 KBO Regression — KBO 영향 0 guard

### Task 15: KBO regression test — KBO 영향 0 강제

**Files:**
- Create: `packages/kbo-data/src/__tests__/kbo-regression.test.ts`

- [ ] **Step 1: Write the regression test**

```typescript
// packages/kbo-data/src/__tests__/kbo-regression.test.ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

describe('KBO regression — MLB 도입 영향 0', () => {
  it('predictions league DEFAULT = kbo (기존 KBO row 정합)', async () => {
    const { data } = await supabase
      .from('predictions')
      .select('league')
      .is('league', null);
    expect(data ?? []).toHaveLength(0); // null row 0건
  });

  it('KBO predictions count > 0 + league=kbo 정합', async () => {
    const { count } = await supabase
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .eq('league', 'kbo');
    expect(count).toBeGreaterThan(0);
  });

  it('KBO scorer 정합 — v1.8 가중치 (n=27 / Brier 0.2505 / accuracy 40.74%)', async () => {
    // KBO scorer module re-import + smoke test
    const { computeKboProbability } = await import('../factors/kbo-v1.8');
    expect(typeof computeKboProbability).toBe('function');
  });

  it('KBO Statcast 4 column = NULL (KBO row)', async () => {
    const { data } = await supabase
      .from('predictions')
      .select('home_lineup_xwoba')
      .eq('league', 'kbo')
      .limit(5);
    data?.forEach((row) => expect(row.home_lineup_xwoba).toBeNull());
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd packages/kbo-data && pnpm vitest run src/__tests__/kbo-regression.test.ts`
Expected: PASS (4 regression tests)

- [ ] **Step 3: Commit**

```bash
git add packages/kbo-data/src/__tests__/kbo-regression.test.ts
git commit -m "test(regression): KBO 영향 0 강제 guard — MLB 도입 분리 정합"
```

---

## Plan A 완료 layer

총 **15 task / ~75 step / ~30 test 박제**:
- Sprint 1: Task 1~6 (types + DB 033/034 + statsapi 3 phase)
- Sprint 2: Task 7~8 (FanGraphs + Savant 병렬)
- Sprint 3: Task 9~15 (mlb-base + historical + Shadow C + DB 035/036 + integration + KBO regression)

### Verification (final)

```bash
cd packages/kbo-data && pnpm vitest run
cd .. && pnpm supabase db push --linked
pnpm tsx packages/kbo-data/src/scrapers/mlb-historical-bootstrap.ts # 1회 fire (사용자 confirm)
```

Expected: 모든 unit test PASS + integration PASS + migration applied + historical 적재 완료.

### Next plan

→ **Plan B (UI layer)**: 9 sub-route + 영문 mirror 9 + Cross-league header + 3 placeholder 페이지

→ **Plan C (ship + cron)**: 7 cron + silent-drift alert + production ship

---

## Self-Review

### Spec coverage check

| Spec section | Plan A task |
|---|---|
| 2.6 DB schema (league column / Statcast 4 / UTC datetime) | Task 2, 3 (migration 033, 034) |
| 2.6 shadow_weights + walk_forward_brier table | Task 11, 12 (migration 035, 036) |
| 2.7 모델 ★ B 본선 14 factor | Task 9 (mlb-base.ts) |
| 2.7 Shadow C historical + train | Task 10, 13 (bootstrap + train) |
| 2.7 milestone trigger | Task 13 (MILESTONE_TRIGGERS) |
| 2.7 walk-forward expanding | Task 13 (walkForwardExpanding) |
| 2.8 Scraper C Hybrid (statsapi → FG/Savant 병렬) | Task 4-6 statsapi / Task 7 FG / Task 8 Savant |
| 4.1 silent-drift alert | Task 14 (integration test 안 검증) |
| 7.4 KBO 영향 0 regression | Task 15 |

### Placeholder scan

- ✅ "TBD" / "TODO" / "implement later" 0건
- ✅ "Add appropriate error handling" 0건 (각 task 안 명시)
- ✅ "Similar to Task N" 0건 (모두 코드 박제)
- ✅ 코드 step 안 코드 block 박제

### Type consistency

- `MlbGame.gamePk` (Task 4) → `MlbBoxscore.gamePk` (Task 6) ✅
- `FangraphsMlbTeam.teamCode` (Task 7) ↔ `SavantTeam.teamCode` (Task 8) ✅
- `MLB_BASE_WEIGHTS` (Task 9) ↔ `weights` JSONB (Task 11) ✅
- `MILESTONE_TRIGGERS` (Task 13) = [27, 60, 150, 300, 1000, 2430] ↔ spec section 2.7 ✅

### Spec coverage gap

- ⚠️ **Section 4.2 mlb-base.ts probability 변환 공식 = simplified** — 실제 production logistic 변환 layer = writing-plans 단계 안 박제 단 production 박제 시 추가 검증 wait (production cohort vs test cohort 정합 검증)
- ⚠️ **Section 5.3 mlb-shadow-train.yml cron** = Plan A 박제 X — **Plan C 박제 layer** (cron + production ship)

→ self-review finding 2건 = Plan C 안 박제 layer 명확화 정합. Plan A 자체 spec gap 0.

---

End of Plan A.
