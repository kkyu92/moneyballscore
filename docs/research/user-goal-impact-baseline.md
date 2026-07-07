---
created_at: 2026-05-28
cycle: 1014
purpose: 사용자 요구 4축 (MLB drop / 분석 / 웹사이트 / 디자인) 영향 baseline + 향후 cycle 영향 추적 carry-over marker
trigger: 사용자 "사이클 5번 더 돌리고 영향 보고" 요청 (cycle 1014 시점)
---

# 사용자 요구 4축 영향 baseline (cycle 1014)

본 doc = cycle 1014 op-analysis lite 의 baseline 측정. cycle 1015~1018 = fresh process 가 본 doc 갱신 + 마지막 cycle (1018) retro 안 종합 보고 carry-over.

## 4축 정의 (사용자 명시)

1. **MLB 풀 인제스트 포기 → IA slot 만**
2. **분석개선** (model)
3. **웹사이트 개선**
4. **MLB 추가 고려 디자인개선** (+ "등등")

## Baseline 측정 (cycle 1014 시점)

### 축 1: MLB IA slot

| 지표 | 값 | 근거 |
|---|---|---|
| `/mlb` route 박제 | 1 (page.tsx slot) | `ls apps/moneyball/src/app/mlb` |
| LeagueSelector / LEAGUE_NAVS import 분기 점 | 5건 | `grep -rln` |
| MLB 풀 인제스트 코드 | 0 LOC | 의도된 보류 (사용자 결정) |

### 축 2: 분석 (model)

| 지표 | 값 | 근거 |
|---|---|---|
| factor 11 (park_weather) | 118 LOC | `packages/kbo-data/src/factors/park-weather.ts` |
| factor 12 (umpire_sz) | 111 LOC | `packages/kbo-data/src/factors/umpire-sz.ts` |
| shadow cohort 모듈 합계 | 524 LOC | shadow-cohort.ts + page.tsx + shadow-pair-prob.ts |
| shadow row DB 박제 | n=49 (backfill) | mig 030/031 + scripts/backfill-shadow-cohort.ts |
| n=16 pair evidence | v1.8 Brier 0.2262 / shadow Brier 0.2128 / Δ-0.0134 | `docs/research/v2.1-B-shadow-backfill.md` |
| v1.8 production 영향 | 0 (factor 11/12 weight=0) | ACTIVE_FACTOR_KEYS invariant |
| forward shadow OOS 자연 누적 | 5/29 KST 10:00 cron fire 부터 | daily.ts L772 박제 |

### 축 3: 웹사이트 (routes + components)

| 지표 | 값 | 근거 |
|---|---|---|
| 신규 page.tsx (7일 안) | 24건 | `find -mtime -7 -name page.tsx` |
| 핵심 신규 라우트 | `/accuracy/shadow` / `/insights/series/[topic]` / `/mlb` (slot) | Day 1+2 박제 |
| 신규 chart variant | FactorBreakdown (factor 11/12 row) + ScoringRuleDayHeatmap + RejectReasonBreakdown + SilentDriftCohort | a98ffb5 + plan #10 |
| 신규 UI surface | RivalryMemorySurface + PredictReveal + JudgeReasoningCard + FactorDeltaTimeline | Day 1+2 + 직전 cycle 누적 |
| SEO | JSON-LD 헬퍼 + 동적 OG + sitemap 확장 (insights series) | c1339e4 |

### 축 4: 디자인 (motion + spec)

| 지표 | 값 | 근거 |
|---|---|---|
| DESIGN.md mtime | 2026-05-28 11:15:35 | Day 1 갱신 |
| `docs/design/components.md` | 4297 bytes (신규) | 50f2c9c (W-D) |
| motion 토큰 export | tailwind config + globals.css | 50f2c9c |
| PredictReveal motion 컴포넌트 | 신규 | 50f2c9c |
| Contrast 표 | 신규 | 50f2c9c |

## 측정 framework — 매 cycle 갱신 marker

본 doc 의 baseline 위에 cycle 1015~1018 각 fresh process 가 다음 갱신:

```
## Cycle <N> 누적 갱신 (delta)

- 축 1 MLB IA slot: <지표> Δ <값>
- 축 2 분석: <지표> Δ <값>
- 축 3 웹사이트: <지표> Δ <값>
- 축 4 디자인: <지표> Δ <값>

(chain_selected / pr_number / outcome 함께)
```

