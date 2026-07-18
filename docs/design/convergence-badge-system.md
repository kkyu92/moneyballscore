# 팩터 수렴 배지 시스템 (wave-452~467, 2026-07-18)

게임 상세 페이지의 팩터 수렴 픽 배지 + 팩터 칩 3-tier 컬러 시스템.

## 배경

10팩터 수렴 강도(|netScore|)에 따라 3단계 tier 로 배지/칩 색상 분기.
DESIGN.md 기존 골드(#c5a23e) 아이덴티티 = amber tier (완전수렴 프리미엄 강조) 로 자연 연결.

## Tier 정의

| Tier | 조건 | 의미 | 배지 배경 (light) | 배지 배경 (dark) | 텍스트 (light) | 텍스트 (dark) |
|------|------|------|-------------------|------------------|----------------|----------------|
| **complete** | `convStrength >= FACTOR_PICK_COMPLETE` (10/10) | 완전수렴 — 10팩터 만장일치 | `bg-amber-50` | `dark:bg-amber-900/20` | `text-amber-700` | `dark:text-amber-300` |
| **strong** | `favoredWeightPct >= CONVERGENCE_BADGE_WEIGHT_STRONG_PCT` | 가중치 강수렴 | `bg-brand-50` | `dark:bg-brand-900/20` | `text-brand-700` | `dark:text-brand-300` |
| **default** | 기타 수렴 | 일반 수렴 | `bg-gray-50` | `dark:bg-gray-800/50` | `text-gray-600` | `dark:text-gray-400` |

## 팩터 칩 토큰

배지 tier와 연동. 칩 = 우세 팩터 slug → 단축 레이블, 용어집 링크.

| Tier | bg (light) | bg (dark) | text (light) | text (dark) | hover |
|------|------------|-----------|--------------|-------------|-------|
| complete | `bg-amber-100` | `dark:bg-amber-800/40` | `text-amber-700` | `dark:text-amber-300` | `hover:bg-amber-200 dark:hover:bg-amber-700/50` |
| strong | `bg-brand-100` | `dark:bg-brand-800/40` | `text-brand-700` | `dark:text-brand-300` | `hover:bg-brand-200 dark:hover:bg-brand-700/50` |
| default | `bg-gray-100` | `dark:bg-gray-700/40` | `text-gray-600` | `dark:text-gray-400` | `hover:bg-gray-200 dark:hover:bg-gray-600/40` |

## 특수 칩

| 칩 종류 | 조건 | bg (light) | bg (dark) | text |
|---------|------|------------|-----------|------|
| **합치 칩** | 모델 예측 방향 = 팩터 수렴 방향 | `bg-brand-100` | `dark:bg-brand-900/40` | `text-brand-700 dark:text-brand-300` |
| **상대팀 우세 팩터 칩** | 비수렴 상대팀 팩터 (complete tier 시 미표시) | `bg-gray-100` | `dark:bg-gray-800/60` | `text-gray-500 dark:text-gray-400` |

## 배지 border

| Tier | border (light) | border (dark) |
|------|----------------|----------------|
| complete | `border-amber-200` | `dark:border-amber-700/50` |
| strong | `border-amber-200` 아님 → `border-brand-200` | `dark:border-brand-800/50` |
| default | `border-gray-200` | `dark:border-gray-700/50` |

## amber tier와 기존 골드 아이덴티티

DESIGN.md Accent `#c5a23e` (골드) = "빅매치 뱃지, 승률 하이라이트, 프리미엄 강조".
amber tier = 완전수렴(10/10) = 최상위 신뢰도 신호 = 골드 아이덴티티 자연 연장.

amber 토큰 vs 커스텀 골드:
- `#c5a23e` ≈ Tailwind amber-600~700 사이 (amber-500=#f59e0b, amber-700=#b45309)
- CSS 변수 `--color-accent` 미사용 — Tailwind amber 직접. 의도된 결정 (amber 그라데이션 활용).
- 향후 신규 컴포넌트에서 완전수렴/프리미엄 강조 = amber tier 사용 권장.

## 구현 위치

- `apps/moneyball/src/app/analysis/game/[id]/page.tsx` (wave-452/454/456/461/463 — 배지+칩 3-tier + 성적라인 + 레이블칩)
- `apps/moneyball/src/app/analysis/page.tsx` (wave-459/461/465/467 — 목록 수렴 픽 칩 3-tier + 레이블칩 + 섹션 border/bg tier)
- `apps/moneyball/src/app/predictions/page.tsx` (탑픽 amber 강조)

## wave-467 — 섹션 border/bg tier (2026-07-18, cycle 1828)

`sectionHasComplete = factorPickGames.some(g => |g.compositeDuelScore| >= FACTOR_PICK_COMPLETE)` 시 섹션 container amber 업그레이드.

| sectionHasComplete | border | bg | 제목 텍스트 | 이번 주 성적 텍스트 |
|---|---|---|---|---|
| true | `border-amber-200 dark:border-amber-700/50` | `bg-amber-50 dark:bg-amber-900/20` | `text-amber-700 dark:text-amber-300` | `text-amber-700 dark:text-amber-300` |
| false | `border-brand-200 dark:border-brand-800/50` | `bg-brand-50 dark:bg-brand-900/20` | `text-brand-600 dark:text-brand-400` | `text-brand-600 dark:text-brand-400` |

game/[id] 페이지의 `badgeClass` amber (isComplete) 패턴을 분석 목록 섹션 container 차원으로 확장.

## 다음 cycle 후속 후보

- 수렴 배지 컴포넌트 분리 (inline JSX → `ConvergenceBadge.tsx`) — DRY (analysis/game + analysis 2 위치)
- amber tier bg/text token → CSS 변수화 (`--color-convergence-complete-bg` 등) — DESIGN.md token 정합
- Reduced-motion 가드: 칩 hover transition 누락 확인
