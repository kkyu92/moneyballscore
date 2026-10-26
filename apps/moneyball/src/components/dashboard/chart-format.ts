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
