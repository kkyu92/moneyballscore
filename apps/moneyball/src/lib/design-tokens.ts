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
// silent drift family wave 144 (cycle 1371) — 9 section gradient registry.
export const MLB_GRADIENT_NAVY_135 = "linear-gradient(135deg, #0a1429 0%, #112a52 50%, #1e3a7a 100%)";
export const MLB_GRADIENT_WILD_CARD_135 = "linear-gradient(135deg, #1a0a29 0%, #4c1d6b 50%, #c026d3 100%)";
export const MLB_GRADIENT_POSTSEASON_135 = "linear-gradient(135deg, #0a0a1e 0%, #1e1b4b 50%, #6d28d9 100%)";
export const MLB_GRADIENT_STANDINGS_135 = "linear-gradient(135deg, #0c2027 0%, #115e59 50%, #0d9488 100%)";
export const MLB_GRADIENT_TEAM_SKY_135 = "linear-gradient(135deg, #082f49 0%, #0c4a6e 50%, #0284c7 100%)";
export const MLB_GRADIENT_PLAYERS_VIOLET_135 = "linear-gradient(135deg, #1a0a2e 0%, #581c87 50%, #a855f7 100%)";
export const MLB_GRADIENT_PLAYERS_GREEN_135 = "linear-gradient(135deg, #052e16 0%, #14532d 50%, #16a34a 100%)";
export const MLB_GRADIENT_GAMES_INDIGO_135 = "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)";
export const NEUTRAL_GRADIENT_135 = "linear-gradient(135deg, #1a1d24 0%, #2d3140 50%, #4a4f63 100%)";
