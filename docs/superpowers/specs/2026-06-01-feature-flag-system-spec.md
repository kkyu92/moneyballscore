# Feature Flag System — 신규 예측 모델/로직 안전 배포 spec

**cycle**: 1114 (expand-scope, lite)
**source**: hub-dispatch issue #1370 ([Scout] Cloudflare Flagship 기능 플래그 도입)
**author**: develop-cycle main
**status**: draft (spec only — 구현 별도 사이클)
**target_chain (다음)**: explore-idea (heavy, Tier 1 구현) 또는 사용자 review
**expiry**: 2026-08-01

## 0. 자가 검증 (5축 rubric)

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  value:
    tier_1: high  # v2.0 cohort 전환 시 kill switch + canary 직접 사용
    tier_2: medium  # telemetry — observability 강화
    tier_3: low  # 외부 SaaS — beneficial 가 free tier 제약
  time_cost:
    tier_1: small  # 기존 feature-flags.ts + model-version-labels.ts 확장 (≤ 200 LOC)
    tier_2: medium  # Supabase flag_evaluations 테이블 + RLS + ingest endpoint
    tier_3: large  # 외부 SaaS 통합 + 비용 검토
  risk:
    tier_1: 1  # light noise (env flag = 운영 검증 패턴 기존 BIGMATCH_ENABLED 재사용)
    tier_2: 2  # 결정 위험 (RLS / privacy / event 폭증)
    tier_3: 3  # critical (외부 비용 + vendor lock-in)
  autonomy:
    tier_1: yes  # 본 메인 직접 fire 1 cycle 안 수렴 가능
    tier_2: partial  # supabase migration + env 추가 사용자 영역 일부
    tier_3: no  # 외부 결제 / 사용자 결정
  dependency:
    tier_1: none  # 기존 model-version-labels.ts + feature-flags.ts
    tier_2: single  # supabase schema 추가
    tier_3: multiple  # 외부 SaaS + telemetry + 사용자 결정
  tier_split:
    tier_1: 본 spec scope (다음 expand-scope/explore-idea 사이클 ship 후보)
    tier_2: carry-over spec (별도 cycle)
    tier_3: 사용자 영역 (wait)
```

## 1. 기존 인프라 (현황)

primitive feature flag 패턴이 이미 존재. 신규 추가가 아닌 **확장**.

### 1.1 model version cohort split

`packages/shared/src/model-version-labels.ts`:

```ts
export const CURRENT_SCORING_RULE: ScoringRule = 'v1.8';
export const QUANT_PREGAME_VERSION: ModelVersion = CURRENT_SCORING_RULE;
export const QUANT_POSTVIEW_VERSION = `${CURRENT_SCORING_RULE}-postview`;
export const LLM_DEBATE_VERSION: ModelVersion = 'v2.0-debate';
```

- `CURRENT_SCORING_RULE` 1줄 변경 = 4곳 (kbo-data pre_game / postview / live + apps/moneyball accuracy FALLBACK_VERSIONS) 동시 박제
- predictions 의 `model_version` 컬럼이 cohort 라벨 = 사후 split 가능 (accuracy / Brier / 적중률 cohort 별 측정)
- `/v2-preview` `/v2-shadow-monitor` `/accuracy/shadow` 페이지가 cohort 비교 dashboard

**한계**:
- cohort 전환 = 코드 변경 + 재배포 필요 (env 런타임 X)
- 부분 rollout 불가 (전체 ON / 전체 OFF)
- kill switch 부재 — 잘못된 cohort 발견 시 revert PR + redeploy 필수

### 1.2 server-side env flag

`apps/moneyball/src/lib/feature-flags.ts`:

```ts
export function isBigMatchEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.BIGMATCH_ENABLED === 'true';
}
```

- `NEXT_PUBLIC_` 금지 = build-time inline 방지 (server-side runtime read)
- 기본값 false = 안전
- 단일 flag 만 존재 (BIGMATCH_ENABLED)

**한계**:
- 단순 boolean (% rollout / sticky bucket 부재)
- 단일 flag 패턴 = 신규 flag 마다 함수 추가 boilerplate
- evaluation 추적 부재 (어느 request 가 어느 cohort 평가받았는지 silent)

## 2. 갭 분석

| 능력 | 현재 | 목표 |
|---|---|---|
| 모델 cohort 전환 | 코드 변경 + 재배포 | env 또는 DB flag — 런타임 |
| 부분 rollout | 0% 또는 100% | 10% → 50% → 100% canary |
| kill switch | revert PR + redeploy | env update 즉시 |
| sticky bucket | 매 request 독립 | user/game hash deterministic |
| evaluation 추적 | silent | flag_evaluations 테이블 (Tier 2) |
| 사용자 override | 부재 | URL param 또는 cookie (debug) |

## 3. 구조 제안 — Tier 1 (본 spec scope)

### 3.1 신규 모듈

`apps/moneyball/src/lib/feature-flags.ts` 확장 (단일 모듈 유지, boilerplate 회피):

```ts
import { createHash } from 'node:crypto';

