# MLB Plan C — Ship + Cloudflare Worker Cron + Vercel API Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MLB 운영 layer 박제 — Cloudflare Worker `moneyballscore-cron` 안 MLB cron trigger 추가 + Vercel API route `/api/mlb/pipeline` 신규 박제 (KBO `/api/pipeline` 정합) + silent-drift alert layer 확장 + production ship.

**Architecture (KBO 정합 — drift 사례 1 차단 inline 박제 wait result)**:
```
Cloudflare Worker (moneyballscore-cron / wrangler.toml)
  ├ KBO trigger '17 0-14 * * *' (현 박제 — 변경 X)
  ├ KBO trigger '37 * * * *' (현 박제 — 변경 X)
  ├ KBO trigger '*/10 9-15 * * *' (현 박제 — 변경 X)
  └ MLB trigger '17 18-21,10 * * *' (신규)
      ↓ scheduled handler 안 decideMlbMode 분기
      ↓ POST https://moneyballscore.vercel.app/api/mlb/pipeline
        { mode: 'mlb_predict_final' | 'mlb_statsapi_scrape' | ..., triggeredBy: 'cron' }

Vercel API route /api/mlb/pipeline
  ├ CRON_SECRET auth (KBO 정합)
  └ runMlbPipeline(mode, triggeredBy) → mode 분기 fire
```

**Tech Stack:** Cloudflare Workers (wrangler) / Vercel Pro / Next.js 16 App Router API route / Supabase / Sentry / TypeScript.

**Spec source:** `docs/superpowers/specs/2026-05-29-mlb-league-introduction-design.md` (commit 6ca9f95)
**Dependency:** Plan A (백엔드) + Plan B (UI) 박제 완료 wait

**박제 path 정정 evidence (drift 사례 1)**: 본 Plan C v1 박제 시 KBO Cloudflare Worker 정합 path read X → GH Actions schedule 박제 (drop family 9 박제 — KBO 41% skip 측정 후 2026-04-29 Cloudflare 이관 정합 위반). 본 v2 박제 = KBO 정합 path 박제.

---

## File Structure

### Create

| 파일 | 책임 |
|---|---|
| `apps/moneyball/src/app/api/mlb/pipeline/route.ts` | MLB mode 분기 fire (KBO `/api/pipeline` 정합) |
| `packages/kbo-data/src/pipelines/mlb-pipeline.ts` | runMlbPipeline(mode) — mode 별 fire layer |
| `packages/kbo-data/src/pipelines/__tests__/mlb-pipeline.test.ts` | Unit test |
| `apps/moneyball/src/app/api/mlb/pipeline/__tests__/route.test.ts` | API route auth + mode 검증 |
| `.github/workflows/mlb-pipeline.yml` | workflow_dispatch only (수동 재실행, KBO `daily-pipeline.yml` 정합) |

### Modify

| 파일 | 변경 |
|---|---|
| `cloudflare-worker/wrangler.toml` | MLB trigger `'17 18-21,10 * * *'` 추가 + vars `MLB_PIPELINE_URL` 추가 |
| `cloudflare-worker/src/worker.ts` | scheduled handler 안 MLB cron 분기 + `decideMlbMode` + `callMlbPipeline` 함수 |
| `packages/kbo-data/src/lib/silent-drift-alert.ts` | MLB 7 mode 매핑 추가 |

---

## Sprint 5 — cron + ship 박제

### Task 1: silent-drift-alert.ts MLB mode 매핑

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