마지막 cycle (1018) retro = 5 cycle delta 종합 + 사용자 영향 총합 보고.

## 자가 의심 (cycle 124/618 룰 정합)

- baseline 측정 = artifact size (LOC / route count / file existence). **사용자 가치 evidence X**.
- 진짜 사용자 영향 = (1) production /accuracy/shadow Brier delta 자연 누적 (2) ~~v1.8 n=150 도달 후 v2.0 결정~~ **← stale (cycle 1460: v1.8 유지 확정, v2.0 전환 없음)** (3) AdSense reject signal 0 통과 후 plan #7 Step C/D ship.
- artifact size 증가 ≠ 사용자 가치. cycle 86~122 ship 0 streak 박제 사례 = artifact 누적이 가치 아닌 evidence.
- 본 baseline = 진척 추적 도구, 종합 보고 = artifact + 자연 누적 evidence + 사용자 영역 결정 wait 분리 명시 필요.

## Cycle 1015 누적 갱신 (delta)

chain_selected: review-code (lite, sweep 94 silent drift detection)
pr_number: null (코드 변경 0, baseline doc append 만)
outcome: success (retro-only)

- 축 1 MLB IA slot: Δ 0 (route count 1 / import 분기 5 / production 가중치 0 invariant 유지)
- 축 2 분석: Δ 0 (factor 11/12 production 가중치 0 / shadow cohort n=49 / pair n=16 동일 / v1.8 n=126 cohort 동일)
- 축 3 웹사이트: Δ 0 (page.tsx 24건 동일 / chart variant 동일 / 신규 라우트 0)
- 축 4 디자인: Δ 0 (DESIGN.md mtime 2026-05-28 11:15:35 동일 / motion 토큰 동일)

**측정 evidence**: `git log 8e6dd16..HEAD --oneline` = 0 commit (cycle 1014 retro + baseline doc 박제 직후, cycle 1015 시점 신규 commit 없음 — 본 cycle baseline append commit 만 추가).

**sweep 94 결과**: silent drift catch 0건. cycle 1013 fix #1331 후 잔여 silent path 부재. /accuracy/shadow page totalN = pair count (양쪽 모두 존재 + 결과 박제) 정확 표기 확인 (page.tsx L105-107 filter + helper `pairProbForRow` scoring_rule 분기 정합). 의도된 정상 평가 — 다음 sweep 95 (cycle 1016) 자연 carry-over.

## Cycle 1016 누적 갱신 (delta)

chain_selected: review-code (lite, sweep 95 silent drift detection)
pr_number: null (코드 변경 0, baseline doc append 만)
outcome: success (retro-only)

- 축 1 MLB IA slot: Δ 0 (route count 1 / import 분기 5 / production 가중치 0 invariant 유지)
- 축 2 분석: Δ 0 (factor 11 park_weather=118 LOC / factor 12 umpire_sz=111 LOC / predictor.ts factor 11/12 grep 0 = shadow-only invariant 유지)
- 축 3 웹사이트: Δ 0 (page.tsx 7일 안 24건 동일 / chart variant 동일 / 신규 라우트 0)
- 축 4 디자인: Δ 0 (DESIGN.md mtime 2026-05-28 11:15:35 동일 / motion 토큰 동일)

**측정 evidence**: `git log 19b0b31..HEAD --oneline` = 1 commit (81c1bff cycle 1015 retro 만, 신규 코드 변경 0). 본 cycle baseline append commit 만 추가.

**sweep 95 결과**: silent drift catch 0건. shadow-only invariant 4 layer 검증 정합:
1. predictor.ts factor 11/12 grep 0 (production weight=0)
2. shadow-cohort.ts neutral fallback 박제 (L32 주석)
3. silent-drift-alert.ts shadow 분리 채널 박제 (L16 주석)
4. postview.ts 의도 박제 주석 (L56)

shadow path = `pairProbForRow(scoring_rule, reasoning, factors)` helper 정합 (page.tsx L95). 의도된 정상 평가 — 다음 sweep 96 (cycle 1017) 자연 carry-over.

## Cycle 1017 누적 갱신 (delta)

chain_selected: review-code (lite, sweep 96 silent drift detection)
pr_number: null (코드 변경 0, baseline doc append 만)
outcome: success (retro-only)

