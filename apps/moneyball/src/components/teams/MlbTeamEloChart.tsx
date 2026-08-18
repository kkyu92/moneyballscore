"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MLB_TEAMS, type MlbTeamCode } from "@moneyball/shared";
import type { MlbTeamEloPoint } from "@/lib/mlb/buildMlbTeamEloTrend";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { formatChartDate } from "@/components/dashboard/chart-format";
import { neutral } from "@/lib/design-tokens";

// KBO TeamEloChart.tsx 병렬 구현 — 데이터만 mlb_team_elo_history 기반
// buildMlbTeamEloTrend 산출물로 교체 (MlbMatchupEloChart 와 동일 패턴).

interface MlbTeamEloChartProps {
  points: MlbTeamEloPoint[];
  teamCode: MlbTeamCode;
  locale?: "ko" | "en";
}

export function MlbTeamEloChart({ points, teamCode, locale = "ko" }: MlbTeamEloChartProps) {
  if (points.length === 0) return null;

  const team = MLB_TEAMS[teamCode];
  const teamColor = team.color;
  const teamName = team.shortName;
  const leagueAvgLabel = locale === "en" ? "League Avg" : "리그 평균";

  let minElo = Infinity;
  let maxElo = -Infinity;
  for (const pt of points) {
    if (pt.elo < minElo) minElo = pt.elo;
    if (pt.elo > maxElo) maxElo = pt.elo;
    if (pt.avg < minElo) minElo = pt.avg;
    if (pt.avg > maxElo) maxElo = pt.avg;
  }
  const pad = 20;
  const yMin = Math.floor((minElo - pad) / 10) * 10;
  const yMax = Math.ceil((maxElo + pad) / 10) * 10;

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-lg -mx-1 px-1 pt-2 pb-1">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={points}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={neutral[200]}
            strokeOpacity={0.6}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatChartDate}
            tick={{ fontSize: 11, fill: neutral[500] }}
            tickLine={false}
            axisLine={{ stroke: neutral[200] }}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 11, fill: neutral[500] }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <Tooltip
            content={(props) => (
              <ChartTooltip
                {...props}
                formatRows={(payload) =>
                  (payload ?? []).map(
                    (p: { value: number; name: string; color: string }) => ({
                      label: p.name === "elo" ? teamName : leagueAvgLabel,
                      value: Number(p.value).toFixed(1),
                      color: p.color,
                    }),
                  )
                }
              />
            )}
          />
          <Legend
            formatter={(value) => (value === "elo" ? teamName : leagueAvgLabel)}
            wrapperStyle={{ fontSize: 11, color: neutral[500] }}
          />
          <Line
            type="monotone"
            dataKey="elo"
            stroke={teamColor}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke={neutral[400]}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