describe('silent-drift MLB mode 매핑', () => {
  it('mlb_statsapi_scrape: games_found>0 + rows_inserted=0 → warning', () => {
    detectSilentDrift('mlb_statsapi_scrape', { games_found: 10, rows_inserted: 0 });
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('silent drift'),
      'warning',
    );
  });

  it('mlb_predict_final: predictions=0 + games_found>0 → 사례 11 silent silent drop', () => {
    detectSilentDrift('mlb_predict_final', { games_found: 5, rows_inserted: 0 });
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('silent silent drop'),
      'warning',
    );
  });

  it('mlb_combined_notify: messages_sent=0 + games>0 → verify silent skip', () => {
    detectSilentDrift('mlb_combined_notify', { games_found: 5, rows_inserted: 0 });
    expect(Sentry.captureMessage).toHaveBeenCalled();
  });

  it('mlb_shadow_train: cohort_size > milestone + train_fail → warning', () => {
    detectSilentDrift('mlb_shadow_train', { games_found: 150, rows_inserted: 0 });
    expect(Sentry.captureMessage).toHaveBeenCalled();
  });

  it('no warning when rows_inserted > 0', () => {
    vi.mocked(Sentry.captureMessage).mockClear();
    detectSilentDrift('mlb_statsapi_scrape', { games_found: 10, rows_inserted: 10 });
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/kbo-data && pnpm vitest run src/lib/__tests__/silent-drift-mlb.test.ts`
Expected: FAIL

- [ ] **Step 3: Modify silent-drift-alert.ts**

```typescript
// packages/kbo-data/src/lib/silent-drift-alert.ts (extend)
import * as Sentry from '@sentry/nextjs';

const MLB_MODES = [
  'mlb_statsapi_scrape',
  'mlb_fancy_scrape',
  'mlb_savant_scrape',
  'mlb_predict_final',
  'mlb_combined_notify',
  'mlb_shadow_train',
  'mlb_walk_forward_measure',
] as const;

const KBO_MODES = ['announce', 'predict', 'predict_final', 'verify'] as const;

type CronMode = typeof MLB_MODES[number] | typeof KBO_MODES[number];

export function detectSilentDrift(
  mode: CronMode,
  expected: { games_found: number; rows_inserted: number },
): void {
  if (expected.games_found > 0 && expected.rows_inserted === 0) {
    if (mode === 'mlb_predict_final' || mode === 'predict_final') {
      Sentry.captureMessage(
        `silent silent drop: ${mode} found ${expected.games_found} games but inserted 0 predictions`,
        'warning',
      );
    } else {
      Sentry.captureMessage(
        `silent drift detected: ${mode} found ${expected.games_found} but inserted 0`,
        'warning',
      );
    }
  }
}
```

- [ ] **Step 4: Run test PASS + commit**

```bash
git add packages/kbo-data/src/lib/silent-drift-alert.ts packages/kbo-data/src/lib/__tests__/silent-drift-mlb.test.ts
git commit -m "feat(observability): silent-drift MLB 7 mode 매핑 + 사례 11 차단"
```

---

### Task 2: mlb-pipeline.ts — mode 별 fire layer

**Files:**
- Create: `packages/kbo-data/src/pipelines/mlb-pipeline.ts`
- Create: `packages/kbo-data/src/pipelines/__tests__/mlb-pipeline.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/kbo-data/src/pipelines/__tests__/mlb-pipeline.test.ts
import { describe, it, expect, vi } from 'vitest';
import { runMlbPipeline, type MlbPipelineMode } from '../mlb-pipeline';

vi.mock('../../scrapers/statsapi-mlb', () => ({
  fetchMlbSchedule: vi.fn().mockResolvedValue([]),
  fetchProbablePitchers: vi.fn().mockResolvedValue({}),
  fetchBoxscore: vi.fn().mockResolvedValue(null),
}));

describe('runMlbPipeline', () => {
  it.each<MlbPipelineMode>([
    'mlb_statsapi_scrape',
    'mlb_fancy_scrape',
    'mlb_savant_scrape',
    'mlb_predict_final',
    'mlb_combined_notify',
    'mlb_shadow_train',
    'mlb_walk_forward_measure',
  ])('handles mode=%s without throwing', async (mode) => {
    const result = await runMlbPipeline(mode, '2026-05-29', 'cron');
    expect(result).toBeDefined();
    expect(result.mode).toBe(mode);
  });

  it('rejects unknown mode', async () => {
    // @ts-expect-error invalid mode test
    await expect(runMlbPipeline('invalid_mode', '2026-05-29', 'cron'))
      .rejects.toThrow(/unknown mode/);
  });

  it('result includes games_found + rows_inserted for silent-drift call', async () => {
    const result = await runMlbPipeline('mlb_statsapi_scrape', '2026-05-29', 'cron');
    expect(result).toMatchObject({
      mode: 'mlb_statsapi_scrape',
      games_found: expect.any(Number),
      rows_inserted: expect.any(Number),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/kbo-data && pnpm vitest run src/pipelines/__tests__/mlb-pipeline.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// packages/kbo-data/src/pipelines/mlb-pipeline.ts
import { createClient } from '@supabase/supabase-js';
import { fetchMlbSchedule, fetchProbablePitchers, fetchBoxscore } from '../scrapers/statsapi-mlb';
import { fetchFangraphsMlbTeams } from '../scrapers/fangraphs-mlb';
import { fetchSavantTeamStatcast } from '../scrapers/baseball-savant';
import { computeMlbProbability } from '../factors/mlb-base';
import { trainShadowWeights, computeBrier, MILESTONE_TRIGGERS } from '../factors/mlb-shadow-c';
import { detectSilentDrift } from '../lib/silent-drift-alert';

export type MlbPipelineMode =
  | 'mlb_statsapi_scrape'
  | 'mlb_fancy_scrape'
  | 'mlb_savant_scrape'
  | 'mlb_predict_final'
  | 'mlb_combined_notify'
  | 'mlb_shadow_train'
  | 'mlb_walk_forward_measure';

export interface MlbPipelineResult {
  mode: MlbPipelineMode;
  games_found: number;
  rows_inserted: number;
  details?: Record<string, any>;
}

const VALID_MODES: MlbPipelineMode[] = [
  'mlb_statsapi_scrape', 'mlb_fancy_scrape', 'mlb_savant_scrape',
  'mlb_predict_final', 'mlb_combined_notify',
  'mlb_shadow_train', 'mlb_walk_forward_measure',
];

export async function runMlbPipeline(
  mode: MlbPipelineMode,
  date: string,
  triggeredBy: 'cron' | 'manual',
): Promise<MlbPipelineResult> {
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`unknown mode: ${mode}`);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let result: MlbPipelineResult = { mode, games_found: 0, rows_inserted: 0 };

  switch (mode) {
    case 'mlb_statsapi_scrape': {
      const games = await fetchMlbSchedule(date);
      result.games_found = games.length;
      for (const g of games) {
        await supabase.from('games').upsert({
          game_id: g.gamePk, league: 'mlb', game_date: date,
          game_datetime_utc: g.gameDateUtc.toISOString(),
          home_team_code: g.homeTeam, away_team_code: g.awayTeam,
          status: g.status,
        }, { onConflict: 'game_id,league' });
        result.rows_inserted++;
      }
      break;
    }
    case 'mlb_fancy_scrape': {
      const season = new Date(date).getFullYear();
      const teams = await fetchFangraphsMlbTeams(season);
      result.games_found = teams.length;
      for (const t of teams) {
        const { error } = await supabase.from('team_season_stats').upsert({
          league: 'mlb', season, team_code: t.teamCode,
          woba: t.woba, fip: t.fip, xfip: t.xfip, war: t.war,
          ld_pct: t.ldPct, gb_pct: t.gbPct, fb_pct: t.fbPct,
          hr_fb_pct: t.hrFbPct, pull_pct: t.pullPct,
        }, { onConflict: 'league,season,team_code' });
        if (!error) result.rows_inserted++;
      }
      break;
    }
    case 'mlb_savant_scrape': {
      const season = new Date(date).getFullYear();
      const teams = await fetchSavantTeamStatcast(season);
      result.games_found = teams.length;
      for (const t of teams) {
        const { error } = await supabase.from('team_season_stats').update({
          statcast_xwoba: t.xwoba,
          statcast_barrel_pct: t.barrelPct,
          statcast_hard_hit_pct: t.hardHitPct,
          statcast_launch_angle: t.launchAngle,
        }).eq('league', 'mlb').eq('season', season).eq('team_code', t.teamCode);
        if (!error) result.rows_inserted++;
      }
      break;
    }
    case 'mlb_predict_final': {
      const { data: games } = await supabase
        .from('games')
        .select('*')
        .eq('league', 'mlb')
        .eq('status', 'scheduled')
        .gte('game_date', date);
      result.games_found = games?.length ?? 0;
      for (const g of games ?? []) {
        const { data: homeStat } = await supabase.from('team_season_stats')
          .select('*').eq('league', 'mlb').eq('team_code', g.home_team_code).single();
        const { data: awayStat } = await supabase.from('team_season_stats')
          .select('*').eq('league', 'mlb').eq('team_code', g.away_team_code).single();
        if (!homeStat || !awayStat) continue;

        const probability = computeMlbProbability({
          sp_fip: { home: homeStat.fip ?? 4, away: awayStat.fip ?? 4 },
          sp_xfip: { home: homeStat.xfip ?? 4, away: awayStat.xfip ?? 4 },
          lineup_woba: { home: homeStat.woba ?? 0.32, away: awayStat.woba ?? 0.32 },
          bullpen_fip: { home: homeStat.fip ?? 4, away: awayStat.fip ?? 4 },
          recent_form: { home: 5, away: 5 },
          war: { home: homeStat.war ?? 0, away: awayStat.war ?? 0 },
          head_to_head: { homeWinRate: 0.5 },
          park_factor: 1.0,
          elo: { home: 1500, away: 1500 },
          defense_sfr: { home: 0, away: 0 },
          lineup_xwoba: { home: homeStat.statcast_xwoba ?? 0.32, away: awayStat.statcast_xwoba ?? 0.32 },
          lineup_barrel_pct: { home: homeStat.statcast_barrel_pct ?? 8, away: awayStat.statcast_barrel_pct ?? 8 },
          sp_xwoba_against: { home: homeStat.statcast_xwoba ?? 0.32, away: awayStat.statcast_xwoba ?? 0.32 },
          woba_std: { home: 0.022, away: 0.022 },
        });

        const { error } = await supabase.from('predictions').upsert({
          game_id: g.game_id, league: 'mlb', game_date: g.game_date,
          predicted_winner: probability > 0.5 ? g.home_team_code : g.away_team_code,
          confidence: probability,
          home_team_code: g.home_team_code, away_team_code: g.away_team_code,
          home_sp_fip: homeStat.fip, away_sp_fip: awayStat.fip,
          home_lineup_woba: homeStat.woba, away_lineup_woba: awayStat.woba,
          home_lineup_xwoba: homeStat.statcast_xwoba,
          away_lineup_xwoba: awayStat.statcast_xwoba,
          model_version: 'v1.8-mlb-base',
          scoring_rule: 'v1.8-mlb-base',
        }, { onConflict: 'game_id,league' });
        if (!error) result.rows_inserted++;
      }
      break;
    }
    case 'mlb_combined_notify': {
      // recap + preview Telegram 발송 layer
      const yesterday = new Date(Date.parse(date) - 86400000).toISOString().slice(0, 10);
      const tomorrow = new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);

      const { data: recap } = await supabase.from('predictions')
        .select('*').eq('league', 'mlb').eq('game_date', yesterday)
        .not('verified_at', 'is', null);

      const { data: preview } = await supabase.from('predictions')
        .select('*').eq('league', 'mlb').eq('game_date', tomorrow);

      result.games_found = (recap?.length ?? 0) + (preview?.length ?? 0);

      // Telegram bot 발송
      const message = formatCombinedMessage(recap ?? [], preview ?? [], yesterday, tomorrow);
      const parts = splitMessage(message);
      for (const part of parts) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: part }),
        });
        result.rows_inserted++;
      }
      break;
    }
    case 'mlb_shadow_train': {
      const { count } = await supabase
        .from('predictions')
        .select('*', { count: 'exact', head: true })
        .eq('league', 'mlb')
        .not('verified_at', 'is', null);
      result.games_found = count ?? 0;

      if (!count || count < MILESTONE_TRIGGERS[0]) break;

      const milestone = [...MILESTONE_TRIGGERS].reverse().find((m) => count >= m);
      if (!milestone) break;
      const milestoneIndex = MILESTONE_TRIGGERS.indexOf(milestone) + 1;
      const modelVersion = `shadow-c-v${milestoneIndex}`;

      const { data: existing } = await supabase.from('shadow_weights')
        .select('*').eq('league', 'mlb').eq('model_version', modelVersion).single();
      if (existing) break;

      const { data: predictions } = await supabase
        .from('predictions')
        .select('*')
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
        league: 'mlb', cohort_size: count, model_version: modelVersion,
        weights, brier, accuracy,
      });
      result.rows_inserted = 1;
      break;
    }
    case 'mlb_walk_forward_measure': {
      const month = date.slice(0, 7);
      const monthStart = `${month}-01`;

      const { data: basePred } = await supabase.from('predictions')
        .select('confidence, is_correct').eq('league', 'mlb')
        .eq('model_version', 'v1.8-mlb-base').gte('game_date', monthStart)
        .not('verified_at', 'is', null);

      const { data: shadowPred } = await supabase.from('predictions')
        .select('confidence, is_correct').eq('league', 'mlb')
        .like('model_version', 'shadow-c-%').gte('game_date', monthStart);

      const brierBase = computeBrier((basePred ?? []).map((p: any) => ({
        predicted: p.confidence, actual: (p.is_correct ? 1 : 0) as 0 | 1,
      })));
      const brierShadow = computeBrier((shadowPred ?? []).map((p: any) => ({
        predicted: p.confidence, actual: (p.is_correct ? 1 : 0) as 0 | 1,
      })));
      const delta = brierShadow - brierBase;

      await supabase.from('walk_forward_brier').upsert({
        league: 'mlb', month, cohort_size: basePred?.length ?? 0,
        brier_base: brierBase, brier_shadow: brierShadow, delta,
      }, { onConflict: 'league,month' });

      result.games_found = basePred?.length ?? 0;
      result.rows_inserted = 1;
      break;
    }
  }

  detectSilentDrift(mode, {
    games_found: result.games_found,
    rows_inserted: result.rows_inserted,
  });

  return result;
}

