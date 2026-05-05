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

export const accent = {
  base: "#c5a23e",
  light: "#e2c96b",
  away: "#c5872a",
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

export const chartCursorTint = "rgba(59, 130, 246, 0.06)";
