# MLB League 도입 — Design Spec

**Status**: draft (사용자 검토 wait)
**Created**: 2026-05-29 (cycle 1022 후속)
**Author**: 본 메인 + 사용자 brainstorming session
**Related**:
- `docs/decisions/mlb-vs-kbo-priority.md` (B 결정 reverse — MLB 풀 인제스트 fire)
- `docs/decisions/statcast-factor-13-scope.md` (B Fancy batted ball 활용 + Statcast 4 factor 통합)
- `DESIGN.md ## Future / MLB IA` (시안 spec — 본 spec 결정 후 lock 해제 + 9 sub-route 확장 정합 갱신)
- `~/.develop-cycle/plans/moneyballscore/15.md` (plan #15 C1f Statcast scope 결정)

---

## 1. 개요

KBO 운영 중 moneyballscore (Next.js 16 App Router / Supabase / Vercel Pro) 에 **MLB 풀 인제스트 + 사용자 가시 + 예측 모델 박제**.

핵심 결정:
- **AI 토론 제거** — Anthropic API delta cost 0 (원 추정 $830/month → $0)
- **인증 layer 후순위** — 1st ship 박제 X (placeholder UI + ETA 명시만)
- **Telegram 한 채널 통합** — recap+preview 통합 1건 발송
- **글로벌 monetization** — 영문 i18n layer (KBO 한국어 유지)
- **모델 = KBO v1.8 정합** + Statcast 4 factor 추가 (14 factor 본선) + Shadow C 학습 weights cohort

ship target = **2026-06 중순 ~ 06 말** (~1.5~2주 fast track) — postseason 자동 만남.

---

## 2. Scope (박제 결정 13건)

### 2.1 Scope
- **B** 풀 인제스트 (30팀 162game = 2430 game/season)
- AI 토론 **X** (5 agent invocation 0 → Anthropic delta 0)
- 사용자 가시 layer 풀 (9 sub-route + 영문 mirror 9)

### 2.2 라이선스 layer (E risk acceptance)
- 3 source (statsapi.mlb / FanGraphs / Baseball Savant) = ToS 자동 스크립트 + commercial use 명시 금지
- KBO 현 박제 path (robots.txt `/ws/` Disallow + Referer 봇 차단 회피 — 사례 8) = 동일 위반 path 운영 중
- **MLB 도입 = KBO 정합 risk acceptance** — **사용자 명시 결정** (2026-05-29 brainstorming session) — 본 메인 자동 fire X (security layer 정합)
- 법적 효력: robots.txt = 효력 0 / 공개 데이터 scraping = hiQ v. LinkedIn precedent / copyright = facts X / commercial fair use 주장 가능 path
- 적발 risk: DMCA / takedown / AdSense reject / repo takedown / 도메인 lock
- mitigation: 사용자 risk acceptance + KBO 정합 — 별도 회피 layer 박제 X

### 2.3 Telegram 알림
- 한 채널 (현 KBO bot 1개 + chat_id 1개 정합)
- MLB combined 통합 — recap (어제 결과 + 적중률) + preview (오늘 새벽 경기 선발 + 예측) 1건 발송
- 발송 timing = KST 19:00 (모든 MLB 경기 KST 17~18시 종료 후)
- 평일/주말 분리:
  - 화~금: KBO announce 09 + MLB combined 19 + KBO verify 22 + KBO summary 24 (일 4건)
  - 월요일: MLB combined 19 only (KBO OFF, 일 1건)
  - 토요일: KBO announce 09 + MLB combined 16 (KBO 17시 시작 30분 전) + KBO verify 22 + KBO summary 24
  - 일요일: KBO announce 09 + MLB combined 13 or 16 (KBO 14/17시 시작 30분 전) + KBO verify 22 + KBO summary 24
  - 올스타 break (7월 중순 ~1주): KBO 3건 only (MLB OFF)
- 메시지 4096 char 초과 시 split (~15 경기 × 2 layer = ~3000~5000 char 추정)
- 선발 D-1 변동 case: recap fine-print "선발 변경: A→B, 예측 갱신 결과 박제" 박제

### 2.4 IA (D Hybrid mount + cross-league header)
- KBO root URL 유지 (SEO 보호) — `/` mount
- MLB mount = `/mlb/*` (9 sub-route)
- Cross-league shared = header utility (검색 / 정보 / 설정 — league 무관)
- league pill 박제 (KBO ⇄ MLB switcher)
- KBO sub-nav 변경 X (현 5 group 유지)
- MLB sub-nav = 분기 (오늘 / 분석 / 시즌 / 검증 + ⭐ Wild Card / ⭐ PS / ⭐ Statcast)

MLB sub-route 9:
```
/mlb                  hub (현 waitlist → 풀 hub 전환)
/mlb/games/[date]     일자별 경기 list
/mlb/games/[date]/[slug]  경기 상세 (14 factor + waterfall + analog)
/mlb/team/[code]      팀 시즌 stat
/mlb/players/[id]     ← MLB only (Statcast deep-dive)
/mlb/factors          MLB 가중치 설명
/mlb/standings        AL/NL 6 division
/mlb/wild-card        ← MLB only (race tracker)
/mlb/postseason       ← MLB only (PS 시즌 bracket)
```

### 2.5 인증 / 알림 / community (G 후순위)
- 1st ship 박제 X — placeholder UI 박제만
- placeholder UI = "📌 회원 기능 박제 중 — 2026-08~09 ship 예정" 문구 + button 비활성화
- email waitlist X (사용자 결정 — 출시 알림 받기 기능 박제 X)
- placeholder 페이지 3 신규: `/login`, `/settings`, `/community`
- 후속 plan #18: 인증 layer (Google + Kakao + 이메일 Magic Link, Supabase Auth)
- 후속 plan #19: 알림 연결 layer (Telegram opt-in, Login Widget + Edge Function)
- 후속 plan #20: community (UGC 게시판, 인증 layer 의존)

### 2.6 DB schema (A league column)
- 기존 8 table + `league VARCHAR(10) NOT NULL DEFAULT 'kbo'` column 추가
- 신규 column (MLB Statcast 4):
  - `home_lineup_xwoba`, `away_lineup_xwoba`
  - `home_lineup_barrel_pct`, `away_lineup_barrel_pct`
  - `home_lineup_hard_hit_pct`, `away_lineup_hard_hit_pct`
  - `home_lineup_launch_angle`, `away_lineup_launch_angle`
  - (KBO row = NULL nullable)
- 신규 column (timezone 정합):
  - `games.game_datetime_utc TIMESTAMPTZ NOT NULL` (UTC) — DST 변환 layer
- 신규 table 2:
  - `shadow_weights` (cohort_size / model_version / weights JSONB / brier / accuracy / trained_at)
  - `walk_forward_brier` (month / cohort_size / brier_base / brier_shadow / delta / measured_at)
- migration 신규 4: `033_mlb_league_column.sql`, `034_mlb_statcast_factors.sql`, `035_mlb_shadow_weights.sql`, `036_mlb_walk_forward_brier.sql`

### 2.7 모델 (★ B 본선 + Shadow C)
- 본선 = KBO 10 factor + Statcast 4 추가 = 14 factor
- 가중치 (1st ship 박제 — 시즌 forward 측정 후 정정 가능):
  - 선발FIP 12% / 선발xFIP 3% / 타선wOBA 10% / 불펜FIP 10% / 최근폼 10% / WAR 8% / H2H 3% / 구장 4% / Elo 10% / 수비SFR 5% (= 75%)
  - 타선xwOBA 5% / 타선Barrel% 3% / 선발xwOBA-against 4% / wOBA std 3% (= 15%)
  - HOME_ELO_BONUS 10% (= 100%)
- Shadow C = 학습 weights cohort (historical 2024+2025 적재 + logistic regression / XGBoost / Elo baseline)
- escalation trigger = **milestone trigger + walk-forward expanding**:
  - milestone: n=27 / n=60 / n=150 / n=300 / n=1000 / n=2430 (시즌 종료)
  - walk-forward: 매월 1일 expanding window Brier 측정
  - kill-switch: delta < -0.02 (v1.8 -2pp 하회) → Sentry alert
- 첫 escalation 결정 = n=150 도달 시점 (~2026-08~09 추정, ~10주 후)
- 2027 spring training (2027-03) 전 v2 weights 정식 ship 가능

### 2.8 Scraper (C Hybrid)
- Sprint 1: statsapi.mlb (critical path — schedule + probablePitcher + 결과)
- Sprint 2a + 2b 병렬: FanGraphs MLB + Baseball Savant (worktree isolation `/tmp/mb-*` 강제)
- Sprint 3: factor pipeline 14 factor 확장
- Sprint 4: 9 sub-route + Cross-league header
- Sprint 5: ship + cron 7건 + silent-drift alert
- 신규 scraper 4: `statsapi-mlb.ts`, `fangraphs-mlb.ts`, `baseball-savant.ts`, `mlb-historical-bootstrap.ts`
- KBO scraper 변경 X (kbo-official / fancy-stats / fangraphs 정합)

### 2.9 SEO / i18n (B MLB 영문 + KBO 한국어)
- KBO root mount = 한국어 (변경 X)
- MLB 한국어 default = `/mlb/*` (root mount)
- MLB 영문 mirror = `/en/mlb/*` (9 페이지 신규)
- i18n routing 방식 = **manual `/en/mlb/*` mirror** (Next.js 16 App Router native + 본 메인 직접 작성)
  - next-intl 외부 라이브러리 X (1st ship)
  - i18n 라이브러리 도입 = future refactor scope carry-over
- hreflang link + sitemap multilingual 박제
- 영문 카피 작성 = **본 메인 직접 작성** (Claude Opus 4.7, 사용자 plan 안 토큰만 사용 → 추가 비용 0)
- 후속 신규 페이지 추가 시 = 본 메인 invoke 시 동시 영문 카피 박제

### 2.10 Cron (D Hybrid GHA + silent-drift alert)
- 인프라 = GitHub Actions cron (KBO 정합 — repo public = unlimited 무료)
- silent-drift alert layer (cycle 819 패턴 정합 — `silent-drift-alert.ts` 재사용)
- 신규 cron 7건:

| `.github/workflows/` | schedule (UTC) | KST | 책임 |
|---|---|---|---|
| `mlb-statsapi-scrape.yml` | `'0 19 * * *'` | 04:00 매일 | schedule + 선발 + 결과 인제스트 |
| `mlb-fancy-scrape.yml` | `'0 20 * * *'` | 05:00 매일 | FanGraphs 시즌 stat 인제스트 |
| `mlb-savant-scrape.yml` | `'0 21 * * *'` | 06:00 매일 | Baseball Savant Statcast 인제스트 |
| `mlb-predict-final.yml` | `'0 18 * * *'` | 03:00 매일 | factor pipeline → INSERT predictions |
| `mlb-combined-notify.yml` | `'0 10 * * *'` | 19:00 매일 | recap + preview 통합 Telegram 발송 |
| `mlb-shadow-train.yml` | `'0 14 * * 0'` | 23:00 매주 일요일 | Shadow C train + milestone trigger |
| `mlb-walk-forward-measure.yml` | `'0 17 1 * *'` | 02:00 매월 1일 | expanding window Brier 측정 + kill-switch |

historical bootstrap = cron X (1회 manual fire script)

cron schedule = UTC 기준 박제 (KST 자동 정합 — DST 영향 X, 시즌 timing 정합 — KBO `submit-lesson.yml` / `indexnow-ping.yml` 패턴 정합).

### 2.11 일정 (~1.5~2주 fast track ship)

```
2026-05-29 (today) ── design doc 작성 (이 문서) + spec self-review + user review
2026-05-30 ~ 06-02 (4일) ── Sprint 1 + 2 (statsapi + FanGraphs + Savant + DB migration)
2026-06-03 ~ 06-05 (3일) ── Sprint 3 + 4 (factor pipeline + 9 sub-route + 영문 layer + Cross-league header)
2026-06-06 ~ 06-08 (3일) ── Sprint 5 (cron + silent-drift alert + Shadow C bootstrap)
2026-06-09 ~ 06-15 (1주) ── 실주행 검증 + Shadow historical fetch + 사용자 영역 작업
2026-06-15 ~ 06-20 ── ✅ 본선 ship (Vercel production) + 실시간 cohort 박제 시작
2026-08~09 ── n=150 도달 + escalation 검증 + 인증 layer 후속 plan #18 ship
2026-10 ── postseason 자동 만남 (Wild Card / DS / LCS / WS — 글로벌 사용자 organic fire)
2026-11 초 ── WS 종료 + Shadow C 풀 시즌 학습 weights 검증
2027-01 ~ 02 ── v2 weights escalation 결정 (n=2430+ 도달)
2027-03 ── 2027 시즌 시작 — v2 weights 정식
```

### 2.12 비용 (총 $0/month)

| 인프라 | 추가 비용 |
|---|---|
| Vercel Pro Active CPU | $0 (included 1000 GB-h / MLB 추가 ~14.5 GB-h = 1.45% 사용) |
| Vercel function invocations | $0 (included 1M / MLB 5 cron × 30일 = 150 invocations) |
| Anthropic API | $0 (AI 토론 X) |
| Supabase | $0 (무료 plan 500MB DB / MLB ~20MB/season) |
| GitHub Actions cron | $0 (public repo unlimited) |
| Sentry | $0 (Dev plan 5K errors/month) |
| Telegram bot | $0 (unlimited) |
| Claude Haiku 영문 카피 | $0 (본 메인 직접 작성) |

### 2.13 Todo (carry-over)
- 신규 MLB-only 수집 가능 metric 시즌 OFF (11월~3월) audit (Statcast 신규 / FanGraphs 신규 / Savant 신규 → 반영 후보 평가)
- 알림 채널 후속 (이메일 newsletter / PWA web-push / Discord)
- KBO players page 후속 plan
- i18n 라이브러리 도입 refactor (next-intl 또는 native generateStaticParams)
- Vercel Analytics paid plan ($25/month) escalation (사용자 base 증가 시)
- Supabase Pro plan ($25/month) escalation (50K MAU 초과 시)

---

## 3. Architecture

```
moneyballscore (모노레포)
├── apps/moneyball/src/app/
│   ├── /                       ← KBO root mount (한국어 / 변경 X)
│   ├── /[KBO sub-routes]       ← 변경 X
│   ├── /login                  ← placeholder (cross-league shared)
│   ├── /settings               ← placeholder
│   ├── /community              ← placeholder (후속 plan #20)
│   ├── /mlb                    ← MLB hub (현 waitlist → 풀 hub 전환)
│   ├── /mlb/games/[date]
│   ├── /mlb/games/[date]/[slug]
│   ├── /mlb/team/[code]
│   ├── /mlb/players/[id]       ← MLB only (Statcast deep-dive)
│   ├── /mlb/factors
│   ├── /mlb/standings          ← AL/NL 6 division
│   ├── /mlb/wild-card          ← MLB only
│   ├── /mlb/postseason         ← MLB only
│   └── /en/mlb/*               ← 영문 i18n layer (9 페이지 mirror)
│
├── apps/moneyball/src/components/
│   ├── layout/Header.tsx       ← 변경 (LeaguePill embed + utility nav)
│   ├── layout/LeaguePill.tsx   ← 신규 (KBO ⇄ MLB switcher)
│   ├── layout/PlaceholderLoginButton.tsx ← 신규
│   └── notify/MlbCombinedMessage.ts ← 신규 (recap+preview 포맷)
│
├── packages/kbo-data/src/
│   ├── agents/                 ← 현 박제 유지 (AI 토론, KBO only)
│   ├── scrapers/
│   │   ├── kbo-official.ts     ← 현 박제 (변경 X)
│   │   ├── fancy-stats.ts      ← 현 박제 (변경 X)
│   │   ├── fangraphs.ts        ← 현 박제 KBO (변경 X)
│   │   ├── statsapi-mlb.ts     ← 신규 Sprint 1
│   │   ├── fangraphs-mlb.ts    ← 신규 Sprint 2a
│   │   ├── baseball-savant.ts  ← 신규 Sprint 2b
│   │   └── mlb-historical-bootstrap.ts ← 신규 (1회 fire script)
│   ├── factors/
│   │   ├── kbo-v1.8.ts         ← 현 박제 (변경 X)
│   │   ├── mlb-base.ts         ← 신규 (14 factor 본선)
│   │   └── mlb-shadow-c.ts     ← 신규 (학습 weights)
│   └── lib/
│       └── silent-drift-alert.ts ← 현 박제 재사용 (cycle 819)
│
├── supabase/migrations/
│   ├── 033_mlb_league_column.sql   ← 신규
│   ├── 034_mlb_statcast_factors.sql ← 신규
│   ├── 035_mlb_shadow_weights.sql  ← 신규
│   └── 036_mlb_walk_forward_brier.sql ← 신규
│
└── .github/workflows/
    ├── mlb-statsapi-scrape.yml     ← 신규
    ├── mlb-fancy-scrape.yml        ← 신규
    ├── mlb-savant-scrape.yml       ← 신규
    ├── mlb-predict-final.yml       ← 신규
    ├── mlb-combined-notify.yml     ← 신규
    ├── mlb-shadow-train.yml        ← 신규
    └── mlb-walk-forward-measure.yml ← 신규
```

KBO 영향 = 0 (root mount / KBO sub-route / KBO scraper / KBO factor pipeline 모두 변경 X).

---

## 4. Components

### 4.1 Scraper layer (4 신규)

| 파일 | 책임 | 입력 | 출력 |
|---|---|---|---|
| `statsapi-mlb.ts` | 일정 / 선발 / 결과 / box score | `date YYYY-MM-DD` | `Game[]` (game_id / home / away / status / probable_pitcher / score / inning) |
| `fangraphs-mlb.ts` | 시즌 stat / batted ball | `season` | `TeamSeasonStat[]` (wOBA / FIP / xFIP / WAR / LD/GB/FB/IFFB% / HR/FB / Pull/Cent/Oppo%) |
| `baseball-savant.ts` | Statcast 4 factor | `season` | `TeamStatcast[]` (xwOBA / Barrel% / Hard Hit% / Launch Angle / Sprint Speed) |
| `mlb-historical-bootstrap.ts` | Shadow C historical 적재 (1회 fire) | `seasons[]` (2024, 2025) | INSERT historical_games |

공통 layer (KBO scrapers 패턴 정합):
- 2초 rate limit (요청 사이 sleep)
- cheerio HTML parse 또는 JSON parse 또는 CSV parse
- 신뢰도 검증 (null check + 범위 검증)
- silent drift alert (rows=0 + games_found>0 mismatch → Sentry warning)
- error → Sentry capture + 다음 cron 재시도
- 401/403 ToS enforcement 적발 → 24h cool down

### 4.2 Factor pipeline (2 신규)

`mlb-base.ts` 14 factor (본선):
- 선발FIP 12% / 선발xFIP 3% / 타선wOBA 10% / 불펜FIP 10% / 최근폼 10% / WAR 8% / H2H 3% / 구장 4% / Elo 10% / 수비SFR 5% (= 75%)
- 타선xwOBA 5% / 타선Barrel% 3% / 선발xwOBA-against 4% / wOBA std 3% (= 15%)
- HOME_ELO_BONUS 10% (= 100%)
- probability clamp 0.15~0.85 (KBO judge-agent 정합)

`mlb-shadow-c.ts`:
- historical 2024+2025 cohort 적재
- logistic regression / XGBoost / Elo baseline
- walk-forward Brier 측정
- milestone trigger (n=27 / n=60 / n=150 / n=300 / n=1000 / n=2430)
- shadow_weights table 박제 (model_version=`'shadow-c-v{milestone_index}'`, 예: `shadow-c-v1` = n=27 시점, `shadow-c-v2` = n=60, ...)

### 4.3 Page components (18 신규)

한국어 default (9): `app/mlb/*`
영문 mirror (9): `app/en/mlb/*`

페이지 데이터:
- `/mlb` hub = 오늘 경기 list + 적중률 hero + sub-route 진입
- `/mlb/games/[date]` = `SELECT * FROM predictions WHERE league='mlb' AND game_date=date`
- `/mlb/games/[date]/[slug]` = predictions + factor breakdown JSONB + waterfall + analog
- `/mlb/team/[code]` = `team_season_stats WHERE league='mlb'`
- `/mlb/players/[id]` = Savant raw data (Statcast deep-dive)
- `/mlb/factors` = factor metadata + 14 factor 설명
- `/mlb/standings` = team standings (AL/NL 6 division)
- `/mlb/wild-card` = standings + remaining schedule
- `/mlb/postseason` = playoff series bracket

### 4.4 Placeholder 페이지 (3 신규)

| 페이지 | 책임 |
|---|---|
| `/login` | "📌 회원 기능 박제 중 — 2026-08~09 ship 예정 (postseason 직전). 후속 plan #18 박제." |
| `/settings` | placeholder (인증 layer 후속) |
| `/community` | placeholder (community 후속 plan #20) |

KBO + MLB 양 mount cross-league shared placeholder.

### 4.5 Shared components (3 신규)

| 컴포넌트 | 책임 |
|---|---|
| `LeaguePill.tsx` | KBO ⇄ MLB pill switcher (header) |
| `PlaceholderLoginButton.tsx` | header 비활성화 button |
| `MlbCombinedMessage.ts` | Telegram MLB combined 메시지 포맷 (recap + preview 통합 + 4096 char split) |

### 4.6 Header.tsx 변경

- LeaguePill embed (top-left, 로고 옆)
- utility nav 박제 (🔍 검색 / 🌐 정보 / ⚙️ 설정)
- KBO sub-nav 변경 X (현 5 group 유지)
- MLB sub-nav 분기 (KBO mode 시 KBO sub-nav / MLB mode 시 MLB sub-nav 박제)
- DESIGN.md token 정합 layer 검증

### 4.7 Cron workflow (7 신규)

(2.10 표 참조)

---

## 5. Data Flow

### 5.1 Scraper → DB

```
KST 04:00 ── mlb-statsapi-scrape.yml
  └ statsapi.mlb.com/api/v1/schedule?date=<KST→UTC>
    → Game[] parse → INSERT games (league='mlb')
  └ statsapi.mlb.com/api/v1/schedule?hydrate=probablePitcher
    → UPDATE games SET home_sp_id, away_sp_id WHERE status='scheduled'
  └ statsapi.mlb.com/api/v1/game/<id>/boxscore (status='final')
    → UPDATE games SET winner, score, status='final'
    → UPDATE predictions SET is_correct, actual_winner, verified_at

KST 05:00 ── mlb-fancy-scrape.yml
  └ fangraphs.com/leaders/international (cheerio parse)
    → UPSERT team_season_stats (league='mlb')

KST 06:00 ── mlb-savant-scrape.yml
  └ baseballsavant.mlb.com/leaderboard/expected_statistics (CSV)
    → UPSERT team_season_stats SET statcast_* WHERE league='mlb'
```

### 5.2 DB → factor pipeline → prediction

```
KST 03:00 ── mlb-predict-final.yml
  └ SELECT games WHERE league='mlb' AND status='scheduled' AND game_date >= today
  └ SELECT team_season_stats WHERE league='mlb'
  └ mlb-base.ts factor pipeline (14 factor + HOME_ELO_BONUS)
  └ probability clamp 0.15~0.85
  └ INSERT predictions (league='mlb', game_id, predicted_winner, confidence, factor_breakdown JSONB)
```

### 5.3 Shadow C train

```
KST 23:00 매주 일요일 ── mlb-shadow-train.yml
  └ SELECT COUNT(*) FROM predictions WHERE league='mlb' AND verified_at IS NOT NULL
  └ if cohort_count >= milestone:
      ├ train logistic regression + XGBoost + Elo baseline
      ├ INSERT shadow_weights (cohort_size, model_version, weights, brier, accuracy)
      └ silent-drift alert (cohort > milestone but train fail)
  └ else: skip

KST 02:00 매월 1일 ── mlb-walk-forward-measure.yml
  └ expanding window Brier 측정
  └ INSERT walk_forward_brier (month, cohort_size, brier_base, brier_shadow, delta)
  └ kill-switch: delta < -0.02 → Sentry alert (v1.8 -2pp 하회)
```

### 5.4 Page render

```
사용자 GET /mlb/games/<date> 또는 /en/mlb/games/<date>
  └ Server Component
    └ SELECT predictions WHERE league='mlb' AND game_date=date
    └ render PageList (한국어 카피 — 본 메인 직접 작성)
      또는 PageListEn (영문 카피 — 본 메인 직접 작성)
```

### 5.5 Telegram notify

```
KST 19:00 ── mlb-combined-notify.yml
  ├ recap phase:
  │   SELECT predictions WHERE league='mlb' AND verified_at >= yesterday-23h
  │   format "[MLB recap] 어제 N경기 / 적중 X / Brier Y"
  ├ preview phase:
  │   SELECT predictions WHERE league='mlb' AND game_date >= tomorrow-KST AND status='scheduled'
  │   format "[MLB preview] 내일 새벽 N경기 / 빅매치 ★" (빅매치 criteria = confidence > 0.65 또는 playoff race / postseason / WAR delta > 5 — 후속 박제 layer)
  ├ combined message (recap + preview 통합)
  ├ 4096 char split (긴 경우)
  └ bot.sendMessage(chat_id, message)
```

### 5.6 Silent-drift detect

```
각 cron 후 detectSilentDrift(cronName, expected):
  └ if expected.games_found > 0 && expected.rows_inserted === 0
      → Sentry.captureMessage(..., 'warning')

추가 mismatch:
  - predict_final: predictions=0 + games_found>0 (사례 11)
  - verify: verified=0 + final>0 (verify silent skip)
  - scrape: parser 변경 detect (column count mismatch)
```

---

## 6. Error Handling

### 6.1 Scraper error

| 에러 | 처리 |
|---|---|
| rate limit (429/503) | exponential backoff 2→4→8초 (max 3 retry) |
| HTML parse fail | row 0 + Sentry warning (silent-drift) |
| API 401/403 (ToS 적발) | Sentry capture + 24h cool down |
| timeout (30s 초과) | Sentry capture + 다음 cron 재시도 |
| null 필수 field | row skip + Sentry warning |

### 6.2 DB error

| 에러 | 처리 |
|---|---|
| RLS denied | `createAdminClient()` service role bypass |
| UNIQUE 위반 | `ON CONFLICT DO NOTHING` |
| VARCHAR overflow (사례 3) | column 길이 검증 layer |
| NOT NULL 위반 | null guard + Sentry |
| FK 위반 | team_code fallback `'UNK'` |

### 6.3 Predict_final error

| 에러 | 처리 |
|---|---|
| factor null | predict skip + Sentry warning (사례 11 차단) |
| factor 범위 위반 | range validation + skip |
| probability NaN | clamp 0.15~0.85 |
| cohort empty | skip + Sentry info |

### 6.4 Cron error

| 에러 | 처리 |
|---|---|
| silent drop | `deploy-drift-alert.yml` 매시간 검사 (cycle 838) |
| workflow fail | GitHub Actions 알림 자동 |
| 부분 실패 | 각 cron 독립 |
| schedule drift (DST) | UTC 기준 schedule + KST 변환 명시 |

### 6.5 Telegram error

| 에러 | 처리 |
|---|---|
| bot rate limit | exponential backoff + queue |
| chat_id 무효 | error capture + skip |
| 4096 char 초과 | split into multiple messages |
| markdown parse fail | escape + fallback plain text |

### 6.6 Silent-drift detect layer

`silent-drift-alert.ts` 재사용 (cycle 819 박제) — 각 cron 안 호출.

### 6.7 영문 layer error

| 에러 | 처리 |
|---|---|
| 영문 카피 누락 | fallback 한국어 + Sentry warning |
| hreflang link 오류 | sitemap-multilingual.xml validation |

---

## 7. Testing

### 7.1 Unit test (~30 test)

| 대상 | 검증 |
|---|---|
| `statsapi-mlb.ts` | parse / null guard / range / rate limit retry |
| `fangraphs-mlb.ts` | cheerio parse / column guard / range / VARCHAR length |
| `baseball-savant.ts` | CSV parse / Statcast 4 mapping / Launch Angle range |
| `mlb-base.ts` | weight sum = 1.0 + HOME_ELO_BONUS + probability clamp |
| `mlb-shadow-c.ts` | walk-forward expanding + logistic regression + Brier |
| `MlbCombinedMessage.ts` | recap+preview 포맷 + 4096 char split |

### 7.2 Integration test (~8 test)

| 대상 | 검증 |
|---|---|
| Pipeline end-to-end | scrape mock → DB INSERT → predict_final → predictions INSERT |
| Silent-drift detect | games>0+rows=0 → Sentry fire (cycle 819) |
| 사례 11 silent silent drop | predict=0+games>0 → Sentry fire (강제) |
| DB migration | league column + index + RLS 정합 |

### 7.3 E2E test (Playwright, ~5 spec)

| 대상 | 검증 |
|---|---|
| 18 페이지 render (한국어 9 + 영문 9) | status 200 + breadcrumb |
| Cross-league header pill | KBO ⇄ MLB 분기 + URL transition |
| Placeholder UI | login/settings/community 비활성화 button + ETA 문구 |
| DST 변환 | UTC → KST DST boundary case (3월 둘째 일요일 / 11월 첫째 일요일) |
| i18n hreflang | `/mlb/*` ↔ `/en/mlb/*` alternate link + sitemap multilingual |

### 7.4 Regression test (~4 test)

| 대상 | 검증 |
|---|---|
| KBO 영향 0 | KBO 라우트 snapshot match (변경 X) |
| KBO scraper 영향 0 | kbo-official / fancy-stats / fangraphs 결과 변경 X |
| KBO predict_final 영향 0 | v1.8 가중치 + factor pipeline 정합 (n=27 / Brier 0.2505 / accuracy 40.74%) |
| Cross-league header | KBO mode 시 sub-nav 5 group 정합 |

### 7.5 Property-based (~6 test)

| 대상 | 검증 |
|---|---|
| Factor 범위 | FIP 0~10 / wOBA 0~0.5 / WAR -5~10 / xwOBA 0~0.5 / Barrel% 0~30 |
| Probability clamp | 모든 input → 0.15~0.85 |
| Factor weight sum | 1.0 + HOME_ELO_BONUS validation |

### 7.6 Snapshot (~2 test)

- Telegram MLB combined 포맷 + 4096 split
- Page metadata (한국어 + 영문 + hreflang)

### 7.7 Total

**~55 test (대략)** 박제 (KBO 패턴 정합 — lotto-routes / silent-drift-alert / waitlist 등). 정확 수치 = writing-plans skill 안 sprint 분리 시점에 박제 layer 명확화.

### 7.8 CI integration

`.github/workflows/test.yml` (현 박제 재사용) — Vitest + Playwright. 신규 workflow X.

---

## 8. 사용자 영역 작업 (1st ship 차단 X 후속 layer)

1st ship 차단 X (인증 layer 후순위 = 1st 박제 X):

후속 plan #18 (인증 layer ship 시) 사용자 영역 작업:
- Google OAuth Client ID / SECRET 발급 (Google Cloud Console)
- Kakao Developer 사업자 등록 + 검수 (1~3 영업일)
- Supabase Auth provider 활성화 (Supabase Dashboard)
- Vercel 환경 변수 등록 (`GOOGLE_CLIENT_ID`, `KAKAO_CLIENT_ID`, ...)

후속 plan #19 (알림 연결 layer ship 시):
- Telegram BotFather 도메인 verified 등록
- bot_token / bot_username Vercel env 등록

후속 plan #20 (community ship 시):
- 사용자 약관 / 개인정보 처리방침 보강 (UGC 정책)
- 모더레이션 cron 검증

1st ship 사용자 영역 작업:
- Sentry alert rule webhook URL 박제 (silent-drift alert layer 활성)
- Sentry alert rule webhook URL 박제 방식 = Sentry Dashboard 안 alert rule 박제 + webhook channel 연결 (사용자 영역)
- (선택) AdSense ad slot 사전 박제 (1st ship 후 심사 fire 가능)

---

## 9. 자가 검증 finding

### HIGH priority 검증 결과

| 검증 항목 | 결과 |
|---|---|
| 라이선스 layer | KBO 정합 risk acceptance 박제 (사용자 명시 결정) |
| Placeholder UI 이탈 risk | "📌 박제 중 + ETA" 문구만 (email waitlist X — 사용자 결정) |
| memory/implemented-modules read | 박제 archive 확인 — KBO 정합 layer 유지 / MLB 신규 only |

### MED priority (design doc 안 inline 박제)

| 검증 항목 | 처리 |
|---|---|
| Next.js 16 i18n routing | manual `/en/mlb/*` mirror (Section 2.9 박제) |
| DESIGN.md ## Future / MLB IA 정합 | 9 sub-route 확장 정합 갱신 wait (후속 PR 박제 layer) |
| 모순 검증 | 인증 후순위 ↔ Telegram = anonymous mode 단일 chat_id 박제 (현 KBO bot 정합) |

### LOW priority

| 검증 항목 | 처리 |
|---|---|
| 외부 API endpoint health | 1st ship 후 실주행 검증 layer (silent-drift alert 활성) |
| Sentry alert channel | 사용자 영역 (1st ship 박제 시 사용자 작업) |

### Section 자가 검증 finding inline 박제

- Section 4 자가 검증 #7 DST 변환 → Section 7.3 E2E test 박제
- Section 4 자가 검증 #8 Telegram 4096 split → Section 7.1 Unit test 박제
- Section 3 자가 검증 #6 predict_final cron = 별도 → Section 2.10 박제
- Section 3 자가 검증 #7 timezone = UTC TIMESTAMPTZ → Section 2.6 박제
- Section 3 자가 검증 #8 Shadow C train = milestone trigger + walk-forward → Section 2.7 박제

---

## 10. carry-over plan

| Plan # | 박제 |
|---|---|
| #18 | 인증 layer (Google + Kakao + 이메일 Magic Link, Supabase Auth) |
| #19 | 알림 연결 layer (Telegram opt-in, Login Widget + Edge Function) |
| #20 | community (UGC 게시판, 인증 layer 의존) |
| 후속 | KBO players page (cross-league mirror) |
| 후속 | i18n 라이브러리 refactor (next-intl 또는 native) |
| 후속 | 시즌 OFF metric audit (MLB-only 신규 데이터 source 평가) |
| 후속 | Vercel Analytics paid escalation (사용자 base 증가 시) |
| 후속 | Supabase Pro plan escalation (50K MAU 초과 시) |
| 후속 | AdSense ad slot 박제 (사용자 영역, 사이트 심사 후) |
| 후속 | PWA web-push (`docs/decisions/pwa-web-push-carryover.md` 정합) |

---

## 11. 본 spec 후속 단계

1. **spec self-review** (Task #7) — placeholder / consistency / scope / ambiguity 검증
2. **user review gate** (Task #8) — 사용자 spec 확인 + 변경 사항 박제
3. **writing-plans skill invoke** (Task #9) — 구현 plan 작성 (Sprint 단위 박제)
4. **R7 자동 머지 정합** — develop-cycle 안 자동 fire (4 prefix `feat:` / `fix:` / `data:` / `content:` / `refactor:` / `docs:` / `build:` / `ci:` / `perf:` / `test:` / `style:`)
5. **본 메인 자율 fire 영역** (사용자 결정 명시):
   - secrets/credentials 박제 layer = 사용자 영역
   - 100+ 파일 변경 = 사용자 확인
   - 그 외 = 자율 fire + R4 자동 commit + R7 자동 머지

---

## 12. 결정 source (사용자 명시 / 본 메인 추천)

| 결정 | source |
|---|---|
| scope B 풀 인제스트 | 사용자 명시 |
| AI 토론 X | 사용자 명시 |
| Telegram 한 채널 + MLB combined | 사용자 + 본 메인 정합 |
| IA D Hybrid + cross-league header | 사용자 통찰 + 본 메인 정정 |
| 인증 G 후순위 + placeholder UI | 사용자 통찰 |
| email waitlist X | 사용자 명시 |
| DB A league column | 본 메인 추천 + 사용자 채택 |
| 모델 ★ + Statcast 4 추가 | 사용자 통찰 + 본 메인 정정 (B 시작 → ★ B+Shadow C) |
| Shadow C train milestone + walk-forward | 사용자 통찰 (trade-off 검토 요청) + 본 메인 정정 |
| Scraper C Hybrid | 본 메인 추천 + 사용자 채택 |
| SEO B MLB 영문 + 본 메인 직접 작성 | 사용자 + 본 메인 (비용 0 path) |
| Cron D Hybrid GHA | 본 메인 추천 + 사용자 채택 |
| 일정 fast track | 사용자 통찰 (postseason 박제 가설 자가 검증) + 본 메인 정정 |
| 비용 $0/month | 본 메인 추천 (모든 무료 path) |
| 라이선스 E risk acceptance | 사용자 명시 결정 (security layer) |

---

End of design spec.
