---
created_at: 2026-05-28
budget_hours: 24
parallel_workers: 2
project: moneyballscore
status: spec
related_plans:
  - "~/.develop-cycle/plans/moneyballscore/10.md (parent — Tier 1 shipped, Tier 2 gated)"
  - "~/.develop-cycle/plans/moneyballscore/4.md (TabPFN — user-gated)"
related_routes:
  - "/v2-preview (noindex, V2_1_B_WEIGHTS 박제)"
  - "/debug/silent-drift (M14 박제)"
  - "/debug/deploy-drift (M15 박제)"
---

# 2-day Max-plan blast — moneyballscore (KBO model + web + MLB-ready IA)

## 의도

Max plan 잔여 2일 안에 (1) KBO 예측 모델 발전 4 sub-track + (2) 웹 구조/디자인/기획 4 sub-track 을 병렬 ship. MLB 풀 인제스트는 보류 — IA refactor 안 future MLB 슬롯만 박제.

## 자가검증 (드리프트 6건 보정 후)

| Sub-track | 가정 | 실측 | 보정 |
|---|---|---|---|
| M-F1 park_weather | 기상청 API 신규 | Open-Meteo 박제 + `games.weather` JSONB (mig 015) | factor scoring 함수만 신규 + DEFAULT_WEIGHTS 추가 |
| M-F2 umpire_sz | 신규 | 0건 | mig 029 + scraper 신규 (진짜 신규) |
| M-V2 shadow | `v2.0-shadow` | `v2.1-B` 박제 (`/v2-preview` noindex) | `v2.1-B-shadow` 명명 정합 |
| M-D drift v2 | `/debug/silent-drift` 신규 | M14 박제 (cycle 947) | extension only |
| W-FV factor viz | `<FactorBreakdownChart>` 신규 | `FactorBreakdown.tsx` 박제 | 확장 + factor 11/12 row + chart variant |
| W-SEO article | schema.org JSON-LD 신규 | 패턴 박제 (layout + guide + insights) | 시리즈 라우트만 신규 |

## 아키텍처

```
Day 1 (12h)                          Day 2 (12h)
─────────────────────────────────    ─────────────────────────────────
Main thread (coord, 2h)              Main thread (review + ship, 4h)
├─ Migration 029 (umpire_stats)      ├─ autoplan 4축 (CEO+design+eng+DX)
├─ V2.1-B-shadow scoring rule wire   ├─ ship batch
└─ Worker spawn (TeamCreate)         └─ canary monitor

Worker A — Model (parallel, 10h)     Worker A — Model (8h)
├─ M-F1 park_weather scoring func    ├─ shadow backtest evidence 박제
├─ M-F2 umpire scraper + table        ├─ /accuracy/shadow card
├─ M-V2 shadow row wiring            └─ M-D extension: factor delta + alert
└─ M-D extension scaffold

Worker B — Web (parallel, 10h)       Worker B — Web (8h)
├─ W-IA NAV 리그 셀렉터               ├─ W-SEO 시리즈 라우트 + JSON-LD
├─ W-FV factor viz 확장              ├─ OG card 동적 (factor breakdown)
├─ W-D DESIGN.md polish              └─ sitemap 자동 확장
└─ W-IA /mlb sub-nav placeholder
```

## 8 sub-track 명세

### Model 4 (Worker A)

#### M-F1 — `park_weather` factor (factor 11)

- **scope**: factor scoring function 만 신규 + DEFAULT_WEIGHTS 추가 (Open-Meteo collector 이미 박제됨)
- **파일**:
  - `packages/kbo-data/src/factors/park-weather.ts` 신규 — `scoreParkWeather(weather: WeatherSnapshot, parkFactor: number): { homeAdj: number; awayAdj: number; reason: string }` (기온<10°C HR -15% / 바람 외야 방향 HR +10% / 강수 5mm↑ 양팀 점수 -8%)
  - `packages/shared/src/weights.ts` `DEFAULT_WEIGHTS` 안 `park_weather: 0` (production 가중치 0, shadow cohort 에서만 weight>0)
  - `packages/kbo-data/src/engine/predict.ts` factor 합산 안 wire
  - `packages/kbo-data/src/__tests__/park-weather.test.ts` 5 unit test (저온 / 바람 외야 / 강수 / 돔구장 (서울/대구 X, 인천 wyvern 야외) / 결측 fallback)
