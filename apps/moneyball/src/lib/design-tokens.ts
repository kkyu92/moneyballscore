// DESIGN.md 색상 토큰의 TS export. recharts 등 string literal 이 필요한 영역에서 import.
// DESIGN.md 갱신 시 본 파일을 단일 source 로 업데이트.

export const brand = {
  900: "#0a1f12",
  800: "#132d1a",
  700: "#1a3d24",
  600: "#245232",
  500: "#2d6b3f",
  400: "#3d8b54",
  300: "#5aad70",
  200: "#8dcea0",
  100: "#c4e8cf",
  50: "#edf7f0",
} as const;

// DESIGN.md "Accent: #c5a23e (골드) — 빅매치 뱃지, 승률 하이라이트, 프리미엄 강조".
// CSS 쪽은 globals.css --color-accent/--color-accent-light 로 이미 존재하나 TS export
// 부재 — satori(OG 이미지)·외부 위젯 설정(JS 객체) 등 var() 미지원 컨텍스트에서 3곳
// (KofiWidget/lotto OG/HallOfFame fallback)이 각자 hex 하드코딩해 분산돼있던 걸 흡수.
export const accent = {
  DEFAULT: "#c5a23e",
  light: "#e2c96b",
} as const;

export const semantic = {
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
} as const;

export const neutral = {
  200: "#e5e7eb",
  400: "#9ca3af",
  500: "#6b7280",
  white: "#ffffff",
} as const;

// DESIGN.md "다크 모드 Surface: #0c0e0d (거의 블랙, 뉴트럴)" / "Card: #151d18 (미세한 그린 틴트)"
export const surface = {
  darkBase: "#0c0e0d",
  darkCard: "#151d18",
  lightBase: "#f8faf9",
} as const;

export const chartCursorTint = "rgba(59, 130, 246, 0.06)";

// next/og 의 satori 렌더러는 CSS 변수 미지원 — OG/icon 이미지에서 인라인 hex 가 필요.
// brand.900 → brand.700 → brand.500 grandient (135deg) 가 22+ OG 라우트에 동일 반복.
// 단일 source 박제 = silent drift family wave 141 차단.
export const BRAND_GRADIENT_KBO_135 = `linear-gradient(135deg, ${brand[900]} 0%, ${brand[700]} 50%, ${brand[500]} 100%)`;

// MLB section OG/twitter gradients — 같은 gradient 가 mlb/* 와 en/mlb/* 영역 mirror + og/twitter pair 로 2~5× 중복 박제.
// silent drift family wave 144 — 8 section gradient registry.
export const MLB_GRADIENT_NAVY_135 = "linear-gradient(135deg, #0a1429 0%, #112a52 50%, #1e3a7a 100%)";
export const MLB_GRADIENT_WILD_CARD_135 = "linear-gradient(135deg, #1a0a29 0%, #4c1d6b 50%, #c026d3 100%)";
export const MLB_GRADIENT_POSTSEASON_135 = "linear-gradient(135deg, #0a0a1e 0%, #1e1b4b 50%, #6d28d9 100%)";
export const MLB_GRADIENT_STANDINGS_135 = "linear-gradient(135deg, #0c2027 0%, #115e59 50%, #0d9488 100%)";
export const MLB_GRADIENT_TEAM_SKY_135 = "linear-gradient(135deg, #082f49 0%, #0c4a6e 50%, #0284c7 100%)";
export const MLB_GRADIENT_PLAYERS_GREEN_135 = "linear-gradient(135deg, #052e16 0%, #14532d 50%, #16a34a 100%)";
export const MLB_GRADIENT_GAMES_INDIGO_135 = "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)";
export const NEUTRAL_GRADIENT_135 = "linear-gradient(135deg, #1a1d24 0%, #2d3140 50%, #4a4f63 100%)";

// MLB matchup/analysis OG/twitter gradients (2026-09) — mlb/matchup + mlb/analysis 와
// en/ mirror 4쌍이 opengraph-image.tsx/twitter-image.tsx 없이 발행돼 SEO 카드가 KBO 원본
// 대비 누락되던 갭 해소. MATCHUP = KBO 자체 /matchup 의 literal purple(#1a0e2e~#3d2a82,
// hue≈256~293)과 hue 겹치지 않는 magenta-violet(hue≈296~321) 채택 — 기존 WILD_CARD(hue≈293)
// 와도 십수도 이상 벌어지도록 100% stop 을 rose 쪽으로 이동. ANALYSIS = 8종 registry +
// MATCHUP 어디에도 없는 amber(hue≈27) 채택 — AI 분석 허브의 "강조/알림" 톤에 부합.
export const MLB_GRADIENT_MATCHUP_135 = "linear-gradient(135deg, #2a0e2e 0%, #5c1a66 50%, #c22e8f 100%)";
export const MLB_GRADIENT_ANALYSIS_135 = "linear-gradient(135deg, #2b1207 0%, #7a3410 50%, #e8720f 100%)";

