# IA: Footer `리뷰·시즌` 그룹 weekly/monthly hub 진입 path 추가 (cycle 686)

## 발화

cycle 686 `info-architecture-review` (heavy) chain. trigger 9 — 마지막 info-arch fire (cycle 656) 후 30 cycle 경과 (정확히 30-cycle 주기 보정 trigger).

## 진단

cycle 685 `/reviews/misses sort chip` ship (PR #973) 으로 saturation v3 후보 D closure 완료. 후속 자연 발화 — Header (`apps/moneyball/src/components/layout/Header.tsx:43-50`) 와 Footer (`apps/moneyball/src/components/layout/Footer.tsx:30-38`) 의 `/reviews/*` 카테고리 mismatch 발견.

| 컴포넌트 | 그룹 라벨 | 그룹 내용 |
|---|---|---|
| Header NAV_ITEMS | `리뷰·시즌` (dropdown) | 예측 리뷰 / 주간 리뷰 / 월간 리뷰 / 빗나간 예측 / 시즌 기록 |
| Footer SITEMAP_COLUMNS | `리뷰·서비스` (column) | 예측 리뷰 / 빗나간 예측 / 시즌 기록 / 검색 |

Footer 누락 (Header 에 있음):
- `/reviews/weekly` (주간 리뷰)
- `/reviews/monthly` (월간 리뷰)

label mismatch: Header `리뷰·시즌` vs Footer `리뷰·서비스` — mental model 균열.

cycle 685 `/reviews/misses sort chip` ship 후 reviews hub 영역 보강 진행되었으나 weekly/monthly hub 진입 path footer 에서 stale. 사용자 헤더 dropdown 닫혔거나 footer 만 보는 mobile flow 에서 weekly/monthly redirect-only hub 진입 path 부재.

## 결정

Footer `리뷰·서비스` 컬럼 갱신:

1. label `리뷰·서비스` → `리뷰·시즌` (Header 정렬)
2. `/reviews/weekly` (주간 리뷰) 추가
3. `/reviews/monthly` (월간 리뷰) 추가
4. `/search` 항목을 `도움말` 컬럼으로 이동 (utility 성격 더 자연)

### 근거

1. Header 와 mental model 일치 → 사용자 같은 카테고리 인지로 검색 가능
2. weekly/monthly redirect-only hub 라도 footer 진입 path 박제 시 mobile flow 의 SEO + crawl path 강화
3. /search 는 검색 utility → Header 검색 별도 UI + Footer 도움말 그룹 자연 (정보 탐색 보조)
4. 신규 분포:
   - AI 예측: 5
   - 커뮤니티: 2
   - 팀·선수: 4
   - 리뷰·시즌: 5 (예측/주간/월간/미스/시즌)
   - 도움말: 5 (방법론/가이드/용어/소개/검색)
   - Header 정렬 + 컬럼 균형 양호

## 변경

`apps/moneyball/src/components/layout/Footer.tsx`:

**Before**:
```ts
{
  label: "리뷰·서비스",
  links: [
    { href: "/reviews", label: "예측 리뷰" },
    { href: "/reviews/misses", label: "빗나간 예측" },
    { href: "/seasons", label: "시즌 기록" },
    { href: "/search", label: "검색" },
  ],
},
{
  label: "도움말",
  links: [
    { href: "/methodology", label: "예측 방법론" },
    { href: "/guide", label: "사용 가이드" },
    { href: "/glossary", label: "용어 사전" },
    { href: "/about", label: "소개" },
  ],
},
```

**After**:
```ts
{
  label: "리뷰·시즌",
  links: [
    { href: "/reviews", label: "예측 리뷰" },
    { href: "/reviews/weekly", label: "주간 리뷰" },
    { href: "/reviews/monthly", label: "월간 리뷰" },
    { href: "/reviews/misses", label: "빗나간 예측" },
    { href: "/seasons", label: "시즌 기록" },
  ],
},
{
  label: "도움말",
  links: [
    { href: "/methodology", label: "예측 방법론" },
    { href: "/guide", label: "사용 가이드" },
    { href: "/glossary", label: "용어 사전" },
    { href: "/about", label: "소개" },
    { href: "/search", label: "검색" },
  ],
},
```

## 영향 범위

- Footer.tsx 단일 파일. 동일 SITEMAP_COLUMNS array 수정만
- 라우트 / 컴포넌트 추가 X
- 빌드 / type-check / test 영향 0

## 다음 cycle 후속 후보

- 모바일 헤더 햄버거 메뉴 `리뷰·시즌` dropdown 동기 검증 (Header.tsx 와 mobile menu 별도 코드 경로 가능성)
- `/reviews` hub page 안 weekly/monthly hub 카드 진입 path 점검 (cycle 685 후속)
- sitemap.xml `/reviews/weekly` + `/reviews/monthly` priority 점검 (redirect-only 라도 sitemap 등록 가치)

## 후속 처리 박제 (cycle 709, 2026-05-19)

cycle 709 info-architecture-review chain (lite verify mode) 진단 결과 위 3건 모두 처리 확인:

| 후속 | 검증 |
|---|---|
| 모바일 햄버거 dropdown 동기 검증 | `MobileNav.tsx:6` `import { NAV_ITEMS, isNavGroup } from "./Header"` — Header 의 NAV_ITEMS 단일 source 직접 import. 별도 코드 경로 X. mobile/desktop 자동 sync 박제. |
| `/reviews` hub page weekly/monthly 진입 path | `apps/moneyball/src/app/reviews/page.tsx:102,112,132,142` — 최신 주간 hero `/reviews/weekly/${recentWeeks[last].weekId}` + 주간 카드 list + 최신 월간 hero `/reviews/monthly/${recentMonths[last].monthId}` + 월간 카드 list 4 진입 path 박제. |
| sitemap.xml weekly/monthly priority 점검 | `apps/moneyball/src/app/sitemap.ts` — `/reviews/weekly` `/reviews/monthly` hub URLs **의도적 staticRoutes 제외** (주석 "redirect-only 페이지... redirect chain → 중복 URL 인덱싱" 박제). dynamic block `weeklyReviewRoutes` (최근 12주) + `monthlyReviewRoutes` (최근 6개월) 가 실제 컨텐츠 URL 0.7 priority 커버. redirect chain 회피 + crawl 가치 확보 양쪽 자연. |

본 spec close — trigger 8 (carry-over ≥ 20 사이클) 후보 X.
