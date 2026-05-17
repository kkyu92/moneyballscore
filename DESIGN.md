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
  - xs: 12px — 캡션, 메타
  - sm: 13px — 카드 라벨
  - base: 15px — 본문
  - lg: 18px — 섹션 제목
  - xl: 20px — 페이지 제목
  - 2xl: 24px — 히어로 서브
  - 3xl: 32px — 히어로 메인
  - 4xl: 36px — 대형 숫자 (적중률 등)

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
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms)
- **Animations:**
  - LIVE 펄스: `animate-pulse` on red dot (실시간 경기)
  - 카드 hover: `transition-shadow` (hover:shadow-md)
  - 테마 전환: `transition: background 0.3s, color 0.3s`
  - 스코어 변경: 없음 (SWR 리렌더 시 즉시 반영, 의도적)

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
