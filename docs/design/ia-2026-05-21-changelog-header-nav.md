---
title: /changelog Header NAV 도움말 그룹 박제
cycle: 822
date: 2026-05-21
chain: info-architecture-review (lite)
trigger:
  - 직전 30 cycle info-arch 0회 발화 (장기 미발화 보정 trigger 9, cycle 300 박제)
  - cycle 803 PR #1165 /changelog 신규 라우트 박제 시점 Footer 만 등록, Header NAV 도움말 그룹 silent skip
---

## 진단

### silent IA drift evidence

| 위치 | /changelog 등록 | 등록 cycle |
|---|---|---|
| Footer 도움말 column | ✅ 등록 | cycle 803 PR #1165 |
| Header NAV 도움말 그룹 | ❌ 부재 | — |

cycle 803 PR #1165 `/changelog` 페이지 박제 시 Footer 등록 + sitemap.ts URL 추가 했으나 Header NAV "도움말" 그룹 동기 누락. cycle 687 PR #975 (Header NAV `/glossary` + `/about` 추가, Footer SITEMAP 동기) 패턴 정합 위반.

### Header NAV 도움말 그룹 현재 상태

`apps/moneyball/src/components/layout/Header.tsx:53-60`:
- methodology / guide / glossary / about (4 entry)

### Footer "도움말" column 현재 상태

`apps/moneyball/src/components/layout/Footer.tsx:65` 근방:
- methodology / guide / glossary / **changelog** / about / search (6 entry)

### 사용자 영향

데스크탑 사용자가 헤더 도움말 메뉴 → `/changelog` 진입 path 부재. Footer 진입 필요 → 진입 마찰. v13-B (cycle 803) 가 박제한 in-site 페이지 hub 가치 약화.

## 변경 영역

### Header.tsx 도움말 그룹

`/glossary` 와 `/about` 사이에 `/changelog` entry 추가:

```tsx
{ href: "/changelog", label: "변경 로그", description: "사이클별 모델·기능 갱신 이력", icon: "file-text" },
```

위치 정합:
- Footer 도움말 column 의 `/changelog` 위치 (`/glossary` 다음, `/about` 앞) 매칭
- 다른 NAV 그룹 entry 수 — 리뷰·시즌 5 entry, AI 3 entry, 팀·선수 3 entry. 도움말 4 → 5 entry 자연

### icon 선택

`file-text` — methodology / about 동일 icon 사용. 변경 이력 = 문서 성격 자연 매칭.

### description 박제

"사이클별 모델·기능 갱신 이력" — 다른 도움말 entry description 패턴 (≤20자 한국어 자연 phrase) 정합.

## 검증

- `pnpm --filter @moneyball/apps lint` PASS
- 시각 검증 — 도움말 dropdown 안 5 entry 노출 (mobile MobileNav 자동 반영)

## 다음 cycle 후속 후보

- /reviews 와 /reviews/weekly /reviews/monthly Header 그룹 안 중복 등록 (cycle 686/687 fix 잔존 — 사용자 관점 동일 hub 중복 진입 path 가치 점검)
- Header NAV 그룹 description 통일 — "예측 방법론·10팩터·AI 토론" 패턴 vs "v1.8 모델·10팩터·AI 토론" 패턴 mix
- sitemap.ts staticRoutes 25개 vs 실제 page.tsx 카운트 mismatch 분석 (redirect-only 라우트 제외 후 실제 차이 측정)
