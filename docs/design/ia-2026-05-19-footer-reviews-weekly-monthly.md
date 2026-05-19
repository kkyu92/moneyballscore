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
