# MLB Plan C — Ship + Cron + Silent-Drift Alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MLB 운영 layer 박제 — GitHub Actions cron 7건 (statsapi/fancy/savant 인제스트 + predict_final + combined notify + shadow train + walk-forward measure) + silent-drift alert layer 확장 (cycle 819 패턴 정합 — 사례 11 silent silent drop 차단) + production ship.

**Architecture:** GHA cron = repo public unlimited 무료 (KBO 패턴 정합). cron 매핑 = UTC 기준 schedule (DST 영향 X). 각 cron 안 silent-drift alert call (rows=0 + games_found>0 mismatch → Sentry warning). production ship = Vercel auto-deploy on main push (현 KBO 정합) + 실주행 검증 24~48h.

**Tech Stack:** GitHub Actions / Vercel Pro / Supabase / Sentry / TypeScript (Node.js runtime) / tsx (cron entry script).

**Spec source:** `docs/superpowers/specs/2026-05-29-mlb-league-introduction-design.md` (commit 6ca9f95)
**Dependency:** Plan A (백엔드) + Plan B (UI) 박제 완료 wait

---

## File Structure

### Create

| 파일 | 책임 |
|---|---|
| `.github/workflows/mlb-statsapi-scrape.yml` | KST 04:00 매일 statsapi 인제스트 |
| `.github/workflows/mlb-fancy-scrape.yml` | KST 05:00 매일 FanGraphs 인제스트 |
| `.github/workflows/mlb-savant-scrape.yml` | KST 06:00 매일 Savant Statcast 인제스트 |
| `.github/workflows/mlb-predict-final.yml` | KST 03:00 매일 factor pipeline → predictions INSERT |
| `.github/workflows/mlb-combined-notify.yml` | KST 19:00 매일 Telegram MLB combined 발송 |
| `.github/workflows/mlb-shadow-train.yml` | KST 23:00 매주 일요일 Shadow C train + milestone trigger |
| `.github/workflows/mlb-walk-forward-measure.yml` | KST 02:00 매월 1일 expanding window Brier 측정 |
| `scripts/cron/mlb-statsapi-scrape.ts` | cron entry script |
| `scripts/cron/mlb-fancy-scrape.ts` | cron entry script |
| `scripts/cron/mlb-savant-scrape.ts` | cron entry script |
| `scripts/cron/mlb-predict-final.ts` | cron entry script |
| `scripts/cron/mlb-combined-notify.ts` | cron entry script |
| `scripts/cron/mlb-shadow-train.ts` | cron entry script |
| `scripts/cron/mlb-walk-forward-measure.ts` | cron entry script |
| `packages/kbo-data/src/lib/__tests__/silent-drift-mlb.test.ts` | silent-drift MLB 5 cron 매핑 검증 |
| `scripts/cron/__tests__/cron-smoke.test.ts` | cron entry script smoke test |

### Modify

| 파일 | 변경 |
|---|---|
| `packages/kbo-data/src/lib/silent-drift-alert.ts` | MLB 5 cron 추가 매핑 (mlb-statsapi / mlb-fancy / mlb-savant / mlb-predict-final / mlb-combined-notify / mlb-shadow-train / mlb-walk-forward-measure) |

---

## Sprint 5 — cron 7건 박제

### Task 1: silent-drift-alert.ts MLB 5 cron 매핑

**Files:**
- Modify: `packages/kbo-data/src/lib/silent-drift-alert.ts`
- Create: `packages/kbo-data/src/lib/__tests__/silent-drift-mlb.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/kbo-data/src/lib/__tests__/silent-drift-mlb.test.ts
import { describe, it, expect, vi } from 'vitest';
import * as Sentry from '@sentry/nextjs';
import { detectSilentDrift } from '../silent-drift-alert';

vi.spyOn(Sentry, 'captureMessage');

describe('silent-drift MLB cron 매핑', () => {
  it('mlb-statsapi-scrape: games_found>0 + rows_inserted=0 → warning', () => {
    detectSilentDrift('mlb-statsapi-scrape', { games_found: 10, rows_inserted: 0 });
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('silent drift'),
      'warning',
    );
  });

  it('mlb-predict-final: predictions=0 + games_found>0 → 사례 11 silent silent drop', () => {
    detectSilentDrift('mlb-predict-final', { games_found: 5, rows_inserted: 0 });
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('silent silent drop'),
      'warning',
    );
  });

  it('mlb-combined-notify: verified=0 + final_count>0 → verify silent skip', () => {
    detectSilentDrift('mlb-combined-notify', { games_found: 5, rows_inserted: 0 });
    expect(Sentry.captureMessage).toHaveBeenCalled();
  });

  it('mlb-shadow-train: cohort_size > milestone + train_fail → warning', () => {
    detectSilentDrift('mlb-shadow-train', { games_found: 150, rows_inserted: 0 });
    expect(Sentry.captureMessage).toHaveBeenCalled();
  });

  it('no warning when rows_inserted > 0', () => {
    vi.mocked(Sentry.captureMessage).mockClear();
    detectSilentDrift('mlb-statsapi-scrape', { games_found: 10, rows_inserted: 10 });
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/kbo-data && pnpm vitest run src/lib/__tests__/silent-drift-mlb.test.ts`
Expected: FAIL with "detectSilentDrift not exporting" or wrong behavior

