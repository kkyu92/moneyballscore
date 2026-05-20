# cycle 752 explore-idea v10 — chip 패턴 종결 후 신규 redirect source 인벤토리

- **mode**: lite (spec write only, retro-only)
- **carry-over**: cycle 746 v9 "5영역 audit 0건 actionable. chip pattern 한계 cement. 신규 redirect source 권장 (carry-over)" — 5 cycle 미처리
- **chain reason**: explore-idea v10 carry-over 1순위 (cycle 751 next_rec) + review-code cooldown (직전 5/3회 발화)
- **chip 시리즈 종결 박제 (v3~v9)**: 12 chip 컴포넌트 ship + v8/v9 audit 0건 → 동일 패턴 ROI tail off cement

## chip 시리즈 누적 (v3~v9, cycle 679~746)

| Saturation | Ship 결과 | Cohort |
|---|---|---|
| v3 (cycle 679) | YesterdayStatusFilter / ReviewsResultFilter / MissesSortControl / LeaderboardClient tab persist | 4 ship |
| v4 (cycle 698) | GlossaryCategoryFilter / MatchupGamesCloseFilter / WeeklyGamesSortControl / TeamRecentGamesFilter | 4 ship |
| v5 (cycle 711) | PicksStatusFilter / PicksSortControl / WeeklyHistorySortControl / TeamAccuracySortControl | 4 ship |
| v6 (cycle 719) | ThisWeekStatusFilter / MonthlyTeamStatsSortControl | 2 ship |
| v7 (cycle 733) | LeaderboardSortControl / SeasonStandingsSortControl | 2 ship |
| v8 (cycle 738) | 4영역 audit 0건 actionable | 0 ship |
| v9 (cycle 746) | 5영역 audit 0건 actionable | 0 ship |

총 16 chip 컴포넌트 (12 ship + audit 0건 2연속) → chip pattern 한계 cement.

## v10 신규 redirect source 후보 인벤토리 (non-chip)

### 후보 A — Loading skeleton / ISR 갱신 gap UI
- **현황**: `find apps/moneyball/src/app -name loading.tsx` → 0건
- **영향**: ISR revalidate 윈도우 (predictions/picks/leaderboard) 사용자가 blank ↔ stale 사이 본다
- **scope**: `app/predictions/loading.tsx` + `app/picks/loading.tsx` + `app/leaderboard/loading.tsx` 등 3~5 라우트 skeleton 컴포넌트 박제
- **ROI**: 중 — 사용자 가시 (페이지 진입 첫 100ms) 향상. 디자인 시스템 신규 token 필요 X (animate-pulse + brand color)
- **diff**: 신규 컴포넌트 ≤ 3, 신규 디렉토리 X, 기존 컴포넌트 수정 X
- **measurement**: 사용자 자연 발화 + LCP delta (Lighthouse before/after)

### 후보 B — Glossary inline link (predictions 본문 안 term hover def)
- **현황**: PredictionCard / FactorBreakdown 에 FIP / wOBA / Elo / WAR term 존재. /glossary anchor (id=fip 등) 존재. 양쪽 미연결
- **scope**: factorLabels 매핑 확장 — label 옆 `<Link href="/glossary#<slug>" className="text-brand underline-offset-2">i</Link>` 작은 icon 박제
- **ROI**: 중상 — 신규 사용자 onboarding 강화 + glossary 페이지 inbound link 증가 (SEO)
- **diff**: factorLabels.ts 1 파일 확장 + FactorBreakdown 인라인 1 파일 수정 = 2 파일
- **measurement**: /glossary 페이지 referrer 분석 (Vercel Analytics) before/after

### 후보 C — Confidence vs market 박스 (predictions 카드)
- **현황**: tier 분류 (강한 예측 / 보통 / 박빙) 있음. 시장 (KBO Fancy Stats 등) 대비 모델 confidence delta = 없음
- **scope**: PredictionCard 안 `Δ vs 시장: +5%` 작은 chip / 또는 sortControl new dim
- **ROI**: 저~중 — 데이터 source 추가 필요 (Fancy Stats Elo prediction 매핑) → heavy 작업, lite 부적합
- **decision**: v10 후보 제외. v11+ 또는 explore-idea heavy 권장

### 후보 D — Empty state 디자인 패턴 통일 (picks / leaderboard / matchup)
- **현황**: picks/WeeklyHistorySection / matchup/MatchupRecentForm / predictions/[date] 각각 다른 empty copy + 디자인 inconsistency
- **scope**: `<EmptyState icon={...} title={...} description={...} cta={...} />` shared 컴포넌트 박제 + 3~4 곳 wire
- **ROI**: 중 — 디자인 시스템 cohesion + onboarding 강화
- **diff**: 신규 shared 컴포넌트 1 + wire 3~4 파일 = 5 파일 (lite scope 경계, heavy 권장)
- **decision**: lite v10 spec inventory 만, fire heavy 시 분리 cycle

### 후보 E — 인라인 streak badge (predictions / leaderboard 카드)
- **현황**: leaderboard 에 current_streak 컬럼 있음 (cycle 731 wire). picks/UserVsAIScorecard 에 streak 시각화. predictions 카드엔 적중 streak chip 없음
- **scope**: predictions/[date] 페이지 카드 위에 (해당 사용자 적중 streak ≥3 시) `🔥 N연속 적중` 배지 박제 — 게이미피케이션
- **ROI**: 저~중 — 사용자 device_id 기반 streak 조회 추가 query 필요 (성능 영향). 익명 streak = 의미 약함
- **decision**: 사용자 자연 발화 대기, v11 deferred

## v10 fire 우선순위 (lite mode 추천)

| 순위 | 후보 | mode | scope | trigger |
|---|---|---|---|---|
| 1 | A. Loading skeleton | lite | 3~5 loading.tsx 박제 | 사용자 자연 발화 OR 다음 explore-idea fire |
| 2 | B. Glossary inline link | lite | factorLabels + FactorBreakdown 2 파일 | 사용자 자연 발화 OR 다음 explore-idea fire |
| 3 | D. EmptyState 컴포넌트 | heavy | shared/EmptyState + wire 3~4 | explore-idea heavy 권장 |
| - | C. Market delta / E. Streak badge | deferred | 추가 source 또는 query 필요 | v11+ 또는 사용자 발화 |

## 결정 (cycle 752)

- v10 spec inventory 박제만 (lite mode, retro-only)
- 코드 변경 0건
- 다음 explore-idea fire (cycle 753+) 시 후보 A 또는 B 자율 선택
- 후보 D 는 heavy mode 시 분리 cycle 권장

## carry-over

- 다음 explore-idea fire 시 본 spec 의 후보 A/B 자율 선택 fire
- skill-evolution trigger 5 평가 영향: explore-idea 영구 opt-out (cycle 525) 이므로 trigger noise 없음

## PASS_ship 영향

499 → 499 (lite retro-only, ship 0)
