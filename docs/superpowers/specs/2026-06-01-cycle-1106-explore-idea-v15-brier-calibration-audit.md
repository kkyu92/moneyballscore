# cycle 1106 explore-idea v15 후보 B — Brier calibration audit method spec

- **mode**: lite (spec write only, success outcome — n=100+ 도달 후 즉시 fire path 박제)
- **carry-over from**: `2026-06-01-cycle-1102-explore-idea-v15-redirect-sources.md` 후보 B
- **chain reason**: cycle 1105 next_recommended 첫번째 = `explore-idea (v15 후보 B Brier calibration audit, n=100+ v2.1-B 누적 후)`. 현 n=52, 잔여 48건 도달 전 method spec 박제 → 도달 즉시 1-cycle fire path 가속
- **parent spec**: v15 inventory 후보 B (Tier 2, 후속 carry-over)

## Problem

cycle 1098 op-analysis 박제 (`apps/moneyball/data/op-analysis-cohort/2026-06-01-cohort-cycle-1098.md`):

| 모델 | n | acc | Brier |
|---|---|---|---|
| v1.8 (real) | 42 | 57.1% | **0.2416** |
| v1.8-credit-fail | 25 | 60.0% | 0.2304 |
| v2.0-shadow | 5 | 60.0% | 0.5616 (표본 부족) |
| **v2.1-B-shadow** | **52** | **51.9%** | **0.4635** |

v2.1-B-shadow Brier **0.4635** = v1.8 (0.2416) 대비 약 **2배 worse**. accuracy 51.9% (≈ coinflip) 와 Brier 0.4635 mismatch = 확률 estimate calibration 미흡 surface. 두 가능 root cause:

1. **확률 분포 over-confident**: v2.1-B-shadow predict 확률이 0.5 에서 극단 (0/1) 으로 쏠림 — 틀린 예측이 큰 확률로 박힘 → Brier 폭증
2. **base rate mismatch**: v2.1-B-shadow training/inference 분포가 KBO 실측 home rate (~54%) 와 어긋남

calibration audit 없이는 v2.0/v2.1-B 가중치 후보 평가가 accuracy 단독 metric 기반 — Brier 약점 silent.

## Goal

n=100+ v2.1-B-shadow 누적 시점에 즉시 fire 가능한 **calibration audit harness method spec** 박제. 본 cycle = spec write only (코드 변경 X / fire X).

audit 결과물:
- v2.1-B-shadow 10-bucket calibration plot (현 `compareModels.buildCalibration()` 재사용)
- Platt scaling 계수 (a, b) 추정 + post-calibration Brier 비교
- isotonic regression 비교 (sklearn-style monotonic fit)
- recommendation: prod 적용 GO/HOLD/REJECT

## Method

### Step 0 — Trigger 조건 (즉시 fire)

```
v2.1-B-shadow n ≥ 100 AND velocity ≥ 1/day (직전 14일)
```

현 cycle 1098 n=52. velocity ~ ?/day (v2.1-B-shadow rollout 시점 측정 필요 — 후속 cycle 진단 source). n=100 도달 ETA ~ 추가 48건 / velocity → 본 spec carry-over.

### Step 1 — baseline 측정

새 스크립트 `apps/moneyball/scripts/audit-brier-calibration.ts` 박제:

```ts
// pseudo
import { buildModelStats } from '@/lib/dashboard/compareModels';
import { fetchPredictionsByVersion } from '@/lib/db/predictions';

const rows = await fetchPredictionsByVersion('v2.1-B-shadow');
const pairs = rows
  .filter(r => r.is_correct !== null)
  .map(r => ({
    p: extractShadowProb(r.reasoning, 'v2.1-B-shadow'),
    y: r.winner_team_id === r.home_team_id ? 1 : 0,
  }));

const stats = buildModelStats(pairs);
console.log('baseline Brier:', stats.brier);
console.log('baseline LogLoss:', stats.logLoss);
console.log('calibration buckets:', stats.calibration);
```

baseline 박제 위치: `apps/moneyball/data/op-analysis-cohort/<date>-calibration-audit-v2.1-B-shadow.md`.

### Step 2 — Platt scaling fit

logistic regression on (p_raw → p_calibrated). 단변량 sigmoid:

```
p_cal = 1 / (1 + exp(-(a * logit(p_raw) + b)))
```

n=100+ pairs 로 a, b 추정 (`(p, y)` MLE). 구현 = small custom function (`packages/kbo-data/src/lib/platt-scaling.ts` 신규):

```ts
export interface PlattParams { a: number; b: number; }
export function fitPlattScaling(pairs: { p: number; y: number }[]): PlattParams {
  // gradient descent or Newton-Raphson, 100 iter, lr 0.01
  // sklearn LogisticRegression(y ~ logit(p)) 등가
}
export function applyPlatt(p: number, params: PlattParams): number {
  const z = Math.log(p / (1 - p)) * params.a + params.b;
  return 1 / (1 + Math.exp(-z));
}
```

post-calibration Brier:

```ts
const platt = fitPlattScaling(pairs);
const calibratedPairs = pairs.map(({ p, y }) => ({ p: applyPlatt(p, platt), y }));
const calibratedStats = buildModelStats(calibratedPairs);
```

### Step 3 — isotonic regression 비교