- 축 1 MLB IA slot: Δ 0 (route count 1 / import 분기 0 / production 가중치 0 invariant 유지)
- 축 2 분석: Δ 0 (factor 11 park_weather=118 LOC / factor 12 umpire_sz=111 LOC / predictor.ts factor 11/12 grep 7 = import + factor 박제 / DEFAULT_WEIGHTS L138-139 park_weather=0 + umpire_sz=0 → 가중합 곱셈 0 = production weight=0 invariant 유지)
- 축 3 웹사이트: Δ 0 (page.tsx 7일 안 24건 동일 / 전체 50건 / 신규 라우트 0)
- 축 4 디자인: Δ 0 (DESIGN.md mtime 2026-05-28 11:15:35 동일)

**측정 evidence**: `git log f223adb..HEAD --oneline` = 0 commit (cycle 1016 retro 직후, 신규 코드 변경 0). 본 cycle baseline append commit 만 추가.

**sweep 96 결과**: silent drift catch **1건** — cycle 1015/1016 sweep 박제 표기 정정.

- 정정: cycle 1015/1016 박제 "predictor.ts factor 11/12 grep 0" = 부정확 표기 (실제 grep=7 매칭, import L5-6 + factor 박제 L94-107).
- 정확: production weight=0 invariant 의 진짜 근거 = `packages/shared/src/index.ts` DEFAULT_WEIGHTS L138-139 `park_weather: 0` + `umpire_sz: 0` → 가중합 (predictor.ts L110-114) `factorValue * weight` 곱셈 0 → production prob 무영향.
- shadow path 별도 = `SHADOW_WEIGHTS` (index.ts L185-186: park_weather: 0.03 / umpire_sz: 0.02) — shadow cohort 만 사용.

다음 sweep 부터 정확 표기 = "DEFAULT_WEIGHTS park_weather=0 + umpire_sz=0 invariant 유지" (grep count X / 가중치 source 확인). **silent drift family 자체 차원 박제 패턴 silent skip 1건 자가 catch — develop-cycle 자가 진단의 dominance-positive streak detection channel 작동 evidence**.

## Cycle 1018 누적 갱신 (delta) + 5 cycle 종합 보고