- **kill criteria**: Open-Meteo 응답률 5%↑ 실패 (4 시간 monitor) OR games.weather null 비율 30%↑ → factor 보류
- **rollback**: DEFAULT_WEIGHTS 안 0 만 유지하면 production noop

#### M-F2 — `umpire_sz` factor (factor 12)

- **scope**: KBO 게임센터 심판 스크래퍼 + `umpire_stats` table (mig 029) 신규
- **파일**:
  - `supabase/migrations/029_umpire_stats.sql` — `umpire_stats (id, name VARCHAR(10) UNIQUE, sz_widen_pct DECIMAL(4,2), sample_n INT, updated_at)`
  - `packages/kbo-data/src/scrapers/umpire.ts` 신규 — KBO 게임센터 심판 4인 (주심/1루/2루/3루) HTML 셀렉터 + 누적 카운트
  - `packages/kbo-data/src/factors/umpire-sz.ts` 신규 — `scoreUmpireSZ(umpireName: string, ...)` (DB lookup 시 sample_n<30 = league avg fallback, sample_n>=30 = personalize)
  - `packages/shared/src/weights.ts` `umpire_sz: 0`
  - `packages/kbo-data/src/__tests__/umpire-sz.test.ts` 5 unit test (DB lookup + fallback + sample_n threshold + 결측 / mock scraper)
- **kill criteria**: KBO 게임센터 심판 HTML 셀렉터 부재 OR robots.txt 차단 OR scraping rate limit (요청간 2초 준수) → league-avg only stub ship + 향후 scraping 보류
- **rollback**: DEFAULT_WEIGHTS 안 0 유지

#### M-V2 — `v2.1-B-shadow` cohort

