import type { PitcherAppearance } from "./buildPitcherProfile";

export interface PitcherFipPoint {
  date: string;
  fip: number;
  xfip: number | null;
}

export function buildPitcherFipTrend(
  recent: PitcherAppearance[],
): PitcherFipPoint[] {
  const points: PitcherFipPoint[] = [];
  for (const a of recent) {
    if (a.fip == null) continue;
    points.push({ date: a.gameDate, fip: a.fip, xfip: a.xfip });
  }
  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}