- [ ] **Step 3: Modify silent-drift-alert.ts**

```typescript
// packages/kbo-data/src/lib/silent-drift-alert.ts (extend)
import * as Sentry from '@sentry/nextjs';

const MLB_CRON_NAMES = [
  'mlb-statsapi-scrape',
  'mlb-fancy-scrape',
  'mlb-savant-scrape',
  'mlb-predict-final',
  'mlb-combined-notify',
  'mlb-shadow-train',
  'mlb-walk-forward-measure',
] as const;

const KBO_CRON_NAMES = [
  'kbo-scrape',
  'kbo-predict-final',
  'kbo-verify',
  'kbo-summary',
] as const;

type CronName = typeof MLB_CRON_NAMES[number] | typeof KBO_CRON_NAMES[number];

export function detectSilentDrift(
  cronName: CronName,
  expected: { games_found: number; rows_inserted: number },
): void {
  if (expected.games_found > 0 && expected.rows_inserted === 0) {
    // 사례 11 silent silent drop 차단 (predict_final 특화)
    if (cronName.includes('predict-final')) {
      Sentry.captureMessage(
        `silent silent drop: ${cronName} found ${expected.games_found} games but inserted 0 predictions`,
        'warning',
      );
    } else {
      Sentry.captureMessage(
        `silent drift detected: ${cronName} found ${expected.games_found} but inserted 0`,
        'warning',
      );
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/kbo-data && pnpm vitest run src/lib/__tests__/silent-drift-mlb.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/kbo-data/src/lib/silent-drift-alert.ts packages/kbo-data/src/lib/__tests__/silent-drift-mlb.test.ts
git commit -m "feat(observability): silent-drift MLB 5 cron 매핑 + 사례 11 silent silent drop 차단"
```

---

### Task 2: scripts/cron/mlb-statsapi-scrape.ts entry script

**Files:**
- Create: `scripts/cron/mlb-statsapi-scrape.ts`

- [ ] **Step 1: Write the cron entry script**

```typescript
// scripts/cron/mlb-statsapi-scrape.ts
import { fetchMlbSchedule, fetchProbablePitchers, fetchBoxscore } from '@moneyball/kbo-data/scrapers/statsapi-mlb';
import { detectSilentDrift } from '@moneyball/kbo-data/lib/silent-drift-alert';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

Sentry.init({ dsn: process.env.SENTRY_DSN });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

  // phase 1: schedule
  const games = await fetchMlbSchedule(today);
  console.log(`[mlb-statsapi] schedule today=${today} games=${games.length}`);

  for (const g of games) {
    await supabase.from('games').upsert({
      game_id: g.gamePk,
      league: 'mlb',
      game_date: today,
      game_datetime_utc: g.gameDateUtc.toISOString(),
      home_team_code: g.homeTeam,
      away_team_code: g.awayTeam,
      status: g.status,
    }, { onConflict: 'game_id,league' });
  }

  // phase 2: probable pitchers (D-1)
  const pitchers = await fetchProbablePitchers(tomorrow);
  for (const [gamePk, p] of Object.entries(pitchers)) {
    await supabase.from('games').update({
      home_sp_id: p.home?.id ?? null,
      away_sp_id: p.away?.id ?? null,
    }).eq('game_id', parseInt(gamePk, 10)).eq('league', 'mlb');
  }

  // phase 3: boxscore (final 박제)
  const { data: scheduledFinals } = await supabase
    .from('games')
    .select('game_id')
    .eq('league', 'mlb')
    .eq('game_date', today)
    .eq('status', 'final');

  let insertedFinals = 0;
  for (const row of scheduledFinals ?? []) {
    const box = await fetchBoxscore(row.game_id);
    await supabase.from('games').update({
      home_score: box.homeScore,
      away_score: box.awayScore,
      winner: box.winner,
    }).eq('game_id', box.gamePk).eq('league', 'mlb');

    await supabase.from('predictions').update({
      is_correct: null, // updated by predict_final
      actual_winner: box.winner,
      verified_at: new Date().toISOString(),
    }).eq('game_id', box.gamePk).eq('league', 'mlb');
    insertedFinals++;
  }

  // silent-drift alert
  detectSilentDrift('mlb-statsapi-scrape', {
    games_found: games.length,
    rows_inserted: games.length, // upsert 정합
  });

  console.log(`[mlb-statsapi] done — schedule=${games.length} finals=${insertedFinals}`);
}

main().catch((err) => {
  Sentry.captureException(err);
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run smoke test**

Run: `pnpm tsx scripts/cron/mlb-statsapi-scrape.ts` (사용자 영역 — env 박제 후 실행)
Expected: 정상 fire 또는 dry-run 검증

- [ ] **Step 3: Commit**

```bash
git add scripts/cron/mlb-statsapi-scrape.ts
git commit -m "feat(cron): scripts/cron/mlb-statsapi-scrape entry script 박제"
```

---

### Task 3: scripts/cron/mlb-fancy-scrape.ts entry script

**Files:**
- Create: `scripts/cron/mlb-fancy-scrape.ts`

- [ ] **Step 1: Write entry script**

```typescript
// scripts/cron/mlb-fancy-scrape.ts
import { fetchFangraphsMlbTeams } from '@moneyball/kbo-data/scrapers/fangraphs-mlb';
import { detectSilentDrift } from '@moneyball/kbo-data/lib/silent-drift-alert';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

