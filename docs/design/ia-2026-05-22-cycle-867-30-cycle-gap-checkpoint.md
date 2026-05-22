---
title: cycle 867 info-architecture-review — 30-cycle gap 정기 점검 (lite, retro-only)
cycle: 867
date: 2026-05-22
chain: info-architecture-review (lite)
trigger:
  - info-architecture-review trigger 9 (마지막 발화 cycle 837 → 867 = 정확 30-cycle gap, 자체 trigger fire 보장 cycle 300 박제)
  - cycle 866 next_rec 3택 (review-code sweep 44 / lotto OOS / info-arch) 중 trigger 9 명시 우선 박제
outcome: retro-only — silent IA drift 0건
---

## 진단 요약

cycle 837 (last info-arch fire) → cycle 867 = 정확 30-cycle gap. trigger 9 fire. lite scope 6-source 측정.

### 직전 30 cycle (838-867) 신규 라우트 / IA 영향 변경 inventory

| cycle | PR | 신규 라우트 / IA 영향 | Header NAV | Footer SITEMAP | sitemap.ts |
|---|---|---|---|---|---|
| 838 | #1195 | `/api/version` API endpoint (deploy-drift-alert 인프라) | N/A (API) | N/A | N/A (API 라우트) |
| 844 | #1200 | `/insights` hub | cycle 854 PR #1211 ✅ | cycle 844 ✅ | cycle 844 ✅ priority 0.75 daily |
| 845 | #1201 | `/insights/opengraph-image.tsx` | N/A | N/A | N/A (File Convention) |
| 847 | #1203 | `/insights/[date]` daily archive | N/A (dynamic) | N/A (dynamic) | cycle 847 ✅ priority 0.7 weekly (90일 prebuild) |
| 852 | #1209 | `/insights/twitter-image.tsx` | N/A | N/A | N/A (File Convention) |
| 853 | #1210 | `/methodology` page 4-col footer | N/A | hub footer cross-link 추가 | N/A |
| 854 | #1211 | Header NAV `/insights` 추가 | ✅ | N/A | N/A |
| 855 | #1212 | `/feed` RSS `/insights/<date>` 10건 | N/A | N/A | N/A (RSS) |

### Header NAV 도움말 그룹 현재 상태

`apps/moneyball/src/components/layout/Header.tsx:53-60`:
- methodology / guide / glossary / **insights** / **changelog** / about (6 entry)

### Footer "도움말" column 현재 상태

`apps/moneyball/src/components/layout/Footer.tsx:41-50`:
- methodology / guide / glossary / **insights** / **changelog** / about / search / lotto/methodology (8 entry)

### Header/Footer 도움말 mismatch 분석

| 항목 | Header | Footer | 평가 |
|---|---|---|---|
| /search | ❌ | ✅ | Header 모바일 icon (line 79-90) + desktop SearchForm (NavLinks) 존재. intentional |
| /lotto/methodology | ❌ | ✅ "Lotto 통계" | cycle 832 PR #1190 명시 — gambling-adjacent context 차단, KBO 사용자 cohort 노출 최소 |
| methodology/guide/glossary/insights/changelog/about | ✅ 6/6 | ✅ 6/6 | 동기 ✅ |

### sitemap.ts staticRoutes vs page.tsx 카운트

