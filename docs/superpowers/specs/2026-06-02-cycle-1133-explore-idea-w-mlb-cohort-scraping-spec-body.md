# cycle 1133 explore-idea lite — W MLB cohort scraping infra spec body

- **cycle**: 1133
- **chain**: explore-idea (lite)
- **mode**: lite — spec body 박제 only (코드 변경 X)
- **carry-over**: cycle 1131 v18 inventory candidate W (Tier 1, small, risk 0, 자율 가능 yes). plan #21 step 4 사용자 영역 wait 의 spec body 자율 분리. cycle 1131 retro next_recommended_chain 정합 (explore-idea lite candidate W spec body)
- **chain reason**: v18 inventory 박제 직후 자율 영역 candidate 풀-수렴 phase 15 첫 step. W = spec body only, 코드 변경 X = risk 0, 사용자 결정 후 즉시 fire 가능 layer 준비 (S 사용자 영역 wait carry-over 직접 정합). Tier 1 즉시 fire 가능.

## 본 spec 의 책임 경계

- **본 메인 자율 박제 영역** (spec body) — scraping infra design + cron schedule 후보 + DB schema 후보 + rate-limit 가드 + ToS reading + 측정 layer
- **사용자 결정 영역** (별도 fire 차단) — (a) 본 spec 안 cron schedule 활성화 결정 (Vercel free tier limit), (b) 예측 frequency 결정 (preGame 30분 전 vs 게임 시작 1시간 전 vs 매 시간), (c) ToS 가드 확정 (Savant CSV / Fangraphs HTML 자동 fetch 빈도 한도)

본 spec body 박제 = **사용자 결정 후 즉시 fire 가능 layer 준비**. 코드 변경 X = risk 0. 사용자 결정 evidence 누적 wait.

## 현 MLB infra 박제 상태 (2026-06-02 cycle 1133 측정)

### 박제 완료 (자율 영역)

| 영역 | 상태 | 위치 |
|---|---|---|
| MLB_TEAMS 매핑 | shipped | `packages/shared/src/mlb-teams.ts` (30 teams + MLB_TEAMS_PRE_RENDER 5팀) |
| Statcast 타입 | shipped | `packages/kbo-data/src/scrapers/baseball-savant.ts` (xwOBA / Barrel% / HardHit% / LaunchAngle, 77 LOC) |
| Fangraphs MLB 타입 | shipped | `packages/kbo-data/src/scrapers/fangraphs-mlb.ts` (wOBA / FIP / xFIP / WAR 등 12 column, 72 LOC) |
| statsapi-mlb 스케줄 fetch | shipped | `packages/kbo-data/src/scrapers/statsapi-mlb.ts` (MlbGame interface + fetchMlbSchedule, 146 LOC, rate-limit 2s + retry 3) |
| MLB historical bootstrap | shipped | `packages/kbo-data/src/scrapers/mlb-historical-bootstrap.ts` (46 LOC) |
| MLB league column | shipped | `supabase/migrations/033_mlb_league_column.sql` (predictions.league = 'kbo'/'mlb' 분기) |
| MLB Statcast factors | shipped | `supabase/migrations/034_mlb_statcast_factors.sql` |
| MLB shadow weights | shipped | `supabase/migrations/035_mlb_shadow_weights.sql` |
| MLB walk-forward Brier | shipped | `supabase/migrations/036_mlb_walk_forward_brier.sql` |
| /mlb/players/[id] Statcast deep-dive | shipped | cycle 1092 PR #1492 (plan #21 step 1) |

### 부재 (본 spec 박제 영역)

| 영역 | 부재 측정 |
|---|---|
| daily MLB cron schedule | `apps/moneyball/src/app/api/cron/` 안 MLB 라우트 0건 (`ls apps/moneyball/src/app/api/cron/ \| grep -i mlb` 출력 X) |
| MLB predictions pipeline | `packages/kbo-data/src/pipeline/` 안 MLB 전용 pipeline 부재 (`daily.ts` 안 league filter 자연 분기 없음) |
| MLB lineup/starter scraper | starting pitcher / lineup 스크래퍼 부재 (현재 statsapi 안 schedule fetch 만) |
| MLB pre-game / post-game cron | pre-game 30분 전 / post-game 결과 수집 cron 부재 |
| MLB shadow cohort row insert | `shadow-cohort.ts` 안 MLB league 분기 부재 (KBO 전용) |
| MLB v1.8-mlb cohort 측정 | v1.8 cohort = KBO 전용 (real n=42 stale). MLB 별도 v1.8-mlb cohort tracking 부재 |

