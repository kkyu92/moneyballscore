# IA checkpoint — cycle 991 (30-cycle gap trigger 9)

## 메타

- cycle: 991
- date: 2026-05-28
- chain: info-architecture-review (lite, 30-cycle gap checkpoint)
- trigger: 9 (마지막 info-arch 발화 cycle 961 → 991 gap=30 임계 도달)
- mode: lite retro-only (단일 surgical fix 후보 0건)
- prior checkpoint: cycle 961 (`ia-2026-05-26-cycle-961-30-cycle-gap-checkpoint.md`)

## 진단 범위

cycle 962~990 (29 cycle) IA layer 자연 변동 측정. 라우트 / breadcrumb / sitemap / Header / Footer / robots.

## 측정 결과

### 라우트 구조

| 항목 | cycle 961 | cycle 991 | delta |
|---|---|---|---|
| 총 page.tsx | 40 | 48 | +8 (debug 라우트 신규 = `/debug/deploy-drift`, `/debug/silent-drift`, `/debug/agent-fallback`, `/debug/pipeline` 4건 + `/v2-preview` + `/insights/[date]` + `/reviews/weekly/[week]`/`monthly/[month]` 별개 layer) |
| sitemap.ts URL entries | 35 | 36 | +1 (점진적 dynamic generator 자연) |
| sitemap.ts staticRoutes vs page.tsx | 정합 | 정합 | 0 silent drift |

debug 라우트 신규 4건 모두 BASIC auth gated + sitemap 제외 + robots Disallow = AdSense surface 보호 정책 유지.

### Breadcrumb coverage

```
$ grep -L "Breadcrumb" apps/moneyball/src/app/**/page.tsx
```

11건 (cycle 961=10건 → +1):
- `apps/moneyball/src/app/page.tsx` (루트 home, Breadcrumb 의도 부재 — 정당)
- `apps/moneyball/src/app/debug/*.tsx` 8건 (BASIC auth gated dev tools — 정당)
- `apps/moneyball/src/app/reviews/{monthly,weekly}/page.tsx` 2건 (`redirect()` pure — 정당)

사용자 가시 라우트 Breadcrumb coverage = **100%** (11건 모두 의도된 동작).

### Header NAV / Footer SITEMAP

- Header description fields: 22 (cycle 961 측정 갱신)
- Footer SITEMAP href entries: 26
- Header `도움말` group catalog: `methodology → guide → glossary → insights → v2-preview → changelog → about` (cycle 961 박제 동일, 7 entry 정합)
- Footer SITEMAP_COLUMNS 5 column 정합 유지

### Robots / sitemap 정합

- 노출 차단 라우트: `/debug` (8건 모두) + `/api` + `/search` + `/lotto` + `/lotto/archive` + `/v2-preview` (noindex)
- sitemap.ts 미등록 + robots.ts Disallow 정합 ✓
- `/lotto` 4 layer Disallow (Googlebot + Mediapartners-Google + AdsBot-Google + default user-agent) AdSense 심사 정책 유지

### Header NAV model version 정합

```
/methodology description: "v1.8 모델·10팩터·AI 토론"
/v2-preview description: "v2.0 가중치 backtest 미리보기"
```

= v1.8 (현재 prod 모델) + v2.0 (미리보기) 양립 노출. cycle 961 carry-over 항목 "Header NAV description mix 통일" 재평가:
- v1.8 cohort n=27 (cycle 989 측정, 5/28 첫 측정 window) / v2.0 threshold n=150 ETA ~07-05 (~38일 후, velocity 1.8/day)
- v2.0 도입까지 v1.8 노출 = stale 아닌 정체성 신호. /v2-preview 가 transition surface 흡수
- → 정합 유지, 정책 신호 carry-over

## Carry-over 3건 재평가

| # | 항목 | cycle 961 → 991 | 결정 |
|---|---|---|---|
| 1 | 헤더 메가메뉴 본격 전환 (전체 그리드 hover panel) | 변화 X | carry-over 유지 — 별 cycle scope (UI 디자인 + 인터랙션 spec 필요) |
| 2 | /reviews 중복 등록 mental model 결정 | 변화 X | carry-over 유지 — 사용자 자율 결정 영역 |
| 3 | Header NAV description mix 통일 (`/methodology` "v1.8") | /v2-preview "v2.0" 양립 surface 박제됨 | **정합 신호 명확 — 정책 carry-over 유지** (v2.0 도입 시 점진 정정 자연) |

## 자가 검증 rubric (cycle 887 plan #8 패턴 정합)

```yaml
self_verification:
  rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
  baseline_silent_drift_count: 0
  baseline_breadcrumb_coverage: 100%
  baseline_header_footer_sync: 100%
  baseline_route_count: 48
  baseline_sitemap_url_count: 36
  baseline_header_description_count: 22
  carry_over_unresolved_count: 3
  carry_over_categories:
    - 헤더 메가메뉴 본격 전환 (별 cycle scope)
    - /reviews 중복 등록 mental model 결정 (사용자 자율)
    - Header NAV description mix 통일 (사용자 자율, /v2-preview 양립 surface 정합)
  scope: lite retro-only (단일 surgical fix 후보 0건)
```

| 축 | 평가 |
|---|---|
| 가치 | low (silent drift 0건, surgical fix 후보 0건) |
| 시간 비용 | small (lite checkpoint retro-only) |
| risk | 0 (검증만, 코드 변경 X) |
| 자율 가능 | yes (본 메인 자율 영역 완료) |
| 의존성 | none |

= **Tier 1** (small + light, 즉시 fire, 본 plan scope 외 retro-only baseline 박제).

## 다음 cycle 후속 후보

- **자연 trigger** 자연 발화 시점:
  - 라우트 신규 추가 ≥3 / 7일
  - breadcrumb 누락 grep
  - 사용자 navigation 발화
  - 카테고리 hub 진입 path 약함 (Header / Footer mismatch)
  - 신규 routing depth ≥3 / 1 cycle
  - explore-idea ≥5회 + info-arch 0회 / 12 cycle
  - docs/design/ia-*.md 미처리 ≥ 20 cycle (3 carry-over 미해소 위 list)
  - 라우트 IA 자연 변동 detection
- **trigger 9 주기 보정** (≥30 cycle gap) 다음 자연 시점 = 약 cycle 1021

## R5 evidence

- cycle 961 → cycle 991 30-cycle 자연 흡수 evidence — review-code (sweep 69~78 10 consecutive ALL CLEAN) + fix-incident (사례 9 family 13~27번째 재발 + alert channel 13~27번째 evidence + 사례 14 family 1차 후속) + explore-idea (plan #1/#6 carry-over status fix + plan #10 5/5 ship) + op-analysis (v1.8 cohort 5/28 첫 측정 window) 다층 dominance 안에서도 IA layer silent drift 0건 유지
- silent drift family detection channel (review-code lite) 가 IA layer 영향 0 = 운영 코드 silent drift family 와 IA drift family 독립 layer 재확인 (cycle 961 패턴 정합)
- 30-cycle gap checkpoint pattern 5번째 박제 (cycle 788 / 867 / 900 / 961 / 991) — trigger 9 lite 자체 trigger 정상 fire 메커니즘 안정

## 박제

- `docs/design/ia-2026-05-28-cycle-991-30-cycle-gap-checkpoint.md` (본 spec)
- `~/.develop-cycle/cycles/991.json` (cycle_state)
- commit `policy: cycle 991 retro — info-architecture-review (lite, 30-cycle gap checkpoint)`
