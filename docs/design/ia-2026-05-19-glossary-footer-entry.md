# IA: Footer 에 `/glossary` 추가 (cycle 644)

## 발화

cycle 644 `info-architecture-review` (lite) chain. trigger 9 — 마지막 info-arch fire (cycle 614) 후 30 cycle 경과 (30-cycle 주기 보정 trigger).

## 진단

`/glossary` (15 세이버메트릭스 지표 + JSON-LD DefinedTermSet + SEO metadata + anchor deep link 지원) 가 navigation 진입점 부재.

| 참조 위치 | 진입 가능? |
|---|---|
| `sitemap.xml` | SEO 만 (사용자 가시 X) |
| `apps/moneyball/src/app/about/page.tsx:181` | about 페이지 본문 인라인 링크 |
| `apps/moneyball/src/components/predictions/PredictionCard.tsx:246,261,276,288` | 카드 안 `/glossary#fip` `/glossary#woba` deep link |
| `apps/moneyball/src/components/matchup/MatchupFactorCompare.tsx:132` | matchup 비교 카드 anchor link |
| `Header.tsx NAV_ITEMS` | ❌ 없음 |
| `Footer.tsx SITEMAP_COLUMNS` | ❌ 없음 |

사용자 journey:
- 직접 URL 입력 외 진입 path = (1) about 페이지 본문 → /glossary 또는 (2) PredictionCard 안 지표 anchor click
- 두 path 모두 contextual deep link. stand-alone destination 진입점 부재
- /glossary 자체는 카테고리 hub 가치 있음 (15 지표 grouped + 빠른 이동 nav + 출처 명시)

## 결정

Footer `리뷰·서비스` 컬럼에 `용어 사전` 항목 추가. Header 추가 X (lite scope, 5-group dropdown 이미 dense).

### 근거

1. **Footer = sitemap surface** (`<nav aria-label="사이트맵">`) — stand-alone content page 전체 카탈로그 역할. 14 항목 중 1 추가 (`/glossary` 자체 stand-alone destination 자격 명확)
2. **`리뷰·서비스` 그룹 자연** — 기존 항목 (`/reviews` `/reviews/misses` `/seasons` `/search` `/about` `/contact`) 중 reference 류 (`/about` `/search`) 와 함께 그룹화 자연. `/glossary` = reference 도구
3. **Header dropdown 추가 X** — 5-group nav 이미 dense (AI / 커뮤니티 / 순위 / 예측기록 / 팀·선수 / 리뷰·시즌). 추가 시 인지 부담. cycle 643 retro 의 "lite scope" 원칙
4. **위치 = `/about` 뒤 `/contact` 앞** — meta-navigational 그룹 (소개 / 용어 / 문의) 자연 흐름

## 변경

`apps/moneyball/src/components/layout/Footer.tsx` `SITEMAP_COLUMNS[3].links` 배열:

**Before**:
```ts
links: [
  { href: "/reviews", label: "예측 리뷰" },
  { href: "/reviews/misses", label: "빗나간 예측" },
  { href: "/seasons", label: "시즌 기록" },
  { href: "/search", label: "검색" },
  { href: "/about", label: "소개" },
  { href: "/contact", label: "문의" },
]
```

**After**:
```ts
links: [
  { href: "/reviews", label: "예측 리뷰" },
  { href: "/reviews/misses", label: "빗나간 예측" },
  { href: "/seasons", label: "시즌 기록" },
  { href: "/search", label: "검색" },
  { href: "/about", label: "소개" },
  { href: "/glossary", label: "용어 사전" },
  { href: "/contact", label: "문의" },
]
```

## 검증

- `pnpm type-check`: PASS 기대
- `pnpm test`: PASS 기대 (Footer rendering test 없음 — fixture only)
- 수동: `/` 풋터 `리뷰·서비스` 컬럼에 "용어 사전" 표시 + 클릭 시 `/glossary` 이동
- `/glossary` 페이지 기존 Breadcrumb 그대로 유지

## 다음 cycle 후속 후보

- (선택) Header 리뷰·시즌 dropdown 에 `/glossary` 추가 — Footer-only 진입이 부족할 시. 단 현 cycle 644 lite scope = Footer 1 line 만
- (선택) `/picks` `/leaderboard` 사용자 진입 path 검토 — Footer `커뮤니티` 그룹만 있음. Header dropdown 이미 있음 (mental model 정렬 OK)
