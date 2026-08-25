# Design System — MoneyBall Score

## Product Context
- **What this is:** KBO 세이버메트릭스 기반 승부예측 블로그. AI 에이전트 토론 + 정량 모델 10팩터 합산.
- **Who it's for:** 한국 야구팬 (20~40대 남성 주력), 데이터 리터러시 있는 사용자.
- **Space/industry:** 스포츠 분석/데이터 (FanGraphs, Baseball Savant, 스탯티즈, KBReport)
- **Project type:** 데이터 대시보드 + 콘텐츠 블로그 하이브리드

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian — 데이터가 주인공. 장식은 의도적으로만.
- **Decoration level:** Intentional — 헤더 그래디언트, 골드 악센트, 빅매치 강조만.
- **Mood:** 프리미엄 스포츠 데이터. 잔디밭 위의 트로피. 깔끔하되 무미건조하지 않음.
- **Reference sites:** Baseball Savant (데이터 시각화), FanGraphs (데이터 밀도), 다음스포츠 (한국 기대치 기준선)
- **Differentiation:** 카테고리 유일의 다크 그린 + 골드 팔레트. 한국 야구 사이트 중 유일한 Pretendard 타이포.

## Typography
- **Display/Hero:** Pretendard Variable 800 — 한글에 최적화, Apple SD 고딕 Neo 급 품질
- **Body:** Pretendard Variable 400 — 한글 본문 가독성 최상
- **UI/Labels:** Pretendard Variable 500~600
- **Data/Tables:** Geist Mono (tabular-nums) — 숫자 정렬, FIP/wOBA 등 지표 가독성
- **Code:** Geist Mono
- **Loading:** Pretendard CDN (jsdelivr), Geist는 next/font/google
- **Scale:**
  - 3xs: 9px — 초미니 배지/타임스탬프 (`text-3xs`, cycle 2599 정식 토큰화)
  - 2xs: 10px — 미니 캡션/보조 라벨 (`text-2xs`, cycle 2599 정식 토큰화. 실사용 최다 빈도)
  - xs: 12px — 캡션, 메타
  - sm: 13px — 카드 라벨
  - base: 15px — 본문
  - lg: 18px — 섹션 제목
  - xl: 20px — 페이지 제목
  - 2xl: 24px — 히어로 서브
  - 3xl: 32px — 히어로 메인
  - 4xl: 36px — 대형 숫자 (적중률 등)
  - (해결, cycle 2600) text-[11px] 46건 → 2xs(10px) 로 흡수. 실사용 46건 전부 캡션/보조 라벨 역할(하위 텍스트, 티어 라벨, 배지) — 2xs 의 "미니 캡션/보조 라벨" 정의와 동일 역할이라 신규 토큰 승격 대신 기존 2xs 로 통합 (10px/11px 1px 차이는 시각적으로 무의미, 신규 토큰 추가는 스케일 파편화만 가중)

## Color
- **Approach:** Restrained — 그린 + 골드 + 뉴트럴. 색은 희소하게, 의미 있을 때만.
- **Primary (Brand):**
  - 900: #0a1f12 — 푸터
  - 800: #132d1a — 헤더, hero 시작
  - 700: #1a3d24 — hero 끝
  - 600: #245232 — 버튼 primary
  - 500: #2d6b3f — 텍스트 악센트, 적중 표시
  - 400: #3d8b54
  - 300: #5aad70 — 보조 텍스트
  - 200: #8dcea0 — 네비 텍스트
  - 100: #c4e8cf
  - 50: #edf7f0
- **Accent:** #c5a23e (골드) — 빅매치 뱃지, 승률 하이라이트, 프리미엄 강조
- **Accent Light:** #e2c96b
- **Away:** #c5872a (오렌지) — 원정팀 색상, 다크 그린과 대비
- **Factor Neutral:** #9ca3af (light, Tailwind gray-400) / #4b5563 (dark, gray-600) — factor 편향 없음 (비슷) 표시. CSS 토큰 `--color-factor-neutral`
- **Semantic:** success #10b981, warning #f59e0b, error #ef4444, info #3b82f6
- **Light mode:**
  - Surface: #f8faf9 (그린 틴트 배경)
  - Card: #ffffff
