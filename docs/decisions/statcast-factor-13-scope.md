# Decision 1-pager: Statcast-식 factor 13+ 후보 도입 scope

**Status**: pending user decision
**Created**: 2026-05-28 (cycle 1021 plan #15 C1f)
**Owner**: 사용자 (kyusikkyu@gmail.com)
**Linked**: `~/.develop-cycle/plans/moneyballscore/15.md` (plan #15 C1f), parent plan #14
**Decision timing**: n=150 도달 (ETA 2026-08-04) 또는 v2.0 production ship 결정 시점 중 먼저

## 결정 요청

현 KBO 모델 v1.8 = 10 factor + shadow 2 factor (park_weather / umpire_sz) = 12 factor 박제. factor 13+ 도입 = Statcast-식 advanced metric (xwOBA / Barrel% / Hard Hit% / Launch Angle 등). 도입 방식 2 옵션:

- **(A) MLB Statcast API 이식** — `statsapi.mlb.com` 형식 차용, 한국 선수 매핑 layer 신규
- **(B) KBO Fancy Stats batted ball 데이터 활용** — LD%/GB%/FB%/IFFB% 등 proxy 사용

본 1-pager = 사용자 결정 wait. 본 메인 자율 결정 X.

## (A) MLB Statcast API 이식 비용

### Data layer
- **MLB Statcast API** (`statsapi.mlb.com`) — xwOBA, Barrel%, Hard Hit%, Launch Angle, Sprint Speed 등 advanced metric 풀세트
- **한국 선수 매핑 X** — KBO 선수 = MLB Statcast 안 매핑 불가능. 본 API 는 MLB 선수 only
- **결정 의미**: Statcast 활용 = MLB 풀 인제스트 결정 (`docs/decisions/mlb-vs-kbo-priority.md`) 의존. MLB 풀 인제스트 결정 X 시 (A) 옵션 fire 불가

### 한국 적용 path
- 한국 선수 데이터에 Statcast 직접 적용 X = 추정 layer 필요 (예: 발사각 model 학습 → KBO 데이터 적용). **모델 학습 + 검증 = 큰 scope**
- 또는 KBO Statcast 도입 wait (현 X, 도입 ETA 불명)

### 추가 cost
- MLB 매핑 시 KBO 선수 1:1 매핑 layer 박제 = 100+ 선수 × 8+ metric = 800+ row 매핑 + 검증
- 한국 적용 추정 모델 학습 = scraper + DB schema + training pipeline = 3+ sprint

### 사용자 가시 가치
- MLB 풀 인제스트 결정 시 자연 활용 (별도 cost X)
- KBO only 운영 시 활용 X (cost 큼)

## (B) KBO Fancy Stats batted ball 데이터 활용 비용

### Data layer
- **KBO Fancy Stats batted ball metric**:
  - **LD% (Line Drive %)** — 라인 드라이브 비율 (높을수록 안타 확률 ↑)
  - **GB% (Ground Ball %)** — 땅볼 비율 (병살 위험)
  - **FB% (Fly Ball %)** — 뜬공 비율 (HR / 외야수 catch 분기)
  - **IFFB% (Infield Fly Ball %)** — 내야 뜬공 비율 (자동 아웃)
  - **HR/FB** — 뜬공 중 홈런 비율 (파워 지표)
  - **Pull%/Cent%/Oppo%** — 타구 방향 분포
- **scrapers/fancy-stats.ts 확장 path** — 현 FIP / xFIP / WAR / wOBA / SFR / Elo 패턴 정합 (이미 scraper 박제)
- **scraper 작업 = 1 sprint** (Fancy Stats batted ball 페이지 cheerio parse + DB schema column 추가)

### 한국 적용 path
- KBO 선수 데이터 직접 활용 = 추정 layer 없음
- factor 13+ 후보 = LD% / Barrel-proxy (LD% × hard contact) / Pull% × HR/FB / IFFB-penalty 등 4개 후보
- **forward backtest 6주 측정** (cycle 1019 C1a 패턴 정합 — shadow cohort 누적 + Brier delta)

### 추가 cost
- scraper 작업 1 sprint
- 4 factor 후보 forward measurement 6주
- DB schema column 4개 (예: home_lineup_ld_pct, away_lineup_ld_pct, ...)

### 사용자 가시 가치
- 모델 정확도 +1~3pp 가능 (Statcast batted ball metric 의 KBO 적용 가설)
- AdSense / SEO 영향 X (백엔드 강화)

## 비교 표

| 차원 | (A) MLB Statcast 이식 | (B) KBO Fancy batted ball 활용 |
|---|---|---|
| 데이터 가용성 | MLB only (한국 선수 매핑 X) | KBO 직접 활용 |
| MLB 결정 의존 | 의존 (`mlb-vs-kbo-priority.md` 결정 wait) | 독립 |
| 작업 cost | 3+ sprint (매핑 + 추정 모델) | 1 sprint (scraper 확장) |
| 측정 cost | 6주 forward + 한국 적용 검증 | 6주 forward 측정 |
| commitment escalation risk | 매우 높음 (MLB 결정 미정 시 sunk cost) | 낮음 (KBO 독립) |
| 모델 정확도 expected delta | 불명 (한국 적용 검증 wait) | +1~3pp 가설 |

## 추천 (본 메인 시각, 사용자 결정 wait)

**1순위**: (B) KBO Fancy Stats batted ball 활용

이유:
- MLB 결정 wait 무관 = 즉시 fire 가능
- 작업 cost 1 sprint = scraper 확장 패턴 정합 (cycle 858 박제)
- 한국 적용 검증 없음 = 데이터 정합성 직접
- forward backtest 6주 = plan #15 C1d/C1e harness 활용

**2순위**: (A) MLB Statcast 이식 — MLB 풀 인제스트 결정 시 자연 escalation

**보류 옵션**: 현 12 factor 유지 + v2.0 가중치 튜닝 only (n=150 도달 후 결정)

## 결정 후 다음 action

**(B) 채택 결정 시**:
1. plan #16 박제 — KBO Fancy batted ball scraper 확장 + DB schema migration + factor 13~16 후보 shadow cohort 박제 시작
2. cycle skill 자율 fire

**(A) 채택 결정 시**:
1. `docs/decisions/mlb-vs-kbo-priority.md` 결정 wait 우선 (MLB 풀 인제스트 결정 의존)

**보류 결정 시**:
1. plan #15 C1d/C1e 만 fire (Fancy Stats Elo parser + walk-forward 대체)
2. n=150 도달 후 v2.0 가중치 결정 시점에 재검토

## Next action

사용자 결정 wait. 결정 시 본 1-pager `Status: decided` 갱신 + 매핑 plan 박제 (carry-over).