// KBO 전용 라우트 OG/twitter gradient — 21개 라우트가 design-tokens.ts 밖에서 인라인 hex 로
// 중복/분산돼있던 걸 단일 source 로 흡수 (silent drift family, cycle 2943 design-system 스윕).
// factors(ko/en mirror)는 완전 동일 hex라 토큰 1개 공유.
export const KBO_GRADIENT_ABOUT_135 = "linear-gradient(135deg, #0a1a2e 0%, #163055 50%, #1f4d8c 100%)";
export const KBO_GRADIENT_ANALYSIS_HUB_135 = "linear-gradient(135deg, #2e0e1a 0%, #4d1c2c 50%, #823a4d 100%)";
export const KBO_GRADIENT_CALENDAR_135 = "linear-gradient(135deg, #0c1e3d 0%, #1e3a8a 50%, #0891b2 100%)";
export const KBO_GRADIENT_FACTORS_135 = "linear-gradient(135deg, #1a0f0a 0%, #7c2d12 50%, #ea580c 100%)";
export const KBO_GRADIENT_INSIGHTS_DATE_135 = "linear-gradient(135deg, #1a0a2e 0%, #2d1659 50%, #4f2a9f 100%)";
export const KBO_GRADIENT_LOTTO_ARCHIVE_DATE_135 = "linear-gradient(135deg, #2a1f08 0%, #5a4014 50%, #c5a23e 100%)";
export const KBO_GRADIENT_LOTTO_ARCHIVE_135 = "linear-gradient(135deg, #1a0e2e 0%, #2d1850 50%, #4a2880 100%)";
export const KBO_GRADIENT_LOTTO_135 = "linear-gradient(135deg, #132d1a 0%, #1a3d24 60%, #0a1f12 100%)";
export const KBO_GRADIENT_MATCHUP_DETAIL_135 = "linear-gradient(135deg, #1f0d2b 0%, #4a1f5c 50%, #8b3fa0 100%)";
export const KBO_GRADIENT_MATCHUP_135 = "linear-gradient(135deg, #1a0e2e 0%, #261b4d 50%, #3d2a82 100%)";
export const KBO_GRADIENT_MLB_TEAM_DETAIL_135 = "linear-gradient(135deg, #0d1f2b 0%, #1f3b5c 50%, #3f7ba0 100%)";
export const KBO_GRADIENT_PICKS_135 = "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%)";
export const KBO_GRADIENT_PLAYER_DETAIL_135 = "linear-gradient(135deg, #0d1a2b 0%, #1f3b5c 50%, #2d6b9f 100%)";
export const KBO_GRADIENT_PLAYERS_135 = "linear-gradient(135deg, #062628 0%, #0a4248 50%, #167580 100%)";
export const KBO_GRADIENT_REVIEWS_MISSES_135 = "linear-gradient(135deg, #1a0a0a 0%, #3d1818 50%, #6b2d2d 100%)";
export const KBO_GRADIENT_REVIEWS_MONTHLY_135 = "linear-gradient(135deg, #0a1e2a 0%, #15384f 50%, #2570a0 100%)";
export const KBO_GRADIENT_REVIEWS_135 = "linear-gradient(135deg, #1a0e2e 0%, #2d1856 50%, #5b2a8a 100%)";
export const KBO_GRADIENT_SEARCH_135 = "linear-gradient(135deg, #052e2b 0%, #065f46 50%, #10b981 100%)";
export const KBO_GRADIENT_SEASONS_135 = "linear-gradient(135deg, #1a1407 0%, #3d2e0e 50%, #7a5a1a 100%)";
export const KBO_GRADIENT_STANDINGS_135 = "linear-gradient(135deg, #1a2e0e 0%, #2c4d18 50%, #4d822a 100%)";
export const KBO_GRADIENT_TEAMS_135 = "linear-gradient(135deg, #2a0e07 0%, #4d1e0e 50%, #8a3a14 100%)";