## scraping infra design

### 데이터 source 3축 (KBO 정합)

| 데이터 | source | 빈도 | ToS 가드 |
|---|---|---|---|
| 스케줄 + 결과 | MLB Stats API (`statsapi.mlb.com`) | 일 4회 (pre-game 30분 전 / 게임 중 1회 / final / 다음날 보정) | 공식 무료 API, rate-limit 2s + retry 3 — 현재 statsapi-mlb.ts 박제됨 |
| 팀 스탯 (xwOBA / Barrel% 등) | Baseball Savant CSV | 일 1회 (KST 12:00, 새 슬레이트 시작 전) | CSV 다운로드, rate-limit 2s — 현재 baseball-savant.ts 박제됨 |
| 팀 스탯 (wOBA / FIP / WAR) | Fangraphs HTML scraping | 일 1회 (KST 12:00) | HTML scraping, rate-limit 2s — robots.txt 차단 X (kbo-data/scrapers/fangraphs-mlb.ts 박제됨) |
| 선발 투수 + 라인업 | statsapi-mlb (probable starter API) + Baseball Savant (선수별 Statcast) | pre-game 90분 전 (자연 분기 — 정규 lineup 발표 시간) | rate-limit 2s + retry 3 |

### cron schedule 후보

본 cron schedule 후보 박제. 사용자 결정 시 활성화 가능.

**case A (보수, 일 4회)** — 신선도 우선, Vercel free tier limit (월 10만 invocation) 안전:
- `00 03 * * *` KST = 12:00 — 팀 스탯 갱신 (Savant + Fangraphs)
- `30 09 * * *` KST = 18:30 — pre-game 30분 전 prediction insert (당일 스케줄 + 선발 + 라인업)
- `00 15 * * *` KST = 24:00 — 게임 final 결과 수집
- `00 19 * * *` KST = 04:00 — 다음날 보정 (postponed / 결과 누락 sweep)

월 invocation 추정: 4 × 30 = 120 / 월 (안전).

**case B (적극, 매 시간 자연)** — 게임 중 사용자 가시 score 갱신 빈번화. Vercel free tier limit 부담 ↑:
- 매 시간 스케줄 fetch + final 결과 sweep
- 월 invocation = 24 × 30 = 720 / 월 (Vercel tier 안전이지만 KBO 시간 cron 과 중복 부담 ↑)

**case C (KBO 정합, 일 1회 daily)** — KBO `daily.ts` 정합. 신선도 trade-off:
- `30 09 * * *` KST = 18:30 — 모든 step (스케줄 + 팀 스탯 + prediction insert + 결과 sweep) 통합
- 월 invocation = 30 / 월 (가장 안전)

**기본 권고**: case A (보수, 일 4회). 사용자 결정 영역.

### MLB predictions pipeline 분기

기존 `daily.ts` (1100+ LOC, KBO 전용) 패턴 재사용 가능. 분기 방식 후보:

**option 1 (분리 파일)**: `packages/kbo-data/src/pipeline/daily-mlb.ts` 신규 박제. KBO daily.ts 와 병행. 유지보수 비용 ↑ (drift 위험).

**option 2 (league 분기)**: 기존 `daily.ts` 안 league parameter 추가 (`'kbo'|'mlb'`). 분기 ~30 곳 자연 (insertShadowRow / 가중치 lookup / 결과 sweep 등). drift 위험 ↓, 변경 영역 ↑.

**option 3 (composable)**: `packages/kbo-data/src/pipeline/runDailyPipeline()` orchestrator + `runKboDaily()` + `runMlbDaily()` 분리. orchestrator 안 league 별 호출. 유지보수 정합 + 분리.

