# IA Review: 홈 → /analysis 허브 진입 경로 + nav/meta 갱신 (wave-530)

**cycle**: 1899
**date**: 2026-07-20
**trigger**: trigger 9 (마지막 info-arch cycle 1869 → 1899 = 30 사이클 gap) + trigger 7 (explore-idea 5/12 + info-arch 0/12)

## 진단

### 발견된 IA 이슈

**1. 홈 → /analysis 진입 경로 없음** (주요 gap):
- 홈 페이지 직접 href: `/accuracy`, `/predictions`, `/standings`, `/teams/[code]`, `/about` — `/analysis` 없음
- BigMatchDebateCard → `/analysis/game/[id]` (개별 경기) 는 있음
- wave-311 (이번 주 남은 경기) + wave-392~529 (팩터 수렴 픽 시리즈) 로 `/analysis` 가 핵심 허브가 됨
- 사용자가 홈에서 AI 분석 허브 전체를 발견하기 어려운 상태

**2. Header nav description stale**:
- Current: `"에이전트 토론·경기 분석"`
- wave-392~529 팩터 수렴 픽 (완전수렴/강수렴/10팩터 배지) 미반영
- Proposed: `"에이전트 토론·팩터 수렴 픽"`

**3. analysis/page.tsx metadata description stale**:
- Current: `"...팩터별 강약점, 이번 주 전체 경기 신뢰도 정렬..."`
- wave-392~529 이후 팩터 수렴 픽이 핵심 기능화됨
- Proposed: `"...팩터 수렴 픽, 이번 주 남은 경기 배지..."`

### 유지 판단 항목 (변경 없음)
- Footer "AI 예측" 컬럼 6 items — 7 items max 미달, 추가 불필요
- WeeklyTrendMini → /reviews/weekly "전체 보기 →" 이미 구현됨 (carry-over 해소)
- /accuracy/shadow footer 유지 — 모니터링 지속
- Breadcrumb: 주요 라우트 전부 OK

## 변경 사항

### 1. apps/moneyball/src/app/page.tsx — 히어로 섹션 + "AI 분석 전체 →" 링크

히어로 블록(BigMatchDebateCard/TopStatPickCard/fallback)을 `<section>` 으로 래핑 + 헤더 추가:
- `h2 "오늘 빅매치"` + `Link href="/analysis" "AI 분석 전체 →"`
- fallback `<section>` → `<div>` (중첩 section 방지)
- fallback `h1 "오늘의 승부예측"` → `h2` (heading 계층 정합)

### 2. apps/moneyball/src/components/layout/Header.tsx — nav description 갱신

```tsx
{ href: "/analysis", label: "AI 분석", description: "에이전트 토론·팩터 수렴 픽", icon: "activity" }
```

### 3. apps/moneyball/src/app/analysis/page.tsx — metadata description 갱신

```tsx
description: `오늘 KBO 전체 경기 AI 분석 — 빅매치 에이전트 토론 (홈/원정 옹호 + 심판 보정), 팩터 수렴 픽, 이번 주 남은 경기 배지. 매일 ${KBO_PREDICT_DAILY_TIME_KST} 갱신.`
```

OG/twitter description도 동기 갱신.

## 기대 효과

- 홈 → /analysis 허브 직접 진입 가능
- wave-311/392~529 feature series 발견 경로 완성
- nav/meta SEO에 팩터 수렴 픽 키워드 반영

## 다음 cycle 후속 후보

- Footer "AI 예측" 컬럼 — 7 items 도달 시 컬럼 분리 트리거 (현재 6)
- 홈 → /analysis 히어로 섹션 클릭률 모니터링