export type FlagName =
  | 'BIGMATCH_ENABLED'  // 기존
  | 'V2_PREVIEW_COHORT'  // 신규: v2.0-debate vs v1.8 비율 (0~100)
  | 'V2_KILL_SWITCH'  // 신규: v2 즉시 OFF (true 면 모든 사용자 v1.8 강제)
  | 'METHODOLOGY_V2'  // 신규: /methodology 페이지 v2 layout
  ;

interface FlagSpec {
  name: FlagName;
  type: 'boolean' | 'rollout';
  default: boolean | number;  // boolean default 또는 rollout % (0~100)
  envKey: string;
  killSwitchKey?: FlagName;  // 본 flag 강제 OFF 하는 kill switch
}

const FLAG_REGISTRY: Record<FlagName, FlagSpec> = {
  BIGMATCH_ENABLED: { name: 'BIGMATCH_ENABLED', type: 'boolean', default: false, envKey: 'BIGMATCH_ENABLED' },
  V2_PREVIEW_COHORT: { name: 'V2_PREVIEW_COHORT', type: 'rollout', default: 0, envKey: 'V2_PREVIEW_COHORT_PCT', killSwitchKey: 'V2_KILL_SWITCH' },
  V2_KILL_SWITCH: { name: 'V2_KILL_SWITCH', type: 'boolean', default: false, envKey: 'V2_KILL_SWITCH' },
  METHODOLOGY_V2: { name: 'METHODOLOGY_V2', type: 'boolean', default: false, envKey: 'METHODOLOGY_V2' },
};

export function evalFlag(
  flag: FlagName,
  ctx: { bucketKey?: string; env?: NodeJS.ProcessEnv } = {},
): boolean {
  const env = ctx.env ?? process.env;
  const spec = FLAG_REGISTRY[flag];

  if (spec.killSwitchKey && evalFlag(spec.killSwitchKey, { env })) {
    return false;
  }

  if (spec.type === 'boolean') {
    return env[spec.envKey] === 'true';
  }

  const pct = Number(env[spec.envKey] ?? spec.default);
  if (!Number.isFinite(pct) || pct <= 0) return false;
  if (pct >= 100) return true;

  const key = ctx.bucketKey ?? 'global';
  const hash = createHash('sha1').update(`${flag}:${key}`).digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100;
  return bucket < pct;
}

export function isBigMatchEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return evalFlag('BIGMATCH_ENABLED', { env });
}
```

### 3.2 호출 패턴

```ts
// predictor.ts (server-side, per-game)
const useV2 = evalFlag('V2_PREVIEW_COHORT', { bucketKey: game.id });
const scoringRule = useV2 ? 'v2.0-preview' : CURRENT_SCORING_RULE;