**기본 권고**: option 3 (composable orchestrator). KBO daily.ts ~1100 LOC refactor 필요하지만 drift 위험 최소화 + MLB 추가 시 명확 분기.

### DB schema 분기 (이미 박제)

- `predictions.league` column 박제됨 (migration 033) — 'kbo' 또는 'mlb' 분기
- `shadow_predictions` 도 동일 league column 분기 가정 (migration 035 박제됨)
- `walk_forward_brier` MLB 측정 — migration 036 박제됨, MLB cohort 측정 column 별도

**추가 가능 영역**: `mlb_team_statcast_snapshots` (Savant CSV daily snapshot, 30 팀 × 365 일 = 약 11k row/년). 현재 부재 가정 — 사용자 결정 시 박제.

### rate-limit + ToS 가드

기존 KBO 정합:

| source | rate-limit | retry | 차단 신호 | 차단 시 동작 |
|---|---|---|---|---|
| statsapi.mlb.com | 2s | 3회 (exponential backoff) | HTTP 401/403 → ToS cool down | Sentry warning + throw 'tos_cooldown' (현재 statsapi-mlb.ts 박제됨) |
| baseballsavant.mlb.com | 2s | 1회 | HTTP non-200 | Sentry warning + throw `savant HTTP ${status}` |
| fangraphs.com | 2s | 1회 | HTTP non-200 | Sentry warning + throw `fangraphs HTTP ${status}` |
| robots.txt audit | 사전 audit (cycle 보전, statiz 차단 사례 박제) | - | - | - |

`robots.txt` audit 현황: Savant + Fangraphs + statsapi 모두 차단 X (KBO Fancy Stats 와 동일 pattern, cycle 1133 검증 wait).

### 측정 layer (사례 9 family silent drift detection 정합)