chain_selected: explore-idea (heavy, scout #1327 plan #13 박제 + Tier 1 ship)
pr_number: 1333
commit: 6911111
outcome: success

### 4축 delta (cycle 1018)

- 축 1 MLB IA slot: Δ 0 (route count 1 / production 가중치 0 invariant 유지 / packages/shared/src/index.ts mtime 동일)
- 축 2 분석: Δ 0 (factor 11/12 LOC 동일 / shadow cohort n=49 / DEFAULT_WEIGHTS park_weather=0 + umpire_sz=0 invariant / v1.8 production 영향 0)
- 축 3 웹사이트: Δ 0 page.tsx (신규 page.tsx 7일 안 24건 동일 / 신규 라우트 0). 단 **observability layer Δ +10** (runtime-error-alert.yml ROUTES 13→23 신규 10건 추가: `/dashboard /v2-preview /picks /standings /matchup /seasons /teams /players /lotto/archive /search`. 모두 prod 200 검증. 사례 14 family detection coverage 확장)
- 축 4 디자인: Δ 0 (DESIGN.md mtime 2026-05-28 11:15:35 동일 / motion 토큰 동일 / 신규 컴포넌트 0)

**측정 evidence**: `git log 81c1bff..HEAD --oneline` = 본 cycle commit 2건 (6911111 workflow 변경 + 4d12409 retro). 본 cycle baseline append commit (현 commit) 추가.

### 5 cycle (1014~1018) 종합 보고

#### 4축 영향 총합

| 축 | Δ 1015 | Δ 1016 | Δ 1017 | Δ 1018 | 누적 |
|---|---|---|---|---|---|
| 1 MLB IA slot | 0 | 0 | 0 | 0 | **0** |
| 2 분석 model | 0 | 0 | 0 | 0 | **0** |
| 3 웹사이트 (page.tsx) | 0 | 0 | 0 | 0 | **0** |
| 3 웹사이트 (observability) | 0 | 0 | 0 | +10 routes | **+10** |
| 4 디자인 | 0 | 0 | 0 | 0 | **0** |

**가시 production 사용자 영향 = 0**. 단 observability layer (silent 500 detection coverage) +10 라우트 = 향후 사례 14 family 재발 시 즉시 감지 capacity.

#### chain 분포 (5 cycle)

| Cycle | Chain | Outcome | PR |
|---|---|---|---|
| 1014 | op-analysis (lite) | success | #1332 (baseline doc 박제) |
| 1015 | review-code (lite, sweep 94) | success | null (retro-only) |
| 1016 | review-code (lite, sweep 95) | success | null (retro-only) |
| 1017 | review-code (lite, sweep 96, 1건 catch) | success | null (retro-only) |
| 1018 | explore-idea (heavy, scout #1327) | success | #1333 (workflow + plan #13 박제) |

ship PR = 2건 (#1332 baseline doc / #1333 workflow). review-code dominance 3/5 sweep 94-96 = silent drift family detection channel 정상 fire (cycle 1017 sweep 96 = 자체 박제 표기 정정 1건 catch).

#### 자연 누적 wait 잔여 (본 메인 자율 X)

1. **shadow forward cohort OOS** — 5/29 KST 10:00 cron 자연 누적 시작. n=10 도달 시 v2.1-B-shadow first OOS evidence (현 backfill n=49 + forward 0)
2. **v1.8 cohort n=150 ETA** — 본 baseline 시점 추정. 직전 측정 cycle 946 = 3.55/day velocity / 잔여 111건 / ETA 2026-06-26. cycle 989/994 측정 갱신 ETA 2026-08-04. ~~도달 시 v2.0 전환 결정~~ **← stale (cycle 1460: n=178 달성, v1.8 유지 확정)**
3. **L6 lotto OOS n=10 ETA** — 2026-07-21 (8 토 × 7일 1226회 5/30 부터). 자연 누적

#### 사용자 영역 wait 잔여 (carry-over 박제 채널)

| Plan | 미처리 Step | 비용 가드 |
|---|---|---|
| #4 TabPFN | Step 2~5 (inference 채널 결정 / scripts 작성 / PoC fire / 결정) | 자체 GPU 없음 + 자율 결제 금지 |
| #7 lotto Step C/D | AdSense reject signal 14일 monitor 후 fire | 사용자 영역 monitor |
| #10 머니볼 Tier 2~4 | v1.8 n=150 도달 시점 fire | 자연 누적 wait |
| #11 외부 인프라 Step 4~5 | 외부 SaaS free tier 결정 / multi-region | 외부 SaaS 결정 |
| #12 TabPFN Step 3~5 | Python sidecar / model checkpoint / 운영 결정 | 인프라 결정 |
| #13 비상 관리 도구 Step 4~5 | 외부 healthcheck SaaS / /admin 라우트 결정 | 외부 SaaS + 사용자 의사 |

#### 자가 의심 (cycle 124/618 룰 정합)

- baseline 측정 = artifact size (LOC / route count / file existence). **사용자 가치 evidence X**
- 5 cycle 4축 Δ 합 = 가시 production 영향 0. observability +10 routes = 미래 silent failure 방지 capacity (현 시점 사용자 가치 evidence X — 다음 silent 500 재발 시 즉시 감지 → MTTR 단축이 후행 evidence)
- chain 4/5 lite (review-code 3 + op-analysis 1) = 점진 sweep + baseline 박제. 본 메인 자율 영역 closed loop 자연 동작 evidence
- chain 1/5 heavy (explore-idea 1018) = scout #1327 신규 plan 박제 + Tier 1 ship 1건 → 본 메인 자율 영역 점진 progress evidence
- 진짜 사용자 영향 = (1) production /accuracy/shadow forward OOS Brier delta 자연 누적 (2) ~~v1.8 n=150 도달 후 v2.0 결정~~ **← stale (cycle 1460: v1.8 유지 확정)** (3) plan #7 AdSense monitor 통과 후 Step C/D ship — 모두 사용자 영역 wait 또는 자연 누적 wait. 5 cycle 안 본 evidence 추가 X = 정상 (자가 의심 차단 룰)

#### 사용자 결정 요청 없음

본 메인 자율 영역 closed loop 정상 동작. 사용자 영역 wait 잔여 6 plan (#4 #7 #10 #11 #12 #13) carry-over 채널 유지. emergency stop 미발동 (직전 10 cycle success 10/10). N=1 인자 단발 cycle 종료 — 다음 N 호출은 사용자 자율 결정.