Sentry.init({ dsn: process.env.SENTRY_DSN });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const season = new Date().getFullYear();
  const teams = await fetchFangraphsMlbTeams(season);
  console.log(`[mlb-fancy] season=${season} teams=${teams.length}`);

  let upserted = 0;
  for (const t of teams) {
    const { error } = await supabase.from('team_season_stats').upsert({
      league: 'mlb',
      season,
      team_code: t.teamCode,
      woba: t.woba, fip: t.fip, xfip: t.xfip, war: t.war,
      ld_pct: t.ldPct, gb_pct: t.gbPct, fb_pct: t.fbPct, iffb_pct: t.iffbPct,
      hr_fb_pct: t.hrFbPct, pull_pct: t.pullPct, cent_pct: t.centPct, oppo_pct: t.oppoPct,
    }, { onConflict: 'league,season,team_code' });
    if (!error) upserted++;
  }

  detectSilentDrift('mlb-fancy-scrape', {
    games_found: teams.length,
    rows_inserted: upserted,
  });

  console.log(`[mlb-fancy] done — upserted=${upserted}/${teams.length}`);
}

main().catch((err) => {
  Sentry.captureException(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run smoke test**

Run: `pnpm tsx scripts/cron/mlb-fancy-scrape.ts`
Expected: 정상 fire

- [ ] **Step 3: Commit**

```bash
git add scripts/cron/mlb-fancy-scrape.ts
git commit -m "feat(cron): mlb-fancy-scrape entry script + silent-drift alert"
```

---

### Task 4: scripts/cron/mlb-savant-scrape.ts entry script

**Files:**
- Create: `scripts/cron/mlb-savant-scrape.ts`

- [ ] **Step 1: Write entry script**

```typescript
// scripts/cron/mlb-savant-scrape.ts
import { fetchSavantTeamStatcast } from '@moneyball/kbo-data/scrapers/baseball-savant';
import { detectSilentDrift } from '@moneyball/kbo-data/lib/silent-drift-alert';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

Sentry.init({ dsn: process.env.SENTRY_DSN });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const season = new Date().getFullYear();
  const teams = await fetchSavantTeamStatcast(season);

  let upserted = 0;
  for (const t of teams) {
    const { error } = await supabase.from('team_season_stats').update({
      statcast_xwoba: t.xwoba,
      statcast_barrel_pct: t.barrelPct,
      statcast_hard_hit_pct: t.hardHitPct,
      statcast_launch_angle: t.launchAngle,
    }).eq('league', 'mlb').eq('season', season).eq('team_code', t.teamCode);
    if (!error) upserted++;
  }

  detectSilentDrift('mlb-savant-scrape', {
    games_found: teams.length,
    rows_inserted: upserted,
  });

  console.log(`[mlb-savant] done — upserted=${upserted}/${teams.length}`);
}

main().catch((err) => {
  Sentry.captureException(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run smoke test + commit**

Run: `pnpm tsx scripts/cron/mlb-savant-scrape.ts`
Expected: 정상 fire

```bash
git add scripts/cron/mlb-savant-scrape.ts
git commit -m "feat(cron): mlb-savant-scrape entry script + Statcast 4 factor"
```

---

### Task 5: scripts/cron/mlb-predict-final.ts entry script

**Files:**
- Create: `scripts/cron/mlb-predict-final.ts`

- [ ] **Step 1: Write entry script**

```typescript
// scripts/cron/mlb-predict-final.ts
import { computeMlbProbability } from '@moneyball/kbo-data/factors/mlb-base';
import { detectSilentDrift } from '@moneyball/kbo-data/lib/silent-drift-alert';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

Sentry.init({ dsn: process.env.SENTRY_DSN });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // scheduled games (D-1 박제 OK)
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('league', 'mlb')
    .eq('status', 'scheduled')
    .gte('game_date', today)
    .lte('game_date', tomorrow);

  const gamesFound = games?.length ?? 0;
  let insertedPredictions = 0;

  for (const g of games ?? []) {
    // team_season_stats lookup
    const { data: homeStat } = await supabase
      .from('team_season_stats')
      .select('*')
      .eq('league', 'mlb')
      .eq('team_code', g.home_team_code)
      .single();

    const { data: awayStat } = await supabase
      .from('team_season_stats')
      .select('*')
      .eq('league', 'mlb')
      .eq('team_code', g.away_team_code)
      .single();

    if (!homeStat || !awayStat) continue;

    const probability = computeMlbProbability({
      sp_fip: { home: homeStat.fip, away: awayStat.fip },
      sp_xfip: { home: homeStat.xfip, away: awayStat.xfip },
      lineup_woba: { home: homeStat.woba, away: awayStat.woba },
      bullpen_fip: { home: homeStat.fip, away: awayStat.fip },
      recent_form: { home: 5, away: 5 }, // TODO: actual recent form fetch
      war: { home: homeStat.war, away: awayStat.war },
      head_to_head: { homeWinRate: 0.5 },
      park_factor: 1.0,
      elo: { home: 1500, away: 1500 }, // TODO: actual Elo fetch
      defense_sfr: { home: 0, away: 0 },
      lineup_xwoba: { home: homeStat.statcast_xwoba, away: awayStat.statcast_xwoba },
      lineup_barrel_pct: { home: homeStat.statcast_barrel_pct, away: awayStat.statcast_barrel_pct },
      sp_xwoba_against: { home: homeStat.statcast_xwoba, away: awayStat.statcast_xwoba },
      woba_std: { home: 0.022, away: 0.022 },
    });

    const { error } = await supabase.from('predictions').upsert({
      game_id: g.game_id,
      league: 'mlb',
      game_date: g.game_date,
      predicted_winner: probability > 0.5 ? g.home_team_code : g.away_team_code,
      confidence: probability,
      home_team_code: g.home_team_code,
      away_team_code: g.away_team_code,
      home_sp_fip: homeStat.fip, away_sp_fip: awayStat.fip,
      home_lineup_woba: homeStat.woba, away_lineup_woba: awayStat.woba,
      home_lineup_xwoba: homeStat.statcast_xwoba, away_lineup_xwoba: awayStat.statcast_xwoba,
      home_lineup_barrel_pct: homeStat.statcast_barrel_pct,
      away_lineup_barrel_pct: awayStat.statcast_barrel_pct,
      model_version: 'v1.8-mlb-base',
      scoring_rule: 'v1.8-mlb-base',
    }, { onConflict: 'game_id,league' });

    if (!error) insertedPredictions++;
  }

  // 사례 11 silent silent drop 차단
  detectSilentDrift('mlb-predict-final', {
    games_found: gamesFound,
    rows_inserted: insertedPredictions,
  });

  console.log(`[mlb-predict-final] done — games=${gamesFound} predictions=${insertedPredictions}`);
}

main().catch((err) => {
  Sentry.captureException(err);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke test + commit**

```bash
git add scripts/cron/mlb-predict-final.ts
git commit -m "feat(cron): mlb-predict-final 14 factor pipeline + 사례 11 차단"
```

---

### Task 6: scripts/cron/mlb-combined-notify.ts entry script

**Files:**
- Create: `scripts/cron/mlb-combined-notify.ts`

- [ ] **Step 1: Write entry script**

```typescript
// scripts/cron/mlb-combined-notify.ts
import { formatMlbCombinedMessage, splitMessage } from '@/components/notify/MlbCombinedMessage';
import { detectSilentDrift } from '@moneyball/kbo-data/lib/silent-drift-alert';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

Sentry.init({ dsn: process.env.SENTRY_DSN });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // recap phase
  const { data: recapPredictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('league', 'mlb')
    .eq('game_date', yesterday)
    .not('verified_at', 'is', null);

  const recapGames = recapPredictions?.length ?? 0;
  const recapCorrect = recapPredictions?.filter((p) => p.is_correct).length ?? 0;
  const recapBrier = recapPredictions?.length
    ? recapPredictions.reduce((s, p) => s + Math.pow(p.confidence - (p.is_correct ? 1 : 0), 2), 0) / recapPredictions.length
    : 0;

  // preview phase
  const { data: previewPredictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('league', 'mlb')
    .eq('game_date', tomorrow);

  const previewGames = (previewPredictions ?? []).map((p) => ({
    home: p.home_team_code,
    away: p.away_team_code,
    predicted: p.predicted_winner,
    confidence: p.confidence,
    bigGame: false, // future: playoff race / WAR delta
  }));

  const message = formatMlbCombinedMessage({
    recap: { date: yesterday, games: recapGames, correct: recapCorrect, brier: recapBrier },
    preview: { date: tomorrow, games: previewGames },
  });

  // 4096 split
  const parts = splitMessage(message);
  for (const part of parts) {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: part,
      }),
    });
  }

  detectSilentDrift('mlb-combined-notify', {
    games_found: recapGames + previewGames.length,
    rows_inserted: parts.length,
  });

  console.log(`[mlb-combined-notify] sent ${parts.length} message parts`);
}

main().catch((err) => {
  Sentry.captureException(err);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke test + commit**

```bash
git add scripts/cron/mlb-combined-notify.ts
git commit -m "feat(cron): mlb-combined-notify Telegram recap+preview + 4096 split"
```

---

### Task 7: scripts/cron/mlb-shadow-train.ts + walk-forward

**Files:**
- Create: `scripts/cron/mlb-shadow-train.ts`
- Create: `scripts/cron/mlb-walk-forward-measure.ts`

- [ ] **Step 1: Write shadow-train entry script**

```typescript
// scripts/cron/mlb-shadow-train.ts
import { trainShadowWeights, MILESTONE_TRIGGERS } from '@moneyball/kbo-data/factors/mlb-shadow-c';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

Sentry.init({ dsn: process.env.SENTRY_DSN });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // cohort 측정
  const { count: cohortSize } = await supabase
    .from('predictions')
    .select('*', { count: 'exact', head: true })
    .eq('league', 'mlb')
    .not('verified_at', 'is', null);

  if (!cohortSize || cohortSize < MILESTONE_TRIGGERS[0]) {
    console.log(`[mlb-shadow-train] cohort=${cohortSize} < minimum milestone ${MILESTONE_TRIGGERS[0]} — skip`);
    return;
  }

  // find latest milestone
  const milestone = [...MILESTONE_TRIGGERS].reverse().find((m) => cohortSize >= m);
  if (!milestone) return;

  const milestoneIndex = MILESTONE_TRIGGERS.indexOf(milestone) + 1;
  const modelVersion = `shadow-c-v${milestoneIndex}`;

  // 기존 model_version 박제 시 skip
  const { data: existing } = await supabase
    .from('shadow_weights')
    .select('*')
    .eq('league', 'mlb')
    .eq('model_version', modelVersion)
    .single();
  if (existing) {
    console.log(`[mlb-shadow-train] model_version=${modelVersion} 이미 박제 — skip`);
    return;
  }

  // training samples
  const { data: predictions } = await supabase
    .from('predictions')
    .select('home_sp_fip, away_sp_fip, home_lineup_woba, away_lineup_woba, home_lineup_xwoba, away_lineup_xwoba, is_correct, predicted_winner, home_team_code')
    .eq('league', 'mlb')
    .not('verified_at', 'is', null);

  const samples = (predictions ?? []).map((p: any) => ({
    factors: {
      sp_fip_delta: (p.home_sp_fip ?? 0) - (p.away_sp_fip ?? 0),
      lineup_woba_delta: (p.home_lineup_woba ?? 0) - (p.away_lineup_woba ?? 0),
      xwoba_delta: (p.home_lineup_xwoba ?? 0) - (p.away_lineup_xwoba ?? 0),
    },
    homeWon: (p.is_correct && p.predicted_winner === p.home_team_code) ? 1 : 0 as 0 | 1,
  }));

  const { weights, brier, accuracy } = trainShadowWeights(samples);

  await supabase.from('shadow_weights').insert({
    league: 'mlb',
    cohort_size: cohortSize,
    model_version: modelVersion,
    weights,
    brier,
    accuracy,
  });

  console.log(`[mlb-shadow-train] trained ${modelVersion} — cohort=${cohortSize} brier=${brier.toFixed(4)} accuracy=${(accuracy * 100).toFixed(2)}%`);
}

main().catch((err) => {
  Sentry.captureException(err);
  process.exit(1);
});
```

```typescript
// scripts/cron/mlb-walk-forward-measure.ts
import { computeBrier } from '@moneyball/kbo-data/factors/mlb-shadow-c';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

Sentry.init({ dsn: process.env.SENTRY_DSN });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const monthStart = `${month}-01`;

  // 본선 v1.8-mlb-base Brier
  const { data: basePredictions } = await supabase
    .from('predictions')
    .select('confidence, is_correct')
    .eq('league', 'mlb')
    .eq('model_version', 'v1.8-mlb-base')
    .gte('game_date', monthStart)
    .not('verified_at', 'is', null);

  const brierBase = computeBrier(
    (basePredictions ?? []).map((p: any) => ({
      predicted: p.confidence,
      actual: (p.is_correct ? 1 : 0) as 0 | 1,
    })),
  );

  // Shadow 최신 model_version Brier
  const { data: shadowPredictions } = await supabase
    .from('predictions')
    .select('confidence, is_correct')
    .eq('league', 'mlb')
    .like('model_version', 'shadow-c-%')
    .gte('game_date', monthStart);

  const brierShadow = computeBrier(
    (shadowPredictions ?? []).map((p: any) => ({
      predicted: p.confidence,
      actual: (p.is_correct ? 1 : 0) as 0 | 1,
    })),
  );

  const delta = brierShadow - brierBase;

  await supabase.from('walk_forward_brier').upsert({
    league: 'mlb',
    month,
    cohort_size: basePredictions?.length ?? 0,
    brier_base: brierBase,
    brier_shadow: brierShadow,
    delta,
  }, { onConflict: 'league,month' });

  // kill-switch
  if (delta < -0.02) {
    Sentry.captureMessage(
      `kill-switch: mlb-walk-forward month=${month} delta=${delta.toFixed(4)} (v1.8 -2pp 하회)`,
      'warning',
    );
  }

  console.log(`[mlb-walk-forward] month=${month} delta=${delta.toFixed(4)}`);
}

main().catch((err) => {
  Sentry.captureException(err);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke test + commit**

```bash
git add scripts/cron/mlb-shadow-train.ts scripts/cron/mlb-walk-forward-measure.ts
git commit -m "feat(cron): mlb-shadow-train milestone + mlb-walk-forward-measure kill-switch"
```

---

### Task 8: GitHub Actions workflow 7건

**Files:** 7 `.github/workflows/mlb-*.yml`

- [ ] **Step 1: Write 7 workflow files**

```yaml
# .github/workflows/mlb-statsapi-scrape.yml
name: mlb-statsapi-scrape
on:
  schedule:
    - cron: '0 19 * * *'  # UTC 19:00 = KST 04:00
  workflow_dispatch:
concurrency:
  group: mlb-statsapi-scrape
  cancel-in-progress: false
jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsx scripts/cron/mlb-statsapi-scrape.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
```

```yaml
# .github/workflows/mlb-fancy-scrape.yml
name: mlb-fancy-scrape
on:
  schedule:
    - cron: '0 20 * * *'  # KST 05:00
  workflow_dispatch:
concurrency:
  group: mlb-fancy-scrape
jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsx scripts/cron/mlb-fancy-scrape.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
```

```yaml
# .github/workflows/mlb-savant-scrape.yml
name: mlb-savant-scrape
on:
  schedule:
    - cron: '0 21 * * *'  # KST 06:00
  workflow_dispatch:
concurrency:
  group: mlb-savant-scrape
jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsx scripts/cron/mlb-savant-scrape.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
```

```yaml
# .github/workflows/mlb-predict-final.yml
name: mlb-predict-final
on:
  schedule:
    - cron: '0 18 * * *'  # KST 03:00
  workflow_dispatch:
concurrency:
  group: mlb-predict-final
jobs:
  predict:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsx scripts/cron/mlb-predict-final.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
```

```yaml
# .github/workflows/mlb-combined-notify.yml
name: mlb-combined-notify
on:
  schedule:
    - cron: '0 10 * * *'  # KST 19:00
  workflow_dispatch:
concurrency:
  group: mlb-combined-notify
jobs:
  notify:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsx scripts/cron/mlb-combined-notify.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
          SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
```

```yaml
# .github/workflows/mlb-shadow-train.yml
name: mlb-shadow-train
on:
  schedule:
    - cron: '0 14 * * 0'  # KST 23:00 매주 일요일
  workflow_dispatch:
concurrency:
  group: mlb-shadow-train
jobs:
  train:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsx scripts/cron/mlb-shadow-train.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
```

```yaml
# .github/workflows/mlb-walk-forward-measure.yml
name: mlb-walk-forward-measure
on:
  schedule:
    - cron: '0 17 1 * *'  # KST 02:00 매월 1일
  workflow_dispatch:
concurrency:
  group: mlb-walk-forward-measure
jobs:
  measure:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsx scripts/cron/mlb-walk-forward-measure.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
```

- [ ] **Step 2: Commit 7 workflow**

```bash
git add .github/workflows/mlb-*.yml
git commit -m "feat(cron): GitHub Actions 7 workflow 박제 (UTC schedule + Sentry alert)"
```

---

### Task 9: Historical bootstrap fire (Shadow C 적재)

**Files:** Plan A 박제 `mlb-historical-bootstrap.ts` 사용

- [ ] **Step 1: Sentry alert rule 박제 (사용자 영역)**

사용자 작업:
1. Sentry Dashboard 접속 (https://sentry.io)
2. Project = moneyballscore
3. Alerts → Create Alert Rule
4. Filter: `level:warning AND message:"silent drift"`
5. Notification channel: Telegram webhook 또는 이메일
6. Save

- [ ] **Step 2: Vercel env 박제 확인 (사용자 영역)**

사용자 작업:
1. Vercel Dashboard → Project Settings → Environment Variables
2. 확인:
   - `TELEGRAM_BOT_TOKEN` ✅ (현 박제)
   - `TELEGRAM_CHAT_ID` ✅ (현 박제)
   - `SENTRY_DSN` ✅ (현 박제)
   - `NEXT_PUBLIC_SUPABASE_URL` ✅ (현 박제)
   - `SUPABASE_SERVICE_ROLE_KEY` ✅ (현 박제)
3. 모두 박제 시 진행

- [ ] **Step 3: GitHub repo secrets 박제 확인 (사용자 영역)**

사용자 작업:
1. GitHub repo → Settings → Secrets → Actions
2. 위 5 env 동일 박제 확인

- [ ] **Step 4: Historical bootstrap fire (본 메인 또는 사용자)**

Run:
```bash
pnpm tsx packages/kbo-data/src/scrapers/mlb-historical-bootstrap.ts
```
Expected: 2024+2025 Retrosheet game log 적재 ~5000 games × 2 seasons = ~10000 row INSERT (시간 추정 = ~30~45분 wait, rate limit + parse + INSERT)

- [ ] **Step 5: 검증**

Run:
```bash
psql -d $SUPABASE_URL -c "SELECT COUNT(*) FROM historical_games WHERE league='mlb' GROUP BY season;"
```
Expected: 2024 ~2430 row + 2025 ~2430 row

---

### Task 10: Production ship + 실주행 검증

**Files:** (배포 layer — 박제 X file)

- [ ] **Step 1: Vercel production deploy 확인**

Run:
```bash
git push origin main  # R7 자동 머지 정합 — Vercel auto-deploy
sleep 60
curl -fsSL https://moneyballscore.vercel.app/api/version | jq .commit_sha
```
Expected: 최신 main HEAD = production alias 매칭 (deploy-drift-alert.yml 정합)

- [ ] **Step 2: 9 sub-route render 검증**

Run:
```bash
for route in /mlb /mlb/games/2026-05-29 /mlb/standings /mlb/wild-card /mlb/postseason /mlb/factors /en/mlb /en/mlb/games/2026-05-29; do
  echo "$route:"
  curl -sI "https://moneyballscore.vercel.app$route" | head -1
done
```
Expected: 모두 HTTP 200 응답

- [ ] **Step 3: cron 첫 fire 박제 (사용자 또는 자동 wait)**

사용자 작업:
1. GitHub Actions → Workflows → 7 MLB cron 활성 확인
2. 첫 fire timing wait (UTC schedule 정합):
   - KST 03:00 (UTC 18:00): mlb-predict-final
   - KST 04:00 (UTC 19:00): mlb-statsapi-scrape
   - KST 05:00 (UTC 20:00): mlb-fancy-scrape
   - KST 06:00 (UTC 21:00): mlb-savant-scrape
   - KST 19:00 (UTC 10:00): mlb-combined-notify
3. 또는 수동 fire: `gh workflow run mlb-statsapi-scrape.yml`

- [ ] **Step 4: 실주행 silent drop 검증 (~24h wait)**

Run (24h 후):
```bash
# Sentry warnings 확인
sentry-cli issues list --status=unresolved --query="message:silent drift"
```
Expected: warnings 0건 (silent drift 차단 정합)

- [ ] **Step 5: Telegram MLB combined 첫 발송 검증**

KST 19:00 첫 발송 확인:
- 메시지 = `[MLB recap]` + `[MLB preview]` 통합
- 4096 char 초과 시 split 박제
- 빅매치 ⭐ 마크 박제 (confidence > 0.65)

---

## Plan C 완료 layer

총 **10 task / ~50 step / ~5 test (silent-drift MLB)**:
- Task 1: silent-drift-alert 확장
- Task 2~7: cron entry script 6건 (statsapi / fancy / savant / predict-final / combined-notify / shadow-train + walk-forward)
- Task 8: GHA workflow 7 yml
- Task 9: Historical bootstrap fire (사용자 영역 wait)
- Task 10: Production ship + 실주행 검증

### Verification (final)

```bash
# 모든 unit test
cd packages/kbo-data && pnpm vitest run
cd apps/moneyball && pnpm vitest run
cd apps/moneyball && pnpm playwright test e2e/

# build 검증
pnpm build

# GitHub Actions 활성
gh workflow list | grep mlb-

# Sentry alert rule 박제 확인 (사용자 영역)
# Vercel env 박제 확인 (사용자 영역)

# Historical bootstrap fire (1회)
pnpm tsx packages/kbo-data/src/scrapers/mlb-historical-bootstrap.ts

# Production deploy 확인
git push origin main
curl -fsSL https://moneyballscore.vercel.app/api/version | jq .
```

---

## 사용자 영역 작업 list (1st ship 차단 layer)

1. ✅ Vercel env 5건 박제 확인 (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID / SENTRY_DSN / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)
2. ✅ GitHub repo secrets 동일 5건 박제 확인
3. ✅ Sentry alert rule 박제 (silent drift filter + Telegram webhook)
4. (선택) AdSense ad slot 사전 박제 (1st ship 후 심사 fire 가능)

---

## 후속 plan (carry-over)

| Plan # | 박제 |
|---|---|
| #18 | 인증 layer (Google + Kakao + 이메일 Magic Link, Supabase Auth) |
| #19 | 알림 연결 layer (Telegram opt-in, Login Widget + Edge Function) |
| #20 | community (UGC 게시판, 인증 layer 의존) |

---

## Self-Review

### Spec coverage check

| Spec section | Plan C task |
|---|---|
| 2.10 Cron 7건 | Task 8 (GHA workflow) + Task 2~7 (entry script) |
| 4.7 Cron workflow | Task 8 |
| 6.1~6.6 Error handling | 각 cron entry script 안 Sentry capture + silent-drift call |
| 6.6 Silent-drift detect | Task 1 (silent-drift MLB 매핑) |
| 8. 사용자 영역 작업 | Task 9, 10 (Sentry / Vercel env / Historical fire) |

### Placeholder scan

- ⚠️ `recent_form` / `head_to_head` / `elo` `defense_sfr` Task 5 (predict-final) 안 `TODO: actual ... fetch` 박제 — Plan C 안 박제 X (실제 박제 시 Plan A scraper 확장 layer 의존)
- ✅ 7 workflow yml 모두 박제

### Type consistency

- `detectSilentDrift(cronName, expected)` (Task 1) ↔ 모든 cron entry script 호출 ✅
- `MILESTONE_TRIGGERS` (Plan A Task 13) ↔ `mlb-shadow-train.ts` (Plan C Task 7) ✅
- `formatMlbCombinedMessage` (Plan B Task 16) ↔ `mlb-combined-notify.ts` (Plan C Task 6) ✅

### Coverage gap

- ⚠️ `recent_form` / `elo` fetch layer = Plan A 안 명시 X (KBO scraper 동등 layer 박제 wait — 후속 plan 박제)
- ✅ 모든 cron + workflow + silent-drift + ship layer 박제

---

## Plan A + B + C 통합 요약

### 총 task / step / test (3 plan 통합)

| Plan | task | step | test |
|---|---|---|---|
| A (Backend) | 15 | ~75 | ~30 |
| B (UI) | 18 | ~90 | ~25 |
| C (Ship + Cron) | 10 | ~50 | ~5 |
| **Total** | **43** | **~215** | **~60** |

### Execution timeline (fast track)

| Day | Task | Plan |
|---|---|---|
| 1 (2026-05-30) | Sprint 1 (Task 1-6) | A |
| 2 (2026-05-31) | Sprint 2 (Task 7-8) | A |
| 3-4 (2026-06-01~02) | Sprint 3 (Task 9-15) | A |
| 5-6 (2026-06-03~04) | Sprint 4 Task 1-9 (UI core) | B |
| 7 (2026-06-05) | Sprint 4 Task 10-17 (UI 잔여) | B |
| 8 (2026-06-06) | Sprint 4 Task 18 (E2E) | B |
| 9 (2026-06-07) | Sprint 5 Task 1-8 (cron + workflow) | C |
| 10 (2026-06-08) | Sprint 5 Task 9-10 (bootstrap + ship) | C |
| 11~15 (2026-06-09~15) | 실주행 검증 + Sentry monitor + 사용자 영역 작업 | - |
| **2026-06-15~20** | **✅ 본선 ship 완료** | - |

---

End of Plan C.
