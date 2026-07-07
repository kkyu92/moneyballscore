# plan #9 Step 2 — X1 backtest harness 통합 framework

- date: 2026-05-25
- cycle: 890
- plan_n: 9
- step: 2
- chain: explore-idea (lite)
- scope: spec only (구현 X — Step 3+ carry-over)

## 본 spec 목적

plan #9 Step 1 (cycle 889) 박제 9 신규 factor 후보 (`apps/moneyball/data/factor-candidates.json`) 를 backtest harness 에 통합하기 위한 framework 박제. 기존 `packages/kbo-data/src/backtest/` 의 `runner.ts` + `models.ts` + `loader.ts` + `types.ts` 위에 신규 factor entry pattern + Zod schema input/output validation layer 박제.

## 자가 검증 rubric (5축)

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  baseline_backtest_module: packages/kbo-data/src/backtest/ (8 파일, runner + models + loader + metrics + types + elo-history + wayback + index)
  baseline_factor_candidates: 9 (back_to_back / sp_rest_days / weather_temp / weather_wind / weather_precipitation / travel_distance / series_game_order / streak_momentum / umpire_strike_zone_bias)
  baseline_immediate_collection: 7 (back_to_back / 3 weather / travel_distance / series_game_order / streak_momentum)
  baseline_dependency_blocked: 2 (sp_rest_days / umpire_strike_zone_bias)
```

| 축 | 평가 |
|---|------|
| 가치 | medium — backtest entry 통일 + Zod schema validation 박제 = 신규 factor 추가 시 silent shape drift 차단 (사례 3/12/14 운영 코드 silent layer 패턴 사전 회피). 단 immediate 효용은 backtest fire (Step 3+) 박제 후 발생 |
| 시간 비용 | small (lite scope, spec write only) — 본 cycle 안 수렴. 구현은 Step 3+ carry-over |
| risk | 1 (light) — spec 박제만, 운영 코드 변경 0. risk 발생 시점 = Step 3 구현 시점 |
| 자율 가능 | yes (lite scope = spec write + commit + PR + R7) |
| 의존성 | 단일 — zod 의존 추가 필요 (packages/kbo-data 또는 packages/shared, apps/moneyball 만 보유 — kbo-data 가 신규 의존, Step 3 시점 박제) |

**Tier 분류**: Tier 1 (small + light, 즉시 fire, lite scope spec only)

## 현재 backtest 모듈 상태

```
packages/kbo-data/src/backtest/
├── index.ts             # public exports
├── types.ts             # BacktestGame / GameFeatures / Model / MetricsSummary / CalibrationBucket
├── models.ts            # modelCoinFlip / modelEloHomeAdv / makeRestricted / DEFAULT_RESTRICTED
├── loader.ts            # loadDecidedGames / loadGameRecords / buildFeatures / computeHomeWinRates
├── runner.ts            # runBacktest 오케스트레이터 (시즌별 prior 누적 + Brier/LogLoss/Acc)
├── metrics.ts           # computeMetrics / buildCalibration
├── elo-history.ts       # parseEloHistory / fetchEloHistory
└── wayback-team-stats.ts # SEASON_SNAPSHOTS / fetchSeasonTeamStats
```

기존 `GameFeatures` interface 는 10 base factor + 일부 game_records 기반 시점별 feature (homeBullpenInningsL3 / homeRunsL5 / homeHomeRunsL5 등) 포함. 신규 factor 9건은 본 interface 확장 + Model 함수 signature 정합.

## Step 2 본문 — backtest harness entry + Zod schema framework

### 1. `packages/kbo-data/src/backtest/harness.ts` 신규 entry 박제

```typescript
import { z } from 'zod';
import type { BacktestGame, GameFeatures, Model, MetricsSummary } from './types';
import { runBacktest } from './runner';
import { loadDecidedGames } from './loader';
import { fetchEloHistory } from './elo-history';

// =============================================================================
// Zod Schema — input validation
// =============================================================================