- `pipeline_runs` row 박제 (mode='mlb_daily', status='success'/'partial'/'error', predictions 컬럼 + error_message column)
- `silent_drift_alerts` MLB row 박제 (predictions=0 + games_found>0 mismatch 자동 alert, cycle 819 PR #1179 정합)
- Sentry warning channel `mlb-scraper-alert` (현재 `kbo-scraper-alert.ts` 정합)
- Vercel cron silent skip detection — `/api/cron/mlb-daily` smoke endpoint (plan #13 step 4-5 carry-over Z 후보 정합)

## 자가 검증 (cycle 887 plan #8 rubric 정합)

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  spec_body_candidate_W:
    가치: low~medium (spec body 박제 자체 가시 영향 X, 사용자 결정 후 fire layer 비용 절감)
    시간_비용: small (~200 LOC spec body, 본 cycle 안 수렴)
    risk: 0 (spec body, 코드 변경 X)
    자율_가능: yes (사용자 결정 영역 분리)
    의존성: none (사용자 결정 후 fire layer 별도)
    tier: 1 (small + light, 즉시 fire)
  baseline_mlb_infra_shipped:
    teams: "MLB_TEAMS 30팀 + 5팀 pre-render"
    scrapers: ["statsapi-mlb 146 LOC", "baseball-savant 77 LOC", "fangraphs-mlb 72 LOC", "mlb-historical-bootstrap 46 LOC"]
    migrations: ["033 league column", "034 statcast factors", "035 shadow weights", "036 walk-forward Brier"]
    ui: "/mlb/players/[id] Statcast deep-dive (cycle 1092 PR #1492)"
  baseline_mlb_infra_missing:
    cron: "MLB cron route 0건"
    pipeline: "MLB 전용 pipeline 부재 (daily.ts league 분기 자연 X)"
    cohort: "MLB v1.8-mlb cohort tracking 부재"
    snapshot: "mlb_team_statcast_snapshots 부재"
  cron_schedule_candidates:
    case_A_보수: "일 4회 / 월 120 invocation (Vercel free tier 안전)"
    case_B_적극: "매 시간 / 월 720 invocation"
    case_C_KBO_정합: "일 1회 daily / 월 30 invocation"
    기본_권고: case_A
  pipeline_분기_options:
    option_1_분리파일: "daily-mlb.ts 신규 (drift 위험 ↑)"
    option_2_league분기: "daily.ts 안 league param (변경 ~30곳)"
    option_3_composable: "orchestrator + runKboDaily + runMlbDaily 분리 (drift 위험 ↓, refactor ↑)"
    기본_권고: option_3
  data_source_3축:
    스케줄_결과: "statsapi.mlb.com 무료 API (rate-limit 2s)"
    팀_스탯_statcast: "baseballsavant.mlb.com CSV"
    팀_스탯_fangraphs: "fangraphs.com HTML scraping (robots.txt audit 박제됨)"
  v17_silent_closure_count: 1 (T = N 안 통합, cycle 1131 박제)
  v18_inventory_carry_over: 6 candidate (U lazy / V wait / W spec body / X dropdown / Y TabPFN body / Z smoke)
  silent_drift_family_streak: "~673 cycle (cycle 458 ~ cycle 1132 review-code heavy detection channel)"
  saturation_series_progression: "v10 → v11 → v12 → v13 → v14 → v15 → v16 → v17 → v18 → spec body 박제 phase 15 (cycle 1131 v18 inventory → cycle 1133 W spec body 2 cycle 간격)"
```

## skill-evolution 평가 (자가 의심 차단)

- cycle 1133 % 50 ≠ 0 (trigger 3 X — next milestone cycle 1150)
- chain-evolution subtype 누적 ≥ 5 → 별도 측정 wait (cycle 1100 milestone 박제 후 누적 정상 가정)
- 같은 chain 5회 연속 fail → X (explore-idea 1122/1125/1126/1127/1129/1130 5/5 success + 본 cycle 자율 fire 예정)
- chain pool 0회 발화 chain (trigger 5) → 영구 opt-out 9개 + review-code 평가 대상 1개. 직전 20 cycle review-code 5회 fire (1113/1116/1117/1118/1132) = 0회 발화 미충족
- meta-pattern "SKILL 갱신 필요" 명시 X

→ **skill-evolution trigger 5종 모두 미충족** = 정상 진행 (signal next_n=8 박제 후 watch.sh zero-touch fire).

## 본 spec 결정

- **lite spec body 박제 only** — 자율 영역 신규 ship X (사용자 결정 후 fire layer 준비 inventory). plan #21 step 4 S carry-over 의 spec body 자율 분리 박제
- **다음 cycle next_recommended** = explore-idea (heavy, 후보 Z runtime smoke route 확장 medium Tier 2) 또는 explore-idea (lite, 후보 X Header dropdown 분리 small Tier 1) 또는 explore-idea (heavy, 후보 Y TabPFN inference layer body medium Tier 2) 또는 review-code (lite/heavy, family 20 자연 발견 시) 또는 lotto (gap=29 → 2 cycle 후 자연 fire trigger 6 30-cycle) 또는 op-analysis (gap=10, 15 cycle 후 trigger 7 25-cycle 충족 cycle 1148)
- **자율 vs 사용자 영역 비율**: 자율 = 후보 U/V/X/Y/Z (5, W 본 cycle 박제 complete) / 사용자 영역 = W cron 활성화 결정 + 사용자 결정 영역 분리. v18 inventory 6 candidate → 5 candidate 자연 redirect (1 ship complete = W spec body 박제)
- **silent drift family wave 18 self-monitoring**: review-code heavy detection channel (cycle 1132 channel positive signal 박제 cycle 1130 saturation v17 closure 직후 자연 fire 정합) 안 family 20 자연 발견 wait

## carry-over 다음 cycle

- next_recommended_chain = explore-idea (heavy, 후보 Z runtime smoke route 확장 medium) 또는 explore-idea (lite, 후보 X Header dropdown 분리 small) 또는 explore-idea (heavy, 후보 Y TabPFN inference layer body medium) 또는 review-code (lite/heavy, family 20 자연 발견 시)
- skill-evolution-pending marker = 박제 X
- silent drift family wave 18 self-monitoring 지속
- W spec body 박제 complete → 사용자 결정 evidence 누적 wait
