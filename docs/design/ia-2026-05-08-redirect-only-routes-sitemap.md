# /reviews/weekly /reviews/monthly redirect-only 페이지 sitemap 제외

cycle 273 / 2026-05-08 / chain `info-architecture-review`

## 진단

- ia-2026-05-07 spec 후속 후보 4건 점검
  - (1) `/privacy` `/terms` `/contact` Breadcrumb — 이미 처리됨 (cycle 254/256 후속)
  - (2) 헤더 메가메뉴 — 이미 grouped nav (`팀·선수`, `리뷰·시즌` dropdown). 풀 메가메뉴 도입은 별 사이클 scope
  - (3) 푸터 sitemap 컬럼 — 이미 4 컬럼 + utility leg (privacy/terms/contact 링크) 도입됨
  - (4) sitemap.xml URL 수 vs 실제 page.tsx 수 동기 측정 — **본 cycle 진행**

## sitemap.xml 동기 측정 결과

실제 page.tsx 31개 vs `apps/moneyball/src/app/sitemap.ts`:

| 영역 | 상태 |
|---|---|
| static 23개 (debug 6 제외) | sitemap staticRoutes 18개 + dynamic block 으로 모두 커버 |
| `/analysis/game/[id]` | `analysisRoutes` 가 60일 이내 game URL 동적 등록 |
| `/players/[id]` | `playerRoutes` 가 home_sp_id / away_sp_id 60일 이내 등록 |
| `/predictions/[date]` | `predictionDateRoutes` 가 60일 이내 distinct date 등록 |
| `/matchup/[teamA]/[teamB]` | `matchupRoutes` 45개 canonical pair 모두 등록 |
| `/reviews/weekly/[weekId]` | `weeklyReviewRoutes` 최근 12주 등록 |
| `/reviews/monthly/[monthId]` | `monthlyReviewRoutes` 최근 6개월 등록 |
| `/seasons/[year]` | `seasonYearRoutes` 2023~2026 등록 |
| `/teams/[code]` | `teamProfileRoutes` 10팀 등록 |
| `/debug/*` (6개) | sitemap 의도적 제외 (BASIC auth + robots noindex) — **정상** |

**누락 0건**. dynamic block 모두 정상 작동.

## 발견된 진짜 IA 결함 — redirect-only 페이지가 sitemap staticRoutes 에 포함됨

### 구조 문제

`apps/moneyball/src/app/reviews/(weekly|monthly)/page.tsx` 두 페이지는 **서버 사이드 즉시 redirect**:

```tsx
// reviews/weekly/page.tsx
export default function WeeklyIndexPage() {
  const current = getCurrentWeek();
  redirect(`/reviews/weekly/${current.weekId}`);
}
```

근데 sitemap.ts staticRoutes 에 두 redirect URL 이 모두 등록되어 있음:

```ts
{ url: `${baseUrl}/reviews/weekly`, ..., priority: 0.8 },
{ url: `${baseUrl}/reviews/monthly`, ..., priority: 0.8 },
```

**SEO 영향**:
1. Googlebot 이 `/reviews/weekly` 크롤 → 308 redirect → `/reviews/weekly/{currentWeekId}` → 다시 인덱싱
2. 같은 URL 이 sitemap dynamic block (`weeklyReviewRoutes` 12주) 에도 있음 → **canonical 중복**
3. crawl budget 낭비 + redirect chain 으로 인덱싱 신호 약화 가능

### 수정

`apps/moneyball/src/app/sitemap.ts` staticRoutes 에서 두 줄 제거 + 의도 주석:

```ts
// /reviews/weekly /reviews/monthly = redirect-only 페이지 (즉시 /reviews/(weekly|monthly)/{currentId} 로 308).
// sitemap 에 두면 redirect chain → 중복 URL 인덱싱. dynamic block (weeklyReviewRoutes / monthlyReviewRoutes) 이 실제 컨텐츠 URL 커버.
```

dynamic block 이 이미 실제 컨텐츠 URL (`/reviews/weekly/{weekId}` 12주, `/reviews/monthly/{monthId}` 6개월) 모두 커버. redirect index 페이지는 사용자가 헤더 nav 에서 클릭 시 자연스럽게 redirect 작동, sitemap 노출 불필요.

## 검증

- `pnpm type-check` (apps/moneyball): PASS
- `pnpm test` (apps/moneyball): 241 / 241 PASS (32 files)

## 다음 cycle 후속 후보

- 헤더 메가메뉴 (전체 그리드 hover panel) — 카테고리 hub 강화. 별 cycle scope (UI 디자인 + 인터랙션 spec 필요)
- analysisRoutes / playerRoutes / predictionDateRoutes 60일 윈도우 적정성 측정 (검색 트래픽 데이터 누적 후)

## R5 evidence

본 cycle = info-architecture-review chain trigger 7 (직전 12 사이클 explore-idea ≥ 5회 + info-arch 0회) 자연 발화 → 진단 → 진짜 IA 결함 발견 (redirect-only 페이지 sitemap 중복) → spec + 코드 fix + 검증 → ship sequence 정상 작동. cycle 225 박제 룰의 R5 PASS.

## 박제

- `apps/moneyball/src/app/sitemap.ts` (수정 본)
- `~/.develop-cycle/cycles/273.json` (cycle_state)
- 본 spec 파일
