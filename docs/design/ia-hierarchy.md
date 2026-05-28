# IA Hierarchy 룰 (plan #14 C2 Step 0)

> **Status**: source of truth for megamenu / breadcrumb / footer 결정. 신규 라우트 추가 시 본 doc 매핑 강제.
> **Author**: plan #14 Phase 2 (cycle 1020 info-architecture-review)
> **Domain**: apps/moneyball — moneyballscore.vercel.app (KBO + Lotto + MLB beta)

## 3 IA 요소의 책임 분리

각 IA 요소가 어떤 사용자 의사결정을 cover 하는지 명시. 중복 X, 누락 X.

| 요소 | 책임 | 사용자 의사결정 | 권장 위치 | 라우트 깊이 |
|---|---|---|---|---|
| **Megamenu** (Header NavLinks) | discover | "뭐가 있는지" 둘러보기 | 헤더 (모든 라우트) | top-level + 1 |
| **Breadcrumb** (shared/Breadcrumb) | locate | "내가 어디 있는지" 위치 자각 + 상위 복귀 | 본문 상단 (depth ≥ 1) | 현재 path + 부모 |
| **Footer** sitemap (layout/Footer) | exhaust | "전체 라우트 list" 검색 fallback | footer (모든 라우트) | top-level + 1 (full list) |

**핵심 룰**: 한 IA 요소가 다른 요소 책임을 침범 X. 메가메뉴가 breadcrumb 역할 X (location 표시 X), footer 가 megamenu 역할 X (discover 우선순위 X). 누락 시 다른 요소가 cover.

## 룰 1 — Megamenu (discover)

**책임**: 사용자가 사이트에 처음 진입 시 "어떤 기능 / 데이터 / 페이지가 있나" 둘러봄. 핵심 navigation primary surface.

**spec**:
- top-level pill 6개 이내 (현 KBO_NAV 7개 / Lotto 1개 / MLB 1개 — League selector 로 분리)
- 각 pill 의 dropdown = 2-7 sub-link
- description 한 줄 (현 NavLink.description 박제)
- icon 1개 (현 nav-icon)
- mobile = MobileNav (Sheet 패턴)

**현 구현** (apps/moneyball/src/components/layout/Header.tsx):
- KBO_NAV: 오늘 / AI (3) / 커뮤니티 (2) / 순위 / 예측 기록 / 팀·선수 (3) / 리뷰·시즌 (5) / 도움말 (7)
- MLB_NAV: MLB 베타
- LOTTO_NAV: 로또 (2)

**누락 / 회피**:
- 도움말 7 sub-link = 1개 초과 (cycle 1020 carry-over: 5개 이내 split — 사용 가이드 / 용어 사전 = "사용법" 그룹, AI 인사이트 / 예측 방법론 = "AI 작동 원리" 그룹)
- v2-preview = top-level 표시 X (도움말 안 종속) — surface signal 약함, 추후 v2 정식 release 시 top-level promotion

## 룰 2 — Breadcrumb (locate)

**책임**: 사용자가 깊은 페이지 진입 후 "내가 어디 있는지" + "상위 페이지로 복귀" path 제공. depth ≥ 1 모든 라우트 의무.

**spec**:
- shared/Breadcrumb.tsx 단일 컴포넌트 사용
- `<Breadcrumb items={[{href, label}, ...]} />` API
- "홈" 자동 prepend
- 마지막 항목 href 없음 + `aria-current="page"`
- JSON-LD BreadcrumbList 자동 박제 (SEO + Rich Snippet)
- max depth 4 (5+ 시 truncation "..." 검토 — 현 구현 X, 5+ 라우트 부재 시 검토 X)