- **scope**: 동일 경기 동일 input 으로 `scoring_rule='v2.1-B-shadow'` row 별도 누적, daily Brier delta 측정
- **파일**:
  - `packages/kbo-data/src/pipeline/daily.ts` 안 v1.8 fire 직후 동일 input 으로 v2.1-B 가중치 재계산 row insert (debate LLM 호출 X — quant 재계산 only, 비용 0)
  - `apps/moneyball/src/app/accuracy/shadow/page.tsx` 신규 (BASIC auth, /debug/* 패턴 정합) — v1.8 vs v2.1-B-shadow 일별 Brier delta + 적중률 delta + 가중치 표
  - `packages/kbo-data/src/__tests__/shadow-cohort.test.ts` 4 unit test (row pair insert + Brier delta calc + cohort split + 결측)
- **kill criteria**: shadow row insert 실패율 24h 10%↑ → shadow wiring 비활성, v1.8-only 유지
- **rollback**: shadow row insert 함수 안 early return

#### M-D — silent drift v2 extension

- **scope**: 박제된 `/debug/silent-drift` 확장 — factor delta timeline + Sentry warning 채널 timeline + TabPFN stub 박제
- **파일**:
  - `apps/moneyball/src/app/debug/silent-drift/page.tsx` 확장 — `<FactorDeltaTimeline>` (10 factor + 신규 2 factor weight 변화 + scoring_rule 별 cohort) 박제
  - `packages/kbo-data/src/notify/silent-drift-alert.ts` 안 factor anomaly 감지 (factor 값 z-score>3 시 Sentry warning) 확장
  - `scripts/export-predictions-tabpfn.ts` stub 박제 (사용자 GPU 결정 후 fire, 본 plan = stub only)
  - 4 unit test 신규
- **kill criteria**: 해당 없음 (extension only)

### Web 4 (Worker B)

#### W-IA — 리그 셀렉터 NAV (MLB-ready)

- **scope**: Header NAV 최상위 "리그" pill 박제 (KBO=default / MLB=베타 / 로또), 각 리그 안 동일 sub-NAV 구조 placeholder
- **파일**:
  - `apps/moneyball/src/components/layout/Header.tsx` `NAV_ITEMS` 재구조 — top-level `league: 'kbo' | 'mlb' | 'lotto'` 분기 + KBO sub-NAV 기존 박제 그대로
  - `apps/moneyball/src/components/layout/LeagueSelector.tsx` 신규 (pill UI + active state + 모바일 collapse)
  - `apps/moneyball/src/app/mlb/page.tsx` 안 동일 sub-NAV slot placeholder 박제 (실제 sub-route 는 후속 plan, 본 plan = NAV slot 만)
  - `apps/moneyball/src/components/layout/__tests__/LeagueSelector.test.tsx` 5 unit test (active / 모바일 / a11y / 라우팅 / fallback)
- **kill criteria**: 모바일 NAV breakage OR /mlb sub-route 404 cascade → 리그 픽커 hide + 기존 NAV 유지
- **rollback**: `LeagueSelector` 컴포넌트 mount 분기만 제거

#### W-FV — factor breakdown viz 확장

- **scope**: 박제된 `FactorBreakdown.tsx` 확장 — chart variant (horizontal bar + factor 기여도) + factor 11/12 row 박제 + 라이벌리 메모리 surface
- **파일**:
  - `apps/moneyball/src/components/predictions/FactorBreakdown.tsx` 확장 — `chart?: boolean` prop 신규, true 시 win prob 기여도 horizontal bar 렌더 (factor-neutral CSS token 활용)
  - `apps/moneyball/src/components/predictions/RivalryMemorySurface.tsx` 신규 — agent_memories 테이블 안 team_pair 메모리 카드 (max 3)
  - `apps/moneyball/src/app/analysis/game/[id]/page.tsx` 안 wire
  - 4 unit test 신규
- **kill criteria**: chart 렌더 LCP 4s↑ → `dynamic import` + `'use client'` lazy
- **rollback**: `chart` prop default false

#### W-D — DESIGN.md polish + 컴포넌트 라이브러리

- **scope**: 토큰 정리 + 다크/라이트 컨트라스트 검증 + motion 강화 + 컴포넌트 1pager
- **파일**:
  - `DESIGN.md` 갱신 — 토큰 일관성 (color/spacing/font scale 정렬) + motion section 신규 (predict reveal animation + page transition)
  - `apps/moneyball/src/app/globals.css` 안 motion CSS variable + `prefers-reduced-motion` 가드
  - `apps/moneyball/src/components/predictions/PredictReveal.tsx` 신규 (win prob 카운트업 애니메이션, 200ms)
  - `docs/design/components.md` 신규 — 컴포넌트 라이브러리 1pager (Header / Card / Chart / Reveal 4 카테고리)
- **kill criteria**: dark mode WCAG AA contrast fail (axe-core scan) → 토큰 revert
- **rollback**: DESIGN.md git revert + globals.css motion variable 제거

#### W-SEO — article 시리즈 + JSON-LD + OG 강화

- **scope**: `/insights/series/<topic>` 신규 라우트 + schema.org SportsEvent/SportsTeam/Person JSON-LD + OG card 동적 (factor breakdown 미니)
- **파일**:
  - `apps/moneyball/src/app/insights/series/[topic]/page.tsx` 신규 — DB 안 동일 topic 예측 reasoning 시계열 archive (예: "잠실 KIA vs LG 시리즈")
  - `apps/moneyball/src/app/insights/series/[topic]/opengraph-image.tsx` 신규 — 동적 OG (CJK fallback 영문 + 이모지)
  - `apps/moneyball/src/lib/seo/json-ld.ts` 신규 — SportsEvent / SportsTeam / Person 헬퍼 (insights/guide 패턴 정합)
  - `apps/moneyball/src/app/analysis/game/[id]/page.tsx` SportsEvent JSON-LD wire
  - `apps/moneyball/src/app/sitemap.ts` 안 시리즈 라우트 자동 포함
  - 4 unit test (라우트 + JSON-LD shape + sitemap + OG)
- **kill criteria**: Google Search Console crawl error 5↑ (24h monitor) → JSON-LD wire 일시 비활성
- **rollback**: 시리즈 라우트 noindex + JSON-LD wire 제거

## 의존성 그래프

```
Independent (병렬 fire 가능):
  M-F1 ⊥ M-F2 ⊥ W-IA ⊥ W-D ⊥ W-SEO

Serial (선행 의존):
  M-V2 needs M-F1+M-F2 stub (DEFAULT_WEIGHTS 박제만 — body 0 도 ok)
  M-D extension needs M-V2 (factor delta timeline = shadow cohort 활용)
  W-FV needs M-V2 evidence (Day 2 ship)

Cross-track 무관:
  W-IA "MLB" pill = IA only, MLB pred 동기화 X
```

## 위험 표면

1. **shadow cohort 비용** — debate LLM 호출 X (quant only) → 비용 0. 정합.
2. **Open-Meteo rate limit** — 무료 tier 10,000 req/day. 일 14 경기 × 1 = 14 req → 0.14% 사용. risk 0.
3. **KBO 게임센터 심판 HTML 셀렉터 변경** — risk 중. mock fixture 박제 + scraping fail 시 league-avg fallback.
4. **NAV breakage** — gstack browse 매 ship 검증 (모바일/데스크탑).
5. **TabPFN GPU 결정** — 사용자 영역, 본 plan = stub 박제만.
6. **2 worker 파일 충돌** — DESIGN.md/globals.css = W-D only, Header.tsx = W-IA only, predict.ts = Worker A only. 충돌 영역 0.

## Success criteria

### Day 1
- [ ] Migration 029_umpire_stats ship
- [ ] M-F1 park_weather scoring 함수 + 5 unit test PASS
- [ ] M-F2 umpire scraper + factor + 5 unit test PASS
- [ ] M-V2 shadow row wiring + 4 unit test PASS
- [ ] M-D extension scaffold + 4 unit test PASS
- [ ] W-IA LeagueSelector + 5 unit test PASS
- [ ] W-FV chart variant + 4 unit test PASS
- [ ] W-D DESIGN.md polish commit + PredictReveal + components.md
- [ ] W-SEO 시리즈 라우트 + JSON-LD + 4 unit test PASS

### Day 2
- [ ] shadow cohort backtest evidence 박제 (`docs/research/v2.1-B-shadow-day1.md`)
- [ ] /accuracy/shadow card ship
- [ ] silent drift v2 alert channel evidence
- [ ] OG card 동적 ship
- [ ] sitemap 자동 확장
- [ ] autoplan 4축 review PASS (CEO + design + eng + DX)
- [ ] 모든 sub-track PR ship + auto-merge (R7 정책)

## 자가 의심 차단

- shadow cohort = evidence 누적만, v2.0 확정 결정 X (n=150 도달 후 결정)
- 신규 factor 가중치 = 0 (DEFAULT_WEIGHTS 안), shadow 에서만 weight>0
- TabPFN = stub 박제만, 사용자 GPU 결정 carry-over
- IA 리그 셀렉터 = MLB 풀 인제스트 X (slot 만 박제)
- 본 plan = harness + factor + IA + viz 박제. 모델 production 가중치 변경 X

## 다음 step

1. 사용자 spec review (본 파일)
2. 승인 시 writing-plans skill 진입 (implementation plan 작성)
3. autoplan 4축 review (CEO + design + eng + DX)
4. TeamCreate Worker A + Worker B spawn
5. Day 1 + Day 2 ship