// app/methodology/page.tsx (server-side, per-request)
const useV2Layout = evalFlag('METHODOLOGY_V2');
```

### 3.3 env key 추가 (Vercel)

- `V2_PREVIEW_COHORT_PCT` = `0` (기본) → canary 시 `10` → `50` → `100`
- `V2_KILL_SWITCH` = `false` (기본). 사고 발견 시 즉시 `true` → 모든 사용자 v1.8
- `METHODOLOGY_V2` = `false`

env 변경 후 Vercel 자동 재배포 X — Next.js runtime read 즉시 반영 (function instance 재시작 시).

### 3.4 테스트 (필수)

`apps/moneyball/src/lib/__tests__/feature-flags.test.ts`:

- `evalFlag('V2_PREVIEW_COHORT')` rollout 0/50/100 분포 검증
- kill switch ON 시 cohort 무시 검증
- sticky bucket — 동일 bucketKey 동일 결과 검증
- 기존 `isBigMatchEnabled` 호환성 회귀 X 검증

## 4. Tier 2 (carry-over spec, 별도 cycle)

### 4.1 flag_evaluations telemetry

```sql
CREATE TABLE flag_evaluations (
  id bigserial PRIMARY KEY,
  flag_name text NOT NULL,
  bucket_key text,
  result boolean NOT NULL,
  evaluated_at timestamptz DEFAULT now()
);

CREATE INDEX ON flag_evaluations (flag_name, evaluated_at DESC);
```

- ingest endpoint `/api/flag-eval` (CRON_SECRET 보호) — batch insert
- 일 100K+ event 가능 → partition 또는 sample rate 1/10 검토

### 4.2 dashboard

`/debug/feature-flags` page:
- 현재 활성 flag list + env value
- 직전 24h evaluation 분포 per flag
- cohort split accuracy (v2.0-preview cohort 의 Brier vs v1.8)

## 5. Tier 3 (사용자 영역, wait)

- Cloudflare Flagship / LaunchDarkly / Vercel Edge Config 등 외부 SaaS 검토
- 비용: LaunchDarkly free tier 1K MAU / Vercel Edge Config free tier 8KB
- 본 프로젝트 규모 (low MAU) 에 과한 의존 — 자체 구현 (Tier 1+2) 우선

## 6. risk

- **Tier 1**: light. `isBigMatchEnabled` 회귀 차단 = 호환성 테스트 필수. sticky bucket = sha1 deterministic = 분포 균일성 회귀 ≤ ±2pp (n=10K 시뮬레이션 검증)
- **Tier 2**: medium. evaluation 폭증 → DB 부하. sample rate 1/10 또는 partition 필수
- **Tier 3**: critical. 외부 비용 + vendor lock-in. 자체 구현 충분 시 회피

## 7. ship plan (다음 cycle)

| Cycle | Chain | 작업 |
|---|---|---|
| 1115+ | explore-idea (heavy) 또는 expand-scope | Tier 1 ship — feature-flags.ts 확장 + 테스트 + env key 추가 |
| 1130+ | review-code (lite) | Tier 1 ship 후 silent drift sweep (env key 누락 / kill switch 검증) |
| 1150+ | expand-scope (lite) | Tier 2 spec write — flag_evaluations + telemetry |
| 1180+ | (사용자 결정) | Tier 3 검토 보류 — Tier 1+2 충분 평가 |

## 8. open questions (carry-over)

1. v2.0-preview cohort 가 production data 진입 시 `model_version` 라벨 = `v2.0-preview-debate` vs `v2.0-preview-quant` split 필요? → cohort flag 와 LLM 활성화 flag 독립
2. game-id sticky bucket vs user-id sticky bucket — user 가 익명 (login 부재) 면 game-id 우선 (현 spec). user login 추가 시 user-id 우선 재검토
3. kill switch 일괄 vs per-flag — 본 spec = per-flag (`killSwitchKey`). 일괄 kill (모든 flag OFF) 은 운영 패닉 시 별도 env `ALL_FLAGS_KILL` 추후 추가 검토

## 9. 박제

- 본 spec = `docs/superpowers/specs/2026-06-01-feature-flag-system-spec.md`
- 이슈: hub-dispatch #1370 (Cloudflare Flagship 검토 요청)
- 직전 evidence: `apps/moneyball/src/lib/feature-flags.ts` (v4-4 Task 7, BIGMATCH_ENABLED 단일 flag) + `packages/shared/src/model-version-labels.ts` (CURRENT_SCORING_RULE cohort split)