- **Dark mode (Hybrid C):**
  - Surface: #0c0e0d (거의 블랙, 뉴트럴)
  - Card: #151d18 (미세한 그린 틴트)
  - Border: #1e2b23 (`--color-border`, 다크모드 전용 토큰 — 라이트모드는 Tailwind `border-gray-200` literal 사용, 다크모드만 `dark:border-[var(--color-border)]` 로 그린 틴트)
  - 헤더/푸터: brand-800/900 유지 (그린 아이덴티티)
  - 전략: 배경은 뉴트럴로 빼서 헤더·카드와의 경계를 확보하되, 카드에 그린 틴트를 남겨 브랜드 느낌 유지

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)
- **Card padding:** 20px (p-5)
- **Card gap:** 16px (gap-4)
- **Section gap:** 32px (space-y-8)

## Layout
- **Approach:** Grid-disciplined — 카드 그리드 반복 패턴
- **Grid:**
  - Mobile: 1 column
  - Tablet (md): 2 columns
  - Desktop (lg): 3 columns
- **Max content width:** 1200px (max-w-6xl)
- **Border radius:**
  - sm: 4px — 뱃지, 인라인 태그
  - md: 8px — 버튼, 인풋
  - lg: 12px — 카드 (rounded-xl)
  - xl: 16px — 히어로 섹션 (rounded-2xl)
  - full: 9999px — 팀 로고, 뱃지 (rounded-full)

## Motion
- **Approach:** Minimal-functional
- **Easing tokens** (`globals.css` `@theme inline`):
  - `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` — enter, reveal
  - `--ease-in: cubic-bezier(0.7, 0, 0.84, 0)` — exit
  - `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)` — move, sort, reorder
- **Duration tokens**:
  - `--motion-fast: 150ms` — page transition fade, nav hover
  - `--motion-medium: 200ms` — predict reveal count-up, dropdown open
  - `--motion-slow: 300ms` — theme transition (bg/color)
- **Animations**:
  - LIVE 펄스: `animate-pulse` on red dot (실시간 경기)
  - 카드 hover: `transition-shadow` (hover:shadow-md)
  - 테마 전환: `transition: background var(--motion-slow), color var(--motion-slow)`
  - 스코어 변경: 없음 (SWR 리렌더 시 즉시 반영, 의도적)
  - **PredictReveal count-up**: 0 → win prob, `var(--motion-medium)` `var(--ease-out)`, requestAnimationFrame 기반
- **Reduced motion 가드**: `@media (prefers-reduced-motion: reduce)` → `--motion-*: 0ms` + 전역 `animation/transition-duration: 0.01ms !important`. PredictReveal 은 `matchMedia` 체크 후 즉시 target 표시.

## Contrast (WCAG)
다크/라이트 모드 모두 WCAG AA (4.5:1 normal text / 3:1 large text) 이상 보증. 신규 컴포넌트는 본 표의 검증된 토큰 조합만 사용:

| Context | Foreground | Background | Ratio | Level |
|---|---|---|---|---|
| Light body | `--color-brand-700` `#1a3d24` | `--color-surface` `#f8faf9` | 9.3:1 | AAA |
| Light secondary | `--color-brand-500` `#2d6b3f` | `--color-surface-card` `#ffffff` | 5.6:1 | AA |
| Light muted | `--color-brand-400` `#3d8b54` | `--color-surface-card` `#ffffff` | 3.7:1 | AA (large) |
| Dark body | `--color-brand-100` `#c4e8cf` | `--color-surface` `#0c0e0d` | 12.8:1 | AAA |
| Dark secondary | `--color-brand-200` `#8dcea0` | `--color-surface-card` `#151d18` | 8.1:1 | AAA |
| Header nav active | `#ffffff` | `--color-brand-800` `#132d1a` | 14.2:1 | AAA |
| Header nav muted | `--color-brand-200` `#8dcea0` | `--color-brand-800` `#132d1a` | 6.4:1 | AA |
| LeagueSelector pill inactive | `--color-brand-200` `#8dcea0` | brand-700/40 over brand-800 | 6.1:1 | AA |

