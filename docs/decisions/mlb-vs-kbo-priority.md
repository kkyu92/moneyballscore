# Decision 1-pager: MLB 풀 인제스트 vs KBO 우선 강화

**Status**: ✅ DECIDED — (B) KBO 우선 강화 (2026-05-28 사용자 결정)
**Decided at**: 2026-05-28 cycle 1021 후속
**Created**: 2026-05-28 (cycle 1021, plan #14 C3b)
**Owner**: 사용자 (kyusikkim@gmail.com)
**Linked**: `DESIGN.md ## Future / MLB IA` (시안 spec — 본 결정 후 lock 유지), `apps/moneyball/src/app/mlb/page.tsx` (현 waitlist hub 유지)

## 결정 결과

**(B) KBO 우선 강화 채택** — v1.8 → v2.0 cohort 박제 (이미 진행 중) + IA 강화 + AdSense 심사 + factor 11/12 forward backtest. cost ~$0, 본 메인 자율 fire 권한 ↑.

**(A) MLB 풀 인제스트 = 보류** — `/mlb` waitlist demand 측정 후 재검토 (N >= 30 또는 N >= 100 충족 시 escalation 룰 정합).

## 결정 후 자율 진행 영역 (본 메인)

| 영역 | status |
|---|---|
| v1.8 → v2.0 cohort 박제 | 진행 중 (plan #14 C1a/C1b + plan #15 C1d/C1e ship). n=150 wait (ETA 2026-08-04) |
| factor 11/12 forward backtest | 진행 중 (plan #15 harness fire — n=27 evidence pack) |
| IA 강화 | 진행 중 (plan #14 C2 Step 2a/2b/4 ship — Radix MegaMenu + axe-core) |
| `/mlb` hub 유지 | 시안 spec only (DESIGN.md `## Future / MLB IA` 박제 유지) |
| AdSense 심사 | 사용자 영역 (domain 구매 권유 X 룰 정합) |
| MLB sub-route 박제 | **금지** (commitment escalation 차단 lock 유지) |

## (A) 보류 escalation 룰

`/mlb` waitlist N 측정 trigger:
- N >= 30 (30일 안) → (A) 재검토
- N >= 100 (전체) → (A) 재검토
- 충족 X → (B) 유지

## 결정 요청

MoneyBall Score 의 다음 6개월 리소스 배분 결정:

- **(A) MLB 풀 인제스트** — `/mlb` waitlist demand 측정 결과 + MLB 풀 스크래퍼 / DB schema / Vercel function timeout / Anthropic API cost 투자
- **(B) KBO 우선 강화** — 현 v1.8 → v2.0 가중치 forward cohort (n=150 wait) + factor 11/12 forward backtest + AdSense 심사 + IA 강화 plan #14 후속 fire

본 1-pager = 사용자 결정 wait. 본 메인 자율 결정 X.

## (A) MLB 풀 인제스트 비용

### Scraper / Data layer
- **MLB 공식 API** (statsapi.mlb.com) — 무료, rate limit 미공개, 일 ~2400 경기 (162 game × 30 팀 / 2 = ~12 일자 평균 ~10 경기), 시즌 28주 (3월 말 ~ 10월 초)
- **FanGraphs MLB** — Statcast / xwOBA / Barrel% / Hard Hit% 등 KBO 모델보다 1 layer 더 깊은 expected metric. 무료 (rate limit 2초 딜레이 기존 패턴 정합)
- **Baseball Savant** — Statcast 원본 (launch angle, exit velocity, sprint speed). robots.txt 허용. CSV download 패턴
- **KBO 현 패턴 정합** = 3 소스 (공식 + Fancy + FanGraphs) → MLB = 3 소스 (statsapi + FanGraphs + Savant) 동일 구조

### DB schema
- `predictions` / `pipeline_runs` / `agent_memories` / `team_season_stats` / `team_recent_form` / `head_to_head` / `stadium_stats` / `umpire_stats` 8 table 모두 `league` column 추가 (default `'kbo'`, MLB row = `'mlb'`)
- 마이그레이션 1건 (cycle 1021 시점 최신 = supabase/migrations/030+) — `ALTER TABLE ADD COLUMN league VARCHAR(10) DEFAULT 'kbo' NOT NULL` × 8
- Row 추정: 162 game × 30 팀 / 2 × 시즌 28주 ≈ 2430 game / season. KBO (~720 / season) 의 ~3.4 배. n=150 forward cohort = 18 일 (KBO ~75 일 → MLB ~22 일). v2.0 가중치 forward 검증 시간 ↓ 가능

### Vercel function timeout
- KBO daily-pipeline 현 평균 ~12 분 (cycle 1014 baseline). MLB 풀 인제스트 시 ~40 분 추정 (10 경기 → ~25 경기 × 3 소스 scrape × 2초 딜레이)
- Vercel Pro plan default timeout 300초 = 5 분. 40 분 = 8 chunk split 필요. **Vercel Queues** (cycle 1021 시점 public beta) 활용 path 박제 가능
- 대안: Cloudflare Workers cron 또는 GitHub Actions cron (현 KBO 패턴 정합 — `submit-lesson.yml` 등 기존 workflow)

### Anthropic API cost
- 현 KBO daily AI 토론 = Claude 4.6 Opus × 5 agent × 720 game / season ≈ 3600 invocation / season
- MLB 풀 인제스트 = 동일 5 agent × 2430 game / season ≈ 12150 invocation / season (3.4×)
- Cost 추정 (Opus 4.7 기준 input $15/MTok output $75/MTok, 평균 토큰 ~4K input + ~2K output / agent invocation):
  - KBO: 3600 × 5 × (4K × $15/M + 2K × $75/M) ≈ $4180 / season
  - MLB 풀: 12150 × 5 × 동일 ≈ $14100 / season
  - **delta ≈ $9920 / season (~$830 / month 추가)**
- 대안: Haiku 4.5 fallback (input $1/MTok output $5/MTok, ~93% 절감) — 비용 ↓ but 토론 quality 검증 별도 backtest 필요

### 사용자 가시 가치
- MLB 시청자 = KBO 시청자 대비 약 50배 (글로벌 1.5B vs 한국 4M). 단 한국 트래픽 비중 가정 시 KBO 우위 (현 사용자 base 한국 추정)
- AdSense CPM = MLB 영문 키워드 (글로벌) > KBO 한글 키워드 (국내). 단 인제스트 시점 = AdSense 심사 통과 + 글로벌 SEO 확보 후
- waitlist demand 측정 (`/mlb` page robots noindex 현재 → SEO 0 = waitlist 박제 거의 0 가능성. cycle 1021 시점 waitlist count 별도 측정 X)

## (B) KBO 우선 강화 비용

### v1.8 → v2.0 가중치
- n=150 forward cohort wait (cycle 989 측정 = n=27, velocity 1.80/day, ETA 2026-08-04 약 68일)
- v2.0-shadow scoring 실주행 cohort 박제 시작 (cycle 1019 C1a ship 완료)
- walk-forward Brier delta + Fancy Stats Elo baseline 비교 (cycle 1019 C1b ship 완료, harness 박제)
- **추가 비용**: ~0 (현 패턴 유지 + cron 자동 fire)

### factor 11/12 forward backtest
- 현 10팩터 (FIP / xFIP / wOBA / 불펜FIP / 폼 / WAR / H2H / 구장 / Elo / SFR)
- 후보 11/12: Statcast-식 xwOBA (한국엔 미수집 — KBO Statcast 없음. 대안 = Pitch-by-pitch 데이터 확보 후 launch angle proxy)
- **추가 비용**: scraper 1~2 layer 추가 + 6주 forward 측정 + DB schema 컬럼 2개

### AdSense 심사
- 도메인 구매 권유 X (CLAUDE.md memory 룰 정합)
- 사용자 영역 — 본 메인 자율 fire X

### IA 강화 plan #14 후속
- plan #14 = 3축 통합 (분석 model C1 + 웹사이트/IA C2 + 디자인/MLB IA prep C3)
- C2 partial 후속 (Step 2 메가메뉴 + Step 3 breadcrumb 잔존) — cycle 1020 partial carry-over
- C3c token polish 잔존 (cycle 1021 grep = metadata/edge runtime hex 만 = skip)
- **추가 비용**: 본 메인 자율 fire 가능 (2~3 cycle)

### 사용자 가시 가치
- v2.0 가중치 = 적중률 측정 evidence (cycle 989 = 48.1% n=27, v1.8 baseline)
- AdSense 심사 통과 시 → 광고 수익 (KBO 트래픽 base monetization)
- IA / 디자인 강화 = SEO + 사용자 path 개선 (직접 가시)

## 비교 표

| 차원 | (A) MLB 풀 인제스트 | (B) KBO 우선 강화 |
|---|---|---|
| 인프라 cost | $830 / month 추가 (API + Vercel chunk) | $0 (현 패턴 유지) |
| 개발 cost | ~3 sprint (scraper / schema / agent 적응) | ~2~3 cycle (본 메인 자율 fire) |
| 사용자 가시 가치 | demand 측정 필요 (현 waitlist N 미측정) | v2.0 accuracy / AdSense 광고 / IA 직접 |
| commitment escalation risk | 높음 (인제스트 시작 후 중단 시 sunk cost) | 낮음 (cycle 단위 fire) |
| 데이터 신선도 evidence | demand 측정 wait | v1.8 cohort 박제 (n=27 → n=150 ETA 2026-08-04) |
| AdSense 심사 path | 사용자 영역 (간접) | 사용자 영역 (간접) |

## 추천 (본 메인 시각, 사용자 결정 wait)

**1순위**: (B) KBO 우선 강화 + (A) demand 측정 layer 단독 (waitlist N >= 100 충족 시 (A) 자연 escalation)

이유:
- 현 `/mlb` hub waitlist N 미측정 = (A) 정량 근거 0
- (A) 인제스트 = sunk cost commitment 큼. demand evidence 0 시 박제 시점 부적절
- (B) = v1.8 → v2.0 cohort 박제 진행 중 (cycle 1019 C1a ship). 자연 momentum 정합

**2순위**: (A) MLB 풀 인제스트 — 사용자가 글로벌 monetization 우선 결정 시. 단 waitlist N 측정 layer 박제 후 결정 권장

**대안 escalation 룰**: `/mlb` waitlist N >= 30 (30일 안) 또는 N >= 100 (전체) 충족 시 본 결정 재검토

## Next action

사용자 결정 wait. 결정 박제 시 본 1-pager `Status: decided` 갱신 + 매핑 plan 박제 (carry-over) / archive.