monotonic step function fit. 구현 옵션:
- (a) JS port — `packages/kbo-data/src/lib/isotonic-regression.ts` (PAVA = Pool Adjacent Violators 알고리즘, 50 LOC)
- (b) Python sidecar — skip (overkill, lite scope 외)

(a) 선택. PAVA:

```ts
export interface IsotonicBin { lo: number; hi: number; p_calibrated: number; }
export function fitIsotonic(pairs: { p: number; y: number }[]): IsotonicBin[] {
  // 1. sort by p
  // 2. initial bins = each (p, y)
  // 3. while exists adjacent violator (bin[i].avg > bin[i+1].avg): merge
  // 4. return bins
}
export function applyIsotonic(p: number, bins: IsotonicBin[]): number {
  const bin = bins.find(b => b.lo <= p && p <= b.hi);
  return bin ? bin.p_calibrated : p;
}
```

### Step 4 — 비교 박제

박제 cohort md:

```markdown
# v2.1-B-shadow Brier calibration audit (cycle <fire_n>)

## baseline (n=<N>)
- Brier: 0.4635
- LogLoss: ...
- calibration buckets: [(0.0-0.1, n=2, avgP=0.05, actualY=0.0), ...]

## Platt scaling
- params: a=<a>, b=<b>
- post Brier: <new_brier>
- ΔBrier: <delta> (+/- vs baseline)

## isotonic regression
- bins: <count> 개
- post Brier: <new_brier>
- ΔBrier: <delta>

## Recommendation
- ΔBrier ≥ 0.05 (significant) AND post Brier < 0.30 → GO
  - prod 적용 path: judge-agent.ts 또는 daily.ts predict 직후 platt apply
- 0.02 ≤ ΔBrier < 0.05 → HOLD (n=150 도달 후 재평가)
- ΔBrier < 0.02 → REJECT (calibration ineffective, root cause = score function 자체)
```

### Step 5 — prod 적용 path (GO 시)

`apps/moneyball/src/lib/predict/calibrators.ts` 박제:

```ts
import platt_v2_1_B from '@/data/calibrators/platt-v2.1-B-cycle-<fire_n>.json';
export function calibrateV21B(p_raw: number): number {
  return applyPlatt(p_raw, platt_v2_1_B);
}
```

daily.ts 안 v2.1-B-shadow predict 후 calibrated prob 박제. 단 raw prob 도 병행 박제 (rollback 가능 + 비교 누적).

### Step 6 — test 박제

`packages/kbo-data/src/lib/__tests__/platt-scaling.test.ts`:

```ts
// fixture: 100 pairs over-confident (avg p=0.7, actual y rate=0.5)
// Platt fit 후 calibrated avg p ~ 0.5 (잘 calibrated) 검증
// edge: n=0 / n=1 / all y=0 / all y=1 안전 fallback
```

## ROI 재평가 (cycle 887 plan #8 rubric 정합)

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  baseline_v21B_n: 52
  baseline_v21B_brier: 0.4635
  baseline_v18_real_brier: 0.2416
  trigger_n: 100
  rubric_evaluation: |
    가치: medium-high (v2.0 가중치 후보 평가 evidence 정확성 ↑. accuracy 단독 metric → Brier+calibration 다축 evidence)
    시간 비용: small-medium (spec only 본 cycle / fire 시 1 cycle 안 audit-only PR, harness 50 LOC platt + 50 LOC isotonic + script + test = 200 LOC)
    risk: 1 (audit harness 자체 risk 0 / prod 적용 시 risk 2 = rollback path 필요, 본 spec 안 raw prob 병행 박제 + GO 기준 명시로 mitigate)
    자율 가능: yes (코드 차원 100% 본 메인)
    의존성: 단일 (n=100+ 누적 만 — 외부 의존 X, 자연 누적)
  tier: 2 (spec lite = small, fire heavy = medium + 명확 trigger 조건)
  immediate_fire_path: "n=100 도달 cycle 진단 시 본 spec read → Step 0~6 그대로 fire → 1 cycle audit-only PR"
```

## next cycle (cycle 1107) next_recommended_chain

- `review-code` (lite, family 18 자연 source scan) — review-code dominance 자연 유지 (silent drift family detection channel)
- 또는 `fix-incident` (gap=12 도달, 자연 source 시) — fix-incident trigger 7 = ≥20 cycle 도달 시점은 cycle 1115 ETA
- 또는 `explore-idea` (lite, v16 inventory 진행 — saturation trigger 재충족 시)
- 또는 `lotto` (1227회 6/6 토 추첨 직후 OOS 박제)

## 박제 의무

- 본 spec write only — 코드 변경 X
- 후속 fire cycle (n=100+ 도달 시점) 의 진단 단계 첫 step 에서 본 spec lookup → 후보 B carry-over evidence ↑

## meta-pattern (자가 진화 carry-over)

v15 inventory 안 후보 (A~G) 의 timing-dependent path 분리 = saturation series 안 자연 패턴. 본 cycle = `carry-over inventory cataloging` 의 단순 list 박제 → `method spec` 으로 격상 (Tier 2 후보 B). 후속 v16/v17 inventory 시 동일 격상 path 가능 — Tier 2 후보 모두 method spec 으로 분리 박제 시 즉시 fire path 가속.