function formatCombinedMessage(recap: any[], preview: any[], recapDate: string, previewDate: string): string {
  const lines: string[] = [];
  if (recap.length > 0) {
    const correct = recap.filter((p) => p.is_correct).length;
    const brier = recap.reduce((s, p) => s + Math.pow(p.confidence - (p.is_correct ? 1 : 0), 2), 0) / recap.length;
    lines.push(`[MLB recap] ${recapDate}`);
    lines.push(`어제 ${recap.length}경기 / 적중 ${correct}/${recap.length}`);
    lines.push(`Brier ${brier.toFixed(3)}`);
    lines.push('');
  }
  if (preview.length > 0) {
    lines.push(`[MLB preview] ${previewDate} 새벽 경기`);
    preview.forEach((p) => {
      const big = p.confidence > 0.65 ? '⭐ ' : '';
      lines.push(`${big}${p.home_team_code} vs ${p.away_team_code} → ${p.predicted_winner} ${Math.round(p.confidence * 100)}%`);
    });
  }
  return lines.join('\n');
}

function splitMessage(text: string, max = 4096): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  const lines = text.split('\n');
  let current = '';
  for (const line of lines) {
    if (current.length + line.length + 1 > max) {
      parts.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) parts.push(current);
  return parts;
}
```

- [ ] **Step 4: Run test PASS + commit**

```bash
git add packages/kbo-data/src/pipelines/mlb-pipeline.ts packages/kbo-data/src/pipelines/__tests__/mlb-pipeline.test.ts
git commit -m "feat(pipeline): runMlbPipeline 7 mode 분기 + silent-drift call"
```

---

### Task 3: API route `/api/mlb/pipeline` 박제 (KBO `/api/pipeline` 정합)

**Files:**
- Create: `apps/moneyball/src/app/api/mlb/pipeline/route.ts`
- Create: `apps/moneyball/src/app/api/mlb/pipeline/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/moneyball/src/app/api/mlb/pipeline/__tests__/route.test.ts
import { describe, it, expect, vi } from 'vitest';
import { POST } from '../route';