export const HarnessInputSchema = z.object({
  scope: z.object({
    seasonStart: z.number().int().min(2020).max(2030),
    seasonEnd: z.number().int().min(2020).max(2030),
    dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  factors: z.object({
    base: z.array(z.enum([
      'sp_fip', 'sp_xfip', 'lineup_woba', 'bullpen_fip', 'recent_form',
      'war', 'head_to_head', 'park_factor', 'elo', 'sfr',
    ])),
    candidates: z.array(z.enum([
      // immediate (7건) — Step 1 candidates 박제
      'back_to_back', 'weather_temp', 'weather_wind', 'weather_precipitation',
      'travel_distance', 'series_game_order', 'streak_momentum',
      // dependency_blocked (2건) — sp_rest_days (pitcher_stats cron) / umpire (manual scrape)
      'sp_rest_days', 'umpire_strike_zone_bias',
    ])).optional().default([]),
  }),
  weights: z.record(z.string(), z.number().min(0).max(1)),
  options: z.object({
    homeAdvantage: z.number().min(0).max(0.1).default(0.015),
    includeFancyStats: z.boolean().default(false),
    skipMissingFeatures: z.boolean().default(true),
  }).optional().default({}),
});
export type HarnessInput = z.infer<typeof HarnessInputSchema>;

// =============================================================================
// Zod Schema — output validation
// =============================================================================

export const HarnessOutputSchema = z.object({
  scope: z.object({
    seasonStart: z.number(),
    seasonEnd: z.number(),
    nGames: z.number().int().min(0),
    skippedGames: z.number().int().min(0),
  }),
  perModel: z.record(z.string(), z.object({
    n: z.number().int().min(0),
    brier: z.number(),
    logLoss: z.number(),
    accuracy: z.number().min(0).max(1),
    calibration: z.array(z.object({
      lo: z.number(),
      hi: z.number(),
      n: z.number().int().min(0),
      avgPredicted: z.number(),
      actualRate: z.number(),
    })),
  })),
  factorBreakdown: z.record(z.string(), z.object({
    weight: z.number(),
    coverage: z.number().min(0).max(1),
    nUsed: z.number().int().min(0),
    nMissing: z.number().int().min(0),
  })),
  generatedAt: z.string(),
});
export type HarnessOutput = z.infer<typeof HarnessOutputSchema>;

// =============================================================================
// Harness entry
// =============================================================================

export async function runHarness(input: unknown): Promise<HarnessOutput> {
  const validated = HarnessInputSchema.parse(input);
  // ... validated.scope / factors / weights / options 따라 model 조합 + runBacktest 호출
  // ... factorBreakdown coverage 측정 (nUsed / nMissing per factor)
  // ... HarnessOutputSchema.parse(result) 후 반환
}
```

### 2. `GameFeatures` interface 확장 (9 신규 field — Step 3 시점 박제)

```typescript
export interface GameFeatures {
  // ... 기존 10 base + game_records 시점별 feature 유지

  // ==== Step 1 candidates 9 신규 ====
  // immediate collection (7건)
  backToBackGap?: number;       // 직전 경기 ~ 본 경기 hours gap (24h = back-to-back)
  weatherTempC?: number;        // 구장 기온 (Open-Meteo, 돔구장 null)
  weatherWindKmh?: number;      // 풍속 (km/h)
  weatherWindDirDeg?: number;   // 풍향 (0-360°)
  weatherPrecipMm?: number;     // 강수량 (mm)
  travelDistanceKm?: number;    // 원정팀 이동 거리 (직전 경기 구장 → 본 경기 구장, km)
  seriesGameOrder?: 1 | 2 | 3;  // 3연전 안 몇 번째 경기 (1/2/3)
  streakMomentum?: number;      // 직전 5경기 win count - loss count

  // dependency_blocked (2건)
  spRestDays?: number;          // 선발투수 직전 등판 후 경과일 (4-6 정상 / 3- under / 7+ over)
  umpireStrikeZoneBias?: number; // 심판 strike zone bias (음수 = 좁음, 양수 = 넓음)
}
```

### 3. `Model` 함수 확장 패턴

기존 `Model = (f: GameFeatures) => number` signature 유지. 신규 factor 는 feature optional + null-safe fallback (skipMissingFeatures=true 시 missing factor 무시, false 시 baseline 가중치 적용).

```typescript
export function makeModelWithCandidates(
  baseWeights: Record<string, number>,
  candidateWeights: Record<string, number>,
  homeAdv: number = 0.015,
): Model {
  return (f: GameFeatures) => {
    // base 10 factor 가중치 합산 (기존 makeRestricted 패턴)
    let homeAdvantage = homeAdv;
    // candidate factor 9 가중치 누적 (optional null-safe)
    if (f.backToBackGap != null && candidateWeights.back_to_back) {
      // ... fatigue penalty 적용
    }
    if (f.weatherTempC != null && candidateWeights.weather_temp) {
      // ... 30°C+ 또는 10°C- 영향
    }
    // ... 나머지 candidate factor 처리
    return clamp(0.5 + homeAdvantage + /* factor 합 */, 0.05, 0.95);
  };
}
```

### 4. `factorBreakdown` coverage 측정 (silent factor drop 차단)

운영 데이터 안 신규 factor 가 null/missing 비율 측정 — backfill 진척도 가시화. coverage < 50% 시 backtest 결과 신뢰도 낮음 표시.

| factor | coverage 가능 source | 즉시 측정 가능 |
|---|---|---|
| back_to_back | games table | yes (모든 경기) |
| weather_* | games.weather JSONB | yes (cycle 287 박제, 단 backfill 범위 확인) |
| travel_distance | 정적 매핑 + games.venue | yes (구장 좌표 표 박제 후) |
| series_game_order | games table derive | yes (모든 경기) |
| streak_momentum | games table derive | yes (모든 경기) |
| sp_rest_days | pitcher_stats snapshot | no (cron 미운영 — Step 5 carry-over) |
| umpire_strike_zone_bias | manual scrape | no (수집 path 미박제) |

## Step 3+ carry-over (본 cycle 외)

| step | scope | dependency | 예상 cycle |
|---|---|---|---|
| Step 3 | harness.ts 구현 + Zod schema 박제 + zod 의존 추가 (packages/kbo-data/package.json) + unit test (Zod validate / 빈 input reject / 잘못된 factor enum reject) | zod 의존 추가 | 891 |
| Step 4 | GameFeatures 확장 (9 신규 field optional) + Model 확장 + base factor 영향 0 regression guard | Step 3 | 892 |
| Step 5 | immediate 7 factor backfill script (scripts/factor-backfill-back-to-back.ts / -weather.ts / -travel.ts / -series.ts / -streak.ts) + 박제 데이터 검증 | Step 4 | 893~895 |
| Step 6 | backtest harness fire (immediate 7 factor 가중치 grid search) + 신규 factor 가치 측정 (brier delta + accuracy delta + bootstrap CI) | Step 5 | 896~898 |
| ~~Step 7~~ **← stale (cycle 1460, 2026-07-06)** | ~~우수 factor 1-2개 선정 + v2.0 가중치 후보 박제 + plan #10 entry~~ **cycle 1447 n=161 첫 crossed → cycle 1460 plan #16 2차 fire (Brier DEFAULT 0.2443 vs Learned 0.2458, 차이 < 1pp) → v1.8 유지 확정. v2.0 후보 박제 자체 무기한 postpone.** | ~~Step 6 + n=150 도달~~ | ~~899+~~ |

## stop 조건 (본 cycle)

- 본 spec 박제 commit + PR + R7 머지 (success)
- 또는 spec 박제 partial 없음 (lite 단일 step)

## 사용자 영역 dependency (carry-over)

- pitcher_stats cron 활성 (현재 미운영) — sp_rest_days factor 진입 path 박제 시 필요
- umpire 데이터 수집 path 박제 (KBO 공식 미공개 — 별도 scrape source 필요) — umpire_strike_zone_bias factor 진입 path 박제 시 필요
- ~~n=150 도달 (현재 n=133, +17건 필요, ~7~10일) — v2.0 가중치 prod 적용 시점~~ **← stale (cycle 1460, 2026-07-06)**: n=161 첫 crossed (cycle 1447, +7~10일 → +47 cycle slip) + plan #16 2차 fire → v1.8 유지 확정 = v2.0 가중치 prod 적용 시점 자체 미도래 (v2.0 upgrade 자체 불필요).

## 자가 의심 차단

- 본 spec = framework + Zod schema 박제만, 결정 X. backtest fire / 가중치 결정 = Step 6+ 시점 evidence 누적 후
- "9 factor 모두 의미 있나?" 자가 의심 X — Step 5+ backtest evidence 측정 후 결정
- "Zod 의존 추가 비용?" 자가 의심 X — Step 3 시점 packages/kbo-data/package.json 추가 = 단일 dependency. Vercel build/test 영향 0 (kbo-data 가 apps/moneyball 의존성 = transitive 흡수)

## 박제 evidence

- plan #9 Step 1 (cycle 889): `apps/moneyball/data/factor-candidates.json` 9 후보 + immediate 7 / dependency 2 분류
- 기존 backtest infra: `packages/kbo-data/src/backtest/` 8 파일 (runner + models + loader + metrics + types + elo-history + wayback + index)
- 기존 entry: `scripts/backtest.ts` (실시간 fetch 패턴) + `packages/kbo-data/src/pipeline/backtest-*-run.ts` (6 variant)
- plan #8 cycle 887: score-backtest harness 박제 (lotto rule 점수 매기기) — 본 plan #9 X1 은 moneyball factor 가중치 backtest 안 신규 factor 통합 framework (별도 scope)
