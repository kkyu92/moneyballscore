# IA spec — 카테고리 hub 인덱스 page Breadcrumb 추가

**날짜**: 2026-05-07
**cycle**: 203 (`info-architecture-review` chain 첫 진입)
**chain**: info-architecture-review (cycle 202 박제 신규 추가 chain — 첫 발화)

## 진단 evidence

cycle 203 진단 단계 measurement:

| trigger | 측정 결과 |
|---|---|
| (1) 라우트 신규 추가 ≥3 / 7일 | mtime -7d 16개 (실제 신규 추가 X, 본 cycle 작업 mtime 갱신 영향) |
| (2) breadcrumb 누락 page.tsx | **30 중 20 (66%)** ← 강력 매핑 |
| (3) 사용자 발화 | cycle 202 직전 "디자인 + 사이트 구조 개선" |
| (4) meta-pattern body | cycle 202 retro = "info-architecture-review 자연 진입 예상" |
| (5) sitemap.xml 동기 | 미측정 (다음 cycle) |
| (6) 카테고리 hub 진입 path | 헤더 메가메뉴 / 푸터 sitemap 컬럼 부재 (다음 cycle 다룸) |

## scope

본 cycle 변경 = 카테고리 hub 인덱스 9 page 에 Breadcrumb component 추가:

| page | items |
|---|---|
| `/teams` | `[{label: '팀 프로필'}]` |
| `/players` | `[{label: '선수 리더보드'}]` |
| `/predictions` | `[{label: '예측 기록'}]` |
| `/reviews` | `[{label: '예측 결과 리뷰'}]` |
| `/analysis` | `[{label: 'AI 분석'}]` |
| `/matchup` | `[{label: '팀 간 매치업'}]` |
| `/dashboard` | `[{label: '대시보드'}]` |
| `/about` | `[{label: '소개'}]` |
| `/reviews/misses` | `[{href: '/reviews', label: '예측 결과 리뷰'}, {label: '크게 빗나간 예측'}]` |

## 제외

| page | 이유 |
|---|---|
| `/page.tsx` (home) | Breadcrumb 자체가 home 표시 |
| `/privacy` `/terms` `/contact` | utility leaf, 사용자 navigation hierarchy 의미 약함 (단 다음 cycle 추가 후보) |
| `/debug/*` (5개) | BASIC auth, 사용자 가시 X |
| `/reviews/monthly/page.tsx` `/reviews/weekly/page.tsx` | redirect-only (Breadcrumb 의미 X) |
| 동적 라우트 (`/teams/[code]` 등) | 이미 Breadcrumb 통합됨 (CLAUDE.md 박제) |

## 효과

- **사용자 navigation hierarchy 인지** — 카테고리 hub 진입 시 위치 명확
- **JSON-LD `BreadcrumbList`** — 검색엔진 사이트 구조 파악 (SEO 보강)
- **WAI-ARIA `aria-label="breadcrumb"`** — 접근성 (이미 component 박제)
- **이미 누락 20 page 중 9 page 처리** = breadcrumb 누락 비율 66% → 36% 완화 (다음 cycle 잔여 11 page 처리 가능)

## 다음 cycle 후속 후보

- `/privacy` `/terms` `/contact` Breadcrumb 추가 (utility leaf, 잔여 11 중 3)
- 헤더 메가메뉴 도입 — 카테고리 hub 직접 진입 path
- 푸터 sitemap 컬럼 추가 — fallback navigation
- sitemap.xml URL 수 vs 실제 page.tsx 수 동기 측정

## R5 evidence

본 cycle = info-architecture-review chain 첫 진입 = cycle 202 신규 chain 추가의 R5 진짜 PASS (isolated smoke 단독 X — 실측 PR ship + R7 머지). 신규 chain 발화 → 자연 trigger 매핑 → spec + 구현 + ship sequence 정상 작동.

## 박제

- `docs/design/ia-2026-05-07-category-hub-breadcrumb.md` (본 spec)
- `~/.develop-cycle/cycles/203.json` (cycle_state)
- PR `develop-cycle/info-architecture-review-203` (R7 자동 머지)