**현 사용 라우트** (`grep -rln Breadcrumb apps/moneyball/src/app` 기준):
- /accuracy/* / /analysis/* / /changelog / /contact / /dashboard / /glossary / /guide / /insights/* / /leaderboard / /lotto/* / /matchup / /matchup/* / /methodology / /mlb / /picks / /players / /players/* / /predictions / /predictions/* / /privacy / /reviews / /reviews/* / /search / /seasons / /seasons/* / /standings / /teams / /teams/* / /terms / /v2-preview / /about

**의도된 누락**:
- `/` (홈) = depth 0, breadcrumb 불필요
- `/debug/*` 8 라우트 = 내부 운영용, 사용자 visit X
- `/reviews/weekly` + `/reviews/monthly` = redirect-only (각 `/reviews/weekly/[week]` + `/reviews/monthly/[month]` 으로 redirect). 본 redirect page 자체엔 render X = breadcrumb 박제 X 정상

**자가 검증 (cycle 1020)**: 누락 라우트 = 0건. plan #14 C2 Step 3 ("누락 라우트 추가") = 0건 = baseline OK.

## 룰 3 — Footer sitemap (exhaust)

**책임**: 사용자가 megamenu / breadcrumb 로 못 찾았을 때 fallback 검색. 전체 라우트 list 제공 — SEO crawler 도 활용.

**spec**:
- 6 컬럼 (현 구현: AI 예측 / 커뮤니티 / 팀·선수 / 리뷰·시즌 / 도움말 / 로또)
- 각 컬럼 = 2-8 link
- responsive: 모바일 2 컬럼 / 데스크탑 5 컬럼 grid
- 별도 nav (`<nav aria-label="사이트맵">`) — megamenu (`<nav aria-label="...">` Header) 와 책임 분리
- 하단 `<nav aria-label="법적 고지">` = privacy / terms / contact 분리 (sitemap 컬럼과 분리)

**현 구현** (apps/moneyball/src/components/layout/Footer.tsx) — column 6개:
1. AI 예측 (5 link)
2. 커뮤니티 (2 link)
3. 팀·선수 (4 link)
4. 리뷰·시즌 (5 link)
5. 도움말 (8 link)
6. 로또 (2 link)

**누락 / 회피**:
- /search 도움말 컬럼 안 (검색 = 도움말 fallback) — spec 정합
- /accuracy/shadow = 누락 (noindex 내부 cohort, SEO surface signal 차단 의도) — robots.txt noindex 정합
- /v2-preview = 도움말 컬럼 (top-level X) — 임시 page, v2 release 시 promotion

**Footer prop spec** (자율 type 명시 박제 cycle 1020):
```ts
type FooterLink = { href: string; label: string };
type FooterColumn = { label: string; links: FooterLink[] };
const SITEMAP_COLUMNS: FooterColumn[] = [...]; // 6 컬럼
```

본 type signature = inline const 안 박제. 외부 export X (내부 consumer 1개 = Footer.tsx 자체) — over-engineering 차단.

## Carry-over (plan #14 C2 Phase 2 잔여)

본 cycle 1020 = Step 0 + Step 0.5 only. 잔여 step = 다음 cycle / 다음 plan carry-over:

| Step | 잔여 작업 | 잔여 이유 | 권장 cycle |
|---|---|---|---|
| Step 0.5 | shadcn `<NavigationMenu>` / `<Breadcrumb>` 도입 + brand token override 표 | shadcn install (CLI ipx) + brand token grep (DESIGN.md) = M-L 비용. 본 cycle scope 초과 | next info-architecture-review cycle |
| Step 1 | Footer wireframe ASCII + responsive collapse (accordion) | 현 구현 = grid 6 컬럼, mobile 2 컬럼 (accordion X). accordion 도입 = `'use client'` 컴포넌트 분리 (현 Server Component, JS bundle 영향) | polish-ui cycle |
| Step 2 | SiteHeader/Nav megamenu = shadcn NavigationMenu 도입 | Header 현 NavLinks custom dropdown 박제. shadcn rewrite = 큰 작업 + 상태 매트릭스 12 case interaction test 의무. 본 cycle scope 초과 | next info-architecture-review cycle (별도 plan 분리 권장) |
| Step 3 | breadcrumb 누락 라우트 추가 | 누락 0건 = ship-target X (자가 검증 cycle 1020 PASS) | skip (해소됨) |
| Step 4 | unit + interaction test (Footer / SiteHeader / Breadcrumb) | Step 1/2 carry-over 와 동반 | Step 1/2 동행 |

본 carry-over = plan #14 frontmatter status 갱신 (cycle 1020 retro 박제). MLB IA prep (C3) = plan #14 Phase 3 별도 cycle.

## 신규 라우트 추가 시 IA check 룰

신규 page.tsx 박제 직전 본 doc 매핑 강제:

1. **megamenu 추가?** — top-level discover surface 필요 = KBO_NAV 안 적절한 그룹 추가
2. **breadcrumb 의무?** — depth ≥ 1 라우트 = `<Breadcrumb items={...} />` 박제 의무. 의도된 누락 (redirect-only / debug) 시 본 doc "의도된 누락" section 갱신
3. **footer 추가?** — 전체 라우트 fallback 검색 = SITEMAP_COLUMNS 안 적절한 컬럼 추가. 의도된 누락 (noindex / 임시) 시 본 doc "누락 / 회피" section 갱신

본 룰 = 본 메인 자율 영역 fire (cycle 진행 단계 3 안 신규 라우트 박제 시 자가 적용).
