export function formatChartDate(date: string): string {
  const parts = date.split("-");
  if (parts.length < 3) return date;
  return `${parts[1]}/${parts[2]}`;
}

/**
 * Brier 시계열 Y축 domain — 기본 [0.15, 0.35] 를 유지하되 데이터가 벗어나면 0.05 단위로 확장.
 * 주차×scoring_rule 소표본 Brier 는 0.35 초과(예: CE 구간 ~0.40)가 흔해 고정 domain 이면 점/선이 plot 밖으로 잘림.
 */
export function brierYDomain(
  values: Array<number | null | undefined>,
  lo = 0.15,
  hi = 0.35,
): [number, number] {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return [lo, hi];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return [
    Math.min(lo, Math.floor(min * 20) / 20),
    Math.max(hi, Math.ceil(max * 20) / 20),
  ];
}

/**
 * 적중률(0~1) 시계열 Y축 domain — 기본 [0.3, 0.7] 유지, 데이터가 벗어나면 0.1 단위로 확장 (0~1 clamp).
 * rolling window 소표본(n=3~) 은 0%/100% 로 튀어 고정 domain 이면 점/선이 plot 밖으로 잘림.
 */
export function accuracyYDomain(
  values: Array<number | null | undefined>,
  lo = 0.3,
  hi = 0.7,
): [number, number] {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return [lo, hi];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return [
    Math.max(0, Math.min(lo, Math.floor(min * 10) / 10)),
    Math.min(1, Math.max(hi, Math.ceil(max * 10) / 10)),
  ];
}
