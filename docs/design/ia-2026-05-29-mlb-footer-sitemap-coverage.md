# IA — MLB Footer / Sitemap Coverage Gap Fix

**날짜**: 2026-05-29
**Cycle**: 1033
**Chain**: info-architecture-review (heavy)
**Trigger**:
- routes added 7d ≥3 (36 page.tsx mtime < 7d, MLB hub series cycle 1026~1029 추가)
- 2-chain lock 탐지 (직전 8 cycle distinct=2: explore-idea×7 + review-code×1) → IA 점검 누락 자연 차단 신호

## Gap evidence

### 1. Footer SITEMAP_COLUMNS — MLB column 부재

`apps/moneyball/src/components/layout/Footer.tsx` 의 6 column = (AI 예측 / 커뮤니티 / 팀·선수 / 리뷰·시즌 / 도움말 / 로또). **MLB column 0개**.

Plan B Tier C+D (cycle 1026~1029) 가 박제한 5+ MLB hub 페이지:
- `/mlb` (오늘)
- `/mlb/team` + `/mlb/team/[code]`
- `/mlb/standings`
- `/mlb/players`
- `/mlb/wild-card`
- `/mlb/postseason`

Header NAV (`MLB_NAV`) 에는 들어있지만 Footer "exhaust" layer (IA hierarchy 룰 — `docs/design/ia-hierarchy.md`) 에 entry 가 0개 → 사용자 경로 1개 (MLB 리그 셀렉터 → MegaMenu) 만 존재. IA hierarchy 룰 위반.

### 2. sitemap.ts — `/mlb/wild-card` + `/mlb/postseason` static entry 부재

`apps/moneyball/src/app/sitemap.ts` staticRoutes 안 MLB 엔트리:
- ✅ `/mlb`
- ✅ `/mlb/team`
- ✅ `/mlb/standings`
- ✅ `/mlb/players`
- ❌ `/mlb/wild-card` (cycle 1029 ship, sitemap 미동기)
- ❌ `/mlb/postseason` (cycle 1029 ship, sitemap 미동기)

Google Search Console 에 두 페이지 crawl signal 부재 → 인덱싱 지연. 사례 7 (sitemap dynamic 강제 silent drift) family 와 다른 silent drift = "sitemap static array vs 실제 page.tsx mismatch".

### 3. Header NAV `/mlb/factors` — 페이지 부재 dead link

`apps/moneyball/src/components/layout/Header.tsx` 의 `MLB_NAV` line 89:
```ts
{ href: "/mlb/factors", label: "14팩터", description: "KBO 10 + Statcast 4", icon: "bar-chart" },
```

실제 `apps/moneyball/src/app/mlb/factors/` 디렉토리 부재 → 사용자 클릭 시 Next.js 404. 사례 11 family (silent drop) 와 다른 silent drift = "header NAV link vs page.tsx mismatch".

## Fix scope

### Step 1 — Footer.tsx

`SITEMAP_COLUMNS` 안 신규 "MLB" column 추가. 위치 = "로또" 직전 (KBO 메이저 column 들 다음 + 부가 카테고리). links 5개:

```ts
{
  label: "MLB",
  links: [
    { href: "/mlb", label: "오늘 경기" },
    { href: "/mlb/standings", label: "AL/NL 순위" },
    { href: "/mlb/team", label: "팀 프로필" },
    { href: "/mlb/players", label: "Statcast 선수" },
    { href: "/mlb/wild-card", label: "Wild Card race" },
    { href: "/mlb/postseason", label: "Postseason 브래킷" },
  ],
},
```

### Step 2 — sitemap.ts

`staticRoutes` 배열에 2 entry 추가 (`/mlb/players` 직후):

```ts
{ url: `${baseUrl}/mlb/wild-card`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
{ url: `${baseUrl}/mlb/postseason`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
```

### Step 3 — Header.tsx

`MLB_NAV` 의 "모델" group 안 `/mlb/factors` link 제거. 페이지 박제 전 노출 차단. "모델" group 안 다른 link 없으면 group 자체 제거.

## Out of scope

- `/mlb/factors` 페이지 신규 박제 = 별도 cycle carry-over (현 cycle = dead link 제거만)
- MobileNav MLB column 추가 = 현 MegaMenu 가 자동 흡수 (LEAGUE_NAVS 기반)
- robots.ts MLB 차단 X (이미 indexable)

## Self-verification

```yaml
rubric: "(가치 / 시간 비용 / risk / 자율 가능 / 의존성) 5축"
baseline_footer: "Footer MLB column 0개 → 사용자 경로 1개 (LeagueSelector + MegaMenu)"
baseline_sitemap: "sitemap MLB static 4개 / Header NAV MLB link 7개 / page.tsx 5개 → mismatch 2건"
rubric_evaluation: |
  가치: medium (사용자 가시 IA "exhaust" 레이어 + SEO crawl coverage 동기)
  시간 비용: small (3 file Edit + smoke test, 1 cycle 안 수렴)
  risk: 0 (additive change, dead link 제거만 break X)
  자율 가능: yes (본 메인 직접 fire, 사용자 결정 wait X)
  의존성: none (다른 plan / cycle 의존 X)
```

## 다음 cycle 후속 후보

- `/mlb/factors` 페이지 박제 (cycle 1029 Plan B Tier C+D 잔여 + Header NAV link 복원)
- Footer MLB column link 확장 (`/mlb/games/[date]` archive entry, `/mlb/team/[code]` 진입)
- Footer "리뷰·시즌" column 안 MLB 리뷰 cross-link 검토