- sitemap static URL = 25
- 실제 static page.tsx = 28
- 차이 3 = 모두 intentional:
  - `/mlb` — `robots: { index: false, follow: false }` (cycle 828 PR #1186 plan #1 박제, AdSense KBO 심사 우선 isolation)
  - `/reviews/weekly` — redirect-only (current weekId 리다이렉트)
  - `/reviews/monthly` — redirect-only (current monthId 리다이렉트)

### Breadcrumb 누락 분석

`grep -L Breadcrumb` 결과 8 라우트 — 모두 intentional 또는 N/A:
- `/` — 홈 페이지 자체, Breadcrumb root 부모 없음
- `/debug/*` (5 라우트) — BASIC auth 보호 내부 dashboard, public navigation 외
- `/reviews/monthly`, `/reviews/weekly` — redirect-only

### 카테고리 hub 진입 path 분석

| hub | Header | Footer | sitemap | 진입 path 평가 |
|---|---|---|---|---|
| /analysis | ✅ AI group | ✅ AI 예측 | ✅ priority 0.9 | 완비 |
| /accuracy | ✅ AI group | ✅ AI 예측 | ✅ priority 0.85 | 완비 |
| /dashboard | ✅ AI group | ✅ AI 예측 | ✅ priority 0.8 | 완비 |
| /predictions | ✅ standalone | ✅ AI 예측 | ✅ priority 0.9 | 완비 |
| /standings | ✅ standalone | ✅ 팀·선수 | ✅ priority 0.85 | 완비 |
| /picks | ✅ 커뮤니티 | ✅ 커뮤니티 | ✅ priority 0.7 | 완비 |
| /leaderboard | ✅ 커뮤니티 | ✅ 커뮤니티 | ✅ priority 0.7 | 완비 |
| /teams /players /matchup | ✅ 팀·선수 | ✅ 팀·선수 | ✅ priority 0.7 | 완비 |
| /reviews/* /seasons | ✅ 리뷰·시즌 (5 entry) | ✅ 리뷰·시즌 (5 entry) | ✅ priority 0.7-0.8 | 완비 |
| /insights | ✅ 도움말 | ✅ 도움말 | ✅ priority 0.75 | 완비 (cycle 844-856 plan #3) |
| /changelog | ✅ 도움말 | ✅ 도움말 | ✅ priority 0.6 | 완비 (cycle 803-822) |
| /lotto/methodology | ❌ (intentional) | ✅ 도움말 "Lotto 통계" | ✅ priority 0.5 | 완비 (cycle 832 plan #2) |
| /mlb | ❌ (noindex) | ❌ (noindex) | ❌ (noindex) | 완비 (intentional isolation) |

## 결론

**silent IA drift 0건**. 직전 30 cycle (838-867) 신규 라우트 8건 모두 Header/Footer/sitemap.ts 자연 동기. cycle 822 spec 후속 후보 3건 모두 design intentional 또는 non-actionable.

### cycle 822 spec carry-over candidate 재평가

| # | candidate | 결론 |
|---|---|---|
| 1 | /reviews 와 /reviews/weekly /reviews/monthly Header 그룹 중복 | design intentional — /reviews=hub, /reviews/weekly/monthly=current period shortcut. 사용자 동선 2종 동시 제공 가치 |
| 2 | Header NAV 그룹 description 통일 | 이미 일관 — middle-dot separator 12/20 + simple phrase 8/20, 모두 ≤25자 한국어 자연 phrase |
| 3 | sitemap.ts 25 vs page.tsx 28 mismatch | intentional 3 exclusion (/mlb noindex + 2 redirect-only) |

### 다음 30-cycle (868-897) 자연 발화 신호

- 신규 라우트 추가 ≥3 / 1주 (trigger 1)
- Breadcrumb 누락 신규 라우트 (trigger 2)
- 사용자 IA 발화 ("구조" / "navigation" / "메뉴" — trigger 3)
- 사이트 구조 변경 (헤더/푸터 동기 누락 새 발견 — trigger 5)
- 카테고리 hub 추가 누락 (trigger 6)
- 직전 12 cycle explore-idea ≥5 + info-arch 0회 (trigger 7)
- ia-*.md 후속 후보 ≥20 cycle 미처리 (trigger 8)
- 30-cycle gap 자체 trigger (trigger 9) → cycle 897 자연 fire 예상

## 다음 cycle 후속 후보

- (재제출) /reviews/weekly /reviews/monthly redirect-only 라우트 sitemap 직접 등록 검토 (현재 current period redirect → /reviews/weekly/[week] 처리, 자체 URL canonical 가치)
- /api/version + /api/seo/indexnow/ping API endpoint sitemap 누락 정합 (API 라우트 sitemap 일반적 X, intentional?)
- Header NAV "AI" group vs Footer "AI 예측" column entry count mismatch — Header 3 entry (analysis/accuracy/dashboard) vs Footer 5 entry (+/, +/predictions). 사용자 mental model 동기 가치 점검