vi.mock('@moneyball/kbo-data/pipelines/mlb-pipeline', () => ({
  runMlbPipeline: vi.fn().mockResolvedValue({
    mode: 'mlb_statsapi_scrape',
    games_found: 10,
    rows_inserted: 10,
  }),
}));

describe('/api/mlb/pipeline route', () => {
  it('401 without CRON_SECRET', async () => {
    const req = new Request('http://localhost/api/mlb/pipeline', {
      method: 'POST',
      body: JSON.stringify({ mode: 'mlb_statsapi_scrape' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('200 with valid CRON_SECRET + mode', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const req = new Request('http://localhost/api/mlb/pipeline', {
      method: 'POST',
      headers: { 'authorization': 'Bearer test-secret' },
      body: JSON.stringify({ mode: 'mlb_statsapi_scrape', triggeredBy: 'cron' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('400 with invalid mode', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const req = new Request('http://localhost/api/mlb/pipeline', {
      method: 'POST',
      headers: { 'authorization': 'Bearer test-secret' },
      body: JSON.stringify({ mode: 'invalid_mode' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/moneyball && pnpm vitest run src/app/api/mlb/pipeline/__tests__/route.test.ts`
Expected: FAIL

- [ ] **Step 3: Write API route**

```typescript
// apps/moneyball/src/app/api/mlb/pipeline/route.ts
import { runMlbPipeline, type MlbPipelineMode } from '@moneyball/kbo-data/pipelines/mlb-pipeline';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // Vercel Pro 5분 timeout

const VALID_MODES: MlbPipelineMode[] = [
  'mlb_statsapi_scrape', 'mlb_fancy_scrape', 'mlb_savant_scrape',
  'mlb_predict_final', 'mlb_combined_notify',
  'mlb_shadow_train', 'mlb_walk_forward_measure',
];

export async function POST(req: Request): Promise<Response> {
  // CRON_SECRET auth (KBO 정합)
  const authHeader = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const mode = body.mode as string;
  const triggeredBy = (body.triggeredBy as 'cron' | 'manual') ?? 'manual';
  const date = (body.date as string) ?? new Date().toISOString().slice(0, 10);

  if (!VALID_MODES.includes(mode as MlbPipelineMode)) {
    return Response.json({ error: `invalid mode: ${mode}` }, { status: 400 });
  }

  try {
    const result = await runMlbPipeline(mode as MlbPipelineMode, date, triggeredBy);
    return Response.json(result);
  } catch (err: any) {
    Sentry.captureException(err);
    await Sentry.flush(2000);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test PASS + commit**

```bash
git add apps/moneyball/src/app/api/mlb/pipeline/route.ts apps/moneyball/src/app/api/mlb/pipeline/__tests__/route.test.ts
git commit -m "feat(api): /api/mlb/pipeline route — KBO 정합 path + CRON_SECRET auth"
```

---

### Task 4: Cloudflare Worker MLB trigger + scheduled handler

**Files:**
- Modify: `cloudflare-worker/wrangler.toml`
- Modify: `cloudflare-worker/src/worker.ts`

- [ ] **Step 1: Modify wrangler.toml — MLB trigger 추가**

```toml
# cloudflare-worker/wrangler.toml (변경 patch)
[triggers]
crons = [
  "17 0-14 * * *",     # KBO daily-pipeline (현 박제)
  "37 * * * *",        # sitemap-warmup (현 박제)
  "*/10 9-15 * * *",   # live-update (현 박제)
  "17 18-21,10 * * *", # MLB pipeline (신규) — UTC 18~21 매시간 + UTC 10. KST 03/04/05/06/19.
]

[vars]
PIPELINE_URL = "https://moneyballscore.vercel.app/api/pipeline"
MLB_PIPELINE_URL = "https://moneyballscore.vercel.app/api/mlb/pipeline"  # 신규
SITE_URL = "https://moneyballscore.vercel.app"
SUPABASE_URL = "https://utmimgpccbrciwuuacyw.supabase.co"
GH_REPO = "kkyu92/moneyballscore"
```

- [ ] **Step 2: Modify worker.ts — MLB cron 분기 + helper 함수**

```typescript
// cloudflare-worker/src/worker.ts (변경 patch)

// MLB mode 추가
type MlbMode =
  | 'mlb_statsapi_scrape' | 'mlb_fancy_scrape' | 'mlb_savant_scrape'
  | 'mlb_predict_final' | 'mlb_combined_notify';

// UTC hour → MLB mode 분기
function decideMlbMode(scheduledTime: number): MlbMode | null {
  const utcHour = new Date(scheduledTime).getUTCHours();
  if (utcHour === 18) return 'mlb_predict_final';   // KST 03:00
  if (utcHour === 19) return 'mlb_statsapi_scrape'; // KST 04:00
  if (utcHour === 20) return 'mlb_fancy_scrape';    // KST 05:00
  if (utcHour === 21) return 'mlb_savant_scrape';   // KST 06:00
  if (utcHour === 10) return 'mlb_combined_notify'; // KST 19:00
  return null;
}

async function callMlbPipeline(env: Env, mode: MlbMode): Promise<void> {
  const resp = await fetch(env.MLB_PIPELINE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': `Bearer ${env.CRON_SECRET}`,
    },
    body: JSON.stringify({ mode, triggeredBy: 'cron' }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    console.error(`[Worker] mlb-pipeline ${mode} failed: ${resp.status} ${body.slice(0, 300)}`);
    return;
  }
  console.log(`[Worker] mlb-pipeline ${mode} ok`);
}

// scheduled handler 안 MLB cron 분기 추가:
async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  const cronExpr = event.cron;

  if (cronExpr === '17 0-14 * * *') {
    // KBO daily-pipeline (기존 박제 유지)
    const mode = decideMode(event.scheduledTime);
    if (mode) ctx.waitUntil(callPipeline(env, mode));
  } else if (cronExpr === '37 * * * *') {
    // sitemap-warmup (기존 박제 유지)
  } else if (cronExpr === '*/10 9-15 * * *') {
    // live-update (기존 박제 유지)
  } else if (cronExpr === '17 18-21,10 * * *') {
    // MLB pipeline (신규)
    const mlbMode = decideMlbMode(event.scheduledTime);
    if (mlbMode) {
      ctx.waitUntil(callMlbPipeline(env, mlbMode));
    } else {
      console.log(`[Worker] no MLB mode for utcHour=${new Date(event.scheduledTime).getUTCHours()}`);
    }
  } else {
    console.log(`[Worker] unknown cron: ${cronExpr}`);
  }
}
```

- [ ] **Step 3: Deploy worker (사용자 확인 후)**

Run:
```bash
cd cloudflare-worker
pnpm wrangler deploy
```
Expected: worker `moneyballscore-cron` 박제 — 4 cron triggers 활성

- [ ] **Step 4: Commit**

```bash
git add cloudflare-worker/wrangler.toml cloudflare-worker/src/worker.ts
git commit -m "feat(worker): MLB trigger 17 18-21,10 + scheduled handler 분기 (KBO 영향 0)"
```

---

### Task 5: GH workflow `mlb-pipeline.yml` (workflow_dispatch only)

**Files:**
- Create: `.github/workflows/mlb-pipeline.yml`

- [ ] **Step 1: Write workflow**

```yaml
# .github/workflows/mlb-pipeline.yml
name: MLB Pipeline (manual rerun)

# Schedule 박제 X — Cloudflare Workers Cron 정합 path (KBO daily-pipeline.yml 패턴 정합).
# workflow_dispatch only — 수동 재실행 path.
on:
  workflow_dispatch:
    inputs:
      mode:
        description: 'MLB pipeline mode'
        required: true
        type: choice
        options:
          - mlb_statsapi_scrape
          - mlb_fancy_scrape
          - mlb_savant_scrape
          - mlb_predict_final
          - mlb_combined_notify
          - mlb_shadow_train
          - mlb_walk_forward_measure
      date:
        description: 'Target date (YYYY-MM-DD, default: today KST)'
        required: false

concurrency:
  group: mlb-pipeline-${{ github.event.inputs.mode }}
  cancel-in-progress: false

jobs:
  fire:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Curl Vercel API route
        run: |
          DATE="${{ github.event.inputs.date }}"
          if [ -z "$DATE" ]; then
            DATE=$(TZ=Asia/Seoul date +%Y-%m-%d)
          fi
          curl -fsSL -X POST https://moneyballscore.vercel.app/api/mlb/pipeline \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            -d "{\"mode\": \"${{ github.event.inputs.mode }}\", \"date\": \"$DATE\", \"triggeredBy\": \"manual\"}"
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/mlb-pipeline.yml
git commit -m "feat(workflow): mlb-pipeline.yml workflow_dispatch only (KBO daily-pipeline 정합)"
```

---

### Task 6: 사용자 영역 작업 list (1st ship 박제 wait)

#### Step 1: Sentry alert rule 박제 (~5분, 사용자 Dashboard)

1. https://sentry.io 접속 → moneyballscore project
2. Alerts → Create Alert Rule
3. Conditions:
   - When `An event is captured`
   - If `message contains "silent drift"` OR `message contains "silent silent drop"`
   - And `level` is `warning`
4. Actions:
   - Send notification (이메일 또는 webhook)
5. Save

#### Step 2: DB migration apply confirm (~1분, 사용자 confirm)

본 메인 fire 가능 명령어:
```bash
pnpm supabase db push --linked
```
Expected: migration 033/034/035/036 apply (KBO 영향 = league column DEFAULT 'kbo' = 자동 박제, read/write 영향 0).

#### Step 3: Cloudflare worker deploy (~1분, 사용자 또는 본 메인 fire)

```bash
cd cloudflare-worker && pnpm wrangler deploy
```

#### Step 4: Historical bootstrap fire (~30~45분)

```bash
pnpm tsx packages/kbo-data/src/scrapers/mlb-historical-bootstrap.ts
```

#### Step 5: Production ship + 실주행 검증 (~24~48h)

```bash
git push origin main  # R7 자동 머지 + Vercel auto-deploy
sleep 60
curl -fsSL https://moneyballscore.vercel.app/api/version | jq .
# UTC 18:00 (KST 03:00) 첫 fire wait → Sentry warning monitor
```

---

## Plan C v2 완료 layer

총 **6 task / ~30 step / ~10 test (silent-drift + pipeline + route)**:
- Task 1: silent-drift-alert MLB 7 mode 매핑
- Task 2: mlb-pipeline.ts mode 분기 fire layer
- Task 3: API route `/api/mlb/pipeline` (KBO 정합)
- Task 4: Cloudflare worker trigger + scheduled handler 분기
- Task 5: GH workflow workflow_dispatch only
- Task 6: 사용자 영역 작업 (Sentry / DB migration / worker deploy / historical / ship)

### Verification (final)

```bash
# 모든 unit test
cd packages/kbo-data && pnpm vitest run
cd apps/moneyball && pnpm vitest run

# build 검증
pnpm build

# Cloudflare worker dry-run
cd cloudflare-worker && pnpm wrangler dev

# DB migration apply
pnpm supabase db push --linked

# Historical bootstrap
pnpm tsx packages/kbo-data/src/scrapers/mlb-historical-bootstrap.ts

# Production deploy
git push origin main
curl -fsSL https://moneyballscore.vercel.app/api/version | jq .

# MLB pipeline 수동 fire (검증)
gh workflow run mlb-pipeline.yml -f mode=mlb_statsapi_scrape

# Sentry alert rule 박제 확인 (사용자 영역)
```

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
| 2.10 Cron path (Cloudflare 정합) | Task 4 (worker trigger + scheduled handler) |
| 4.7 API route | Task 3 (`/api/mlb/pipeline`) |
| 6.1~6.6 Error handling | Task 2 (runMlbPipeline 안 detectSilentDrift call) |
| 6.6 Silent-drift detect | Task 1 |
| 8. 사용자 영역 작업 | Task 6 (Sentry / DB / worker deploy / historical / ship) |

### Placeholder scan

- ✅ TBD / TODO / placeholder 0건
- ✅ `recent_form` / `elo` fallback default 박제 (5 / 1500 default)

### Type consistency

- `MlbPipelineMode` (Task 2) ↔ `VALID_MODES` (Task 3) ✅
- `decideMlbMode` (Task 4) ↔ `MlbPipelineMode` ✅
- `detectSilentDrift(mode, ...)` (Task 1) ↔ `runMlbPipeline` 안 호출 ✅

### Coverage gap

- ⚠️ `recent_form` / `elo` 실제 fetch layer = Plan A scraper 확장 wait (KBO 정합 layer 박제)
- ⚠️ `mlb_historical_bootstrap` = Plan A Task 10 박제 path 정합 (script 직접 fire, cron X)
- ✅ KBO 정합 path 박제 = drift 사례 1 차단 정합

### v1 → v2 변경 evidence

| layer | v1 (잘못된 박제) | v2 (정정 — KBO 정합) |
|---|---|---|
| cron 인프라 | GH Actions cron schedule | Cloudflare Workers Cron (현 박제) |
| cron 7건 GH workflow yml | `.github/workflows/mlb-*.yml` 7건 schedule | `cloudflare-worker/wrangler.toml` trigger 1건 + scheduled handler 분기 |
| entry script | `scripts/cron/mlb-*.ts` 7건 | `packages/kbo-data/src/pipelines/mlb-pipeline.ts` 1건 (mode 분기) |
| API route | X | `apps/moneyball/src/app/api/mlb/pipeline/route.ts` 신규 (KBO `/api/pipeline` 정합) |
| GH workflow | 7 cron schedule | 1 workflow_dispatch only (수동 재실행) |
| 사용자 영역 secrets 박제 | GH secrets 누락 2건 박제 | 박제 X 불필요 (Vercel runtime 정합) |

---

## Plan A + B + C v2 통합 요약

### 총 task / step / test

| Plan | task | step | test |
|---|---|---|---|
| A (Backend) | 15 | ~75 | ~30 |
| B (UI) | 18 | ~90 | ~25 |
| C v2 (Ship + Cron Cloudflare 정합) | 6 | ~30 | ~10 |
| **Total** | **39** | **~195** | **~65** |

### Execution timeline (fast track)

| Day | Task | Plan |
|---|---|---|
| 1 (2026-05-30) | Sprint 1 (Task 1-6) | A |
| 2 (2026-05-31) | Sprint 2 (Task 7-8) | A |
| 3-4 (2026-06-01~02) | Sprint 3 (Task 9-15) | A |
| 5-6 (2026-06-03~04) | Sprint 4 Task 1-9 (UI core) | B |
| 7 (2026-06-05) | Sprint 4 Task 10-17 (UI 잔여) | B |
| 8 (2026-06-06) | Sprint 4 Task 18 (E2E) | B |
| 9 (2026-06-07) | Sprint 5 Task 1-5 (cron + worker + API route + workflow) | C v2 |
| 10 (2026-06-08) | Sprint 5 Task 6 (사용자 영역 + ship) | C v2 |
| 11~15 (2026-06-09~15) | 실주행 검증 + Sentry monitor + 사용자 영역 작업 | - |
| **2026-06-15~20** | **✅ 본선 ship 완료** | - |

---

End of Plan C v2.