(ratios 측정 = WebAIM Contrast Checker, 본 표는 핵심 조합만 — 전체 axe-core 스캔은 `/qa` skill 로 별도 실행.)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-16 | 다크 그린 + 골드 팔레트 유지 | 카테고리 유일의 컬러 아이덴티티. 야구장 잔디 + 트로피 메타포. |
| 2026-04-16 | Pretendard 전환 권장 | 한글 렌더링 최적화. 현재 Geist Sans는 한글 폴백 의존. |
| 2026-04-16 | 다크모드 Hybrid C 채택 | surface 뉴트럴(#0c0e0d) + card 그린틴트(#151d18). 전부 그린이면 레이어 경계 불명확(사용자 피드백). |
| 2026-04-16 | Geist Mono for data | tabular-nums로 FIP, wOBA 등 숫자 정렬. 이미 프로젝트에 포함. |
| 2026-04-16 | Motion minimal-functional | 스포츠 데이터 사이트. 화려한 애니메이션보다 즉각적 데이터 갱신이 중요. |
| 2026-05-05 | 차트 gradient + OG 이미지 brand token 정렬 | ChartTooltip `brandBarGradient` (`#60a5fa`/`#2563eb` blue) → brand-400/700 그린. `barShadow` floodColor (`#1e3a8a`) → brand-900. `successBarGradient` dead code 삭제. `predictions/[date]/opengraph-image.tsx` 그라디언트 (`#052e16`/`#0a6b3a`/`#16a34a`) → brand-900/700/500. `brandAreaGradient` `#3b82f6` = semantic info 일치 유지. ShareButtons 의 `#1DA1F2`/`#1877F2` = 소셜 플랫폼 공식 컬러 유지 (의도). cycle 50 polish-ui. |
| 2026-05-05 | Tooltip "적중" 색상 brand-500 정렬 | DailyAccuracyChart passed (`#2563eb` blue-600) + ConfidenceBucketChart (`#2563eb`) → brand-500 (`#2d6b3f`). DESIGN.md "적중 표시 = brand-500" 명시 매핑. cycle 50 polish-ui 누락분 (ChartTooltip 만 정렬, 상위 컴포넌트 누락). AccuracyChart 의 `#3b82f6` = semantic info 의도 유지. cycle 65 polish-ui. |
| 2026-05-15 | picks/leaderboard "오답/실패" 색상 = red-600/400 (text) / red-100·red-900/30 (badge) 박제 | brand-600/400 (적중/성공) 의 반대 의미 semantic. `MyPicksClient.tsx` (text 2곳 + badge 2곳), `WeeklyHistorySection.tsx`, `LeaderboardTable.tsx` (음수 delta) 이미 동일 패턴 통일 사용 중. Decisions Log 박제 누락분만 보강. validation 에러 (`LeaderboardJoinModal.tsx:56 text-red-400`) 는 별 utility semantic (inline 입력 검증) — 의도 유지. cycle 454 brand-* 토스트 통일 (silent drift write 1) → cycle 456 red-* token 박제 (write 8) family 확장. cycle 456 polish-ui (lite). |
| 2026-05-20 | standings top3 row + dashboard ModelTuningInsights 양수 강조 색상 = brand-* 정렬 | standings/page.tsx:133 `bg-green-50/40 dark:bg-green-900/10` (top 3 row 강조) → `bg-brand-*` / ModelTuningInsights.tsx:72,128 `text-emerald-600 dark:text-emerald-400` (correlation 양수 + deltaPp 양수) → `text-brand-*`. tailwind 디폴트 green/emerald = brand 그린 (#2d6b3f) 과 분리된 별 hue silent drift. DESIGN.md "적중/성공 = brand-*" 박제 (cycle 50/65/456) family 확장. cycle 744 polish-ui (lite, gap=7). |
| 2026-05-28 | Motion 토큰 + Reduced-motion 가드 + Contrast 표 박제 (W-D, 2-day blast) | 기존 "Motion: Minimal-functional / micro(50-100ms)" 단편 → `--motion-fast/medium/slow` + `--ease-out/in/in-out` 토큰화. `globals.css @theme inline` 정렬 + `prefers-reduced-motion: reduce` 시 `:root --motion-*: 0ms` 강제. PredictReveal 신규 (win prob 카운트업, `var(--motion-medium)`, `matchMedia` 가드). Contrast 표 신규 — 라이트/다크 8 조합 WebAIM 측정 (8건 모두 AA+). 신규 컴포넌트는 본 표 토큰만 사용. 컴포넌트 라이브러리 1-pager `docs/design/components.md` 신규 (Header / LeagueSelector / FactorBreakdown / PredictReveal). |
| 2026-05-28 | MLB IA spec-only 박제 + 결정 1-pager (plan #14 C3) | `## Future / MLB IA` section append (시안 spec only, 페이지 박제 X). `Status: pending decision` 명시 + `docs/decisions/mlb-vs-kbo-priority.md` 참조 강제 — 시안 spec 이 결정된 system 으로 오인되지 않도록 분리. sub-route 시안 (`/mlb/games/[date]` / `/mlb/team/[code]` / `/mlb/factors`) = MLB 풀 인제스트 결정 후 활성화 path 박제. 현 `/mlb` hub = waitlist + sample analysis 만 유지 (commitment escalation 차단, CEO High #3). cycle 1021 design-system. |
| 2026-07-18 | 팩터 수렴 배지 3-tier 컬러 시스템 박제 (wave-452~456, cycle 1818 design-system) | `isComplete`(10/10) = amber tier (골드 아이덴티티 자연 연장 — 완전수렴 프리미엄 강조). `isWeightStrong`(가중치 강수렴) = brand tier. 기본 수렴 = gray tier. 배지(border+bg+text) + 팩터 칩(bg+text+hover) + 합치 칩(brand-100/900/40) + 상대팀 우세 팩터 칩(gray-100/800/60) 4종 토큰 패턴 정립. amber tier = Tailwind amber 직접 사용 (CSS 변수 `--color-accent` #c5a23e 와 별개 — amber 그라데이션 scale 활용 이유). 전체 spec = `docs/design/convergence-badge-system.md`. |
| 2026-07-22 | 주간/월간 리뷰 하이라이트 배지 "박빙 적중" purple 3rd-tier 박제 (silent drift family, cycle 1977 polish-ui) | `/reviews/weekly`, `/reviews/monthly` `HighlightCard` 배지 3종: "고확신 적중"(brand-500) / "빗나감·대역전 실패"(red-500, else 분기) / **"박빙 적중"(purple-500) — 유일한 non-brand/non-red 색상**. 도입 커밋(`81f3b83c` 주간, `6db0459c` 월간) 이후 Decisions Log 미기재 상태로 방치 (silent drift). purple = 승패 이분법(성공/실패) 밖의 제3 상태(승부처 박빙) 를 나타내는 의도된 구분색 — wave-452~456 amber tier 와 동일하게 "이분법 밖 추가 tier = 별도 hue 허용" 패턴. 색상 변경 없이 문서화만 보강. 부수적으로 `HighlightCard` 중복 정의(주간/월간 페이지에 동일 함수 2곳) 를 `components/reviews/HighlightCard.tsx` 로 통합 (`showResultSuffix` prop 으로 주간 전용 "· 적중/빗나감" 접미사 분기). |
| 2026-08-25 | `mlb/analysis`(KBO+en) + `DailyPredictionSummaryBar` 적중 표시 green→brand-500 정렬 | "적중 표시 = brand-500" (cycle 50/65/456/744 family) 5번째 재발. `app/mlb/analysis/page.tsx`/`en/mlb/analysis/page.tsx` 어제 결과 리스트 + `DailyPredictionSummaryBar.tsx` 최고 자신감 픽 마크·적중률 배지가 Tailwind 기본 `green-*` 잔존 — brand-600/700 정렬. lotto ball `green`(공식 45번대 볼 색상) + `AgentVoteCard` emerald(홈/원정/심판 5-역할 categorical, 박빙-적중 purple 과 동일 "이분법 밖 허용" 패턴)는 의도 유지 확인 후 범위 제외. `/debug/*` 내부 전용 페이지도 범위 제외(CLAUDE.md 사용자 비가시 예외). cycle 2563 polish-ui (2-chain lock fallback). |
| 2026-08-25 | "오늘의 탑픽"(`isTopPick`) 배지 3-way drift 정정 → accent gold(`var(--color-accent)`) 통일 | DESIGN.md "Accent — 빅매치 뱃지, **승률 하이라이트**, 프리미엄 강조" 문구가 정확히 지칭하는 배지인데도 실제로는 3갈래로 흩어져 있었음: `app/analysis/page.tsx`(wave-377, KBO 원본) = `amber-300/500` / `mlb/analysis`+`mlb/games/[date]`+`en` 미러 4곳(wave-624, plan28 포팅) = `brand-500/400`. 같은 파일 안 바로 위 `isBig`("⭐ 빅매치") 배지는 이미 `var(--color-accent)` 정렬돼 있어 대조군 역할 — 두 배지가 인접 조건분기인데 색 체계가 서로 다른 채 방치. amber 는 factor 수렴 10/10 tier(2026-07-18 결정, 별개 의미)와 우연히 같은 hue 라 혼동 소지도 있었음. 5개 파일(`analysis/page.tsx` + mlb/en mlb 4미러) 전부 `border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20~30`(+텍스트 라벨) 정렬. `wave-624-mlb-games-top-pick.test.ts` 옛 클래스 assertion 갱신 + `silent-drift-cycle-2581.test.ts` 신규(5파일×2 assertion). cycle 2581 polish-ui (2-chain lock fallback). |

## MLB IA (implemented — cycle 2162 정정)

> **stale doc 정정**: 본 section 은 원래(cycle 1021) "spec only, 활성화 전 lock-in" 으로 박제됐고 `docs/decisions/mlb-vs-kbo-priority.md` 는 여전히 "(B) KBO 우선 강화 채택 / MLB sub-route 박제 금지" 로 남아있음. 하지만 실제로는 cycle ~1450+ 부터 explore-idea(heavy) 다수 fire (plan #24/#25 등) 로 MLB sub-route 전부가 이미 구현·배포됨 — lock 이 문서 갱신 없이 silent 하게 superseded. 아래 표는 2026-08-18(cycle 2162) 실측 기준으로 정정.

### sub-route 현황 (실측, `apps/moneyball/src/app/mlb/` + `en/mlb/` 미러 동일 구조)
| Route | KBO 정합 source | Status |
|---|---|---|
| `/mlb` (hub) | `/` (KBO hub) | 구현됨 |
| `/mlb/games/[date]`, `/mlb/games/[date]/[slug]` | `/predictions/[date]`, `.../[slug]` | 구현됨 — 일자별 예측 list + 경기 상세 |
| `/mlb/team/[code]` | `/team/[code]` | 구현됨 — 팀 시즌 프로필 (타구 프로파일/Elo/Barrel% 포함) |
| `/mlb/matchup/[teamA]/[teamB]` | `/matchup/[teamA]/[teamB]` | 구현됨 (plan #24) |
| `/mlb/factors` | `/factors` | 구현됨 |
| `/mlb/standings` | `/standings` | 구현됨 (AL/NL division) |
| `/mlb/accuracy`, `/mlb/players`, `/mlb/calendar` | 대응 KBO 라우트 | 구현됨 |
| `/mlb/wild-card`, `/mlb/postseason` | KBO 에 대응 없음 (MLB 고유) | 구현됨 |

### IA 정합 룰 — 실측 결과 (원래 "활성화 시 강제" 항목들, 이미 충족)
- `LEAGUE_NAVS.mlb` = `MLB_NAV` (Header.tsx) — 오늘 / 경기·팀(6 sub-link) / 포스트시즌(2 sub-link) 3-group 구조. "단일 link" 문서 서술은 stale.
- megamenu "베타" 배지 — 현 Header.tsx 에 존재하지 않음 (이미 제거됨, 전환 시점 불명 — silent).
- 미구현 잔여: Elo 추이 차트 등 일부 팩터 wiring (plan #24 Phase 2b, `mlb-pipeline.ts` MLB Elo rating 시스템 자체 미구현 — cycle 2057 확인, 별도 scope).

### 참고
- 결정 문서(`docs/decisions/mlb-vs-kbo-priority.md`) 의 "(A) MLB 풀 인제스트 = 보류" / "MLB sub-route 박제 금지" 조항은 본 section 과 함께 정정 필요 — 별도 커밋에서 처리.
- CEO High #3 (commitment escalation 차단) 취지 자체는 무효화 X — 단, 실제로는 이미 escalate 된 상태이므로 문서만 현실 정합.
