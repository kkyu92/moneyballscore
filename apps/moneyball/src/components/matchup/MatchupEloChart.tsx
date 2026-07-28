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
import type { MatchupEloPoint } from "@/lib/matchup/buildMatchupEloTrend";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { formatChartDate } from "@/components/dashboard/chart-format";
import { neutral } from "@/lib/design-tokens";

interface MatchupEloChartProps {
  points: MatchupEloPoint[];
  teamA: { shortName: string; color: string };
  teamB: { shortName: string; color: string };
}

export function MatchupEloChart({ points, teamA, teamB }: MatchupEloChartProps) {
  if (points.length === 0) return null;

  let minElo = Infinity;
  let maxElo = -Infinity;
  for (const pt of points) {
    if (pt.eloA !== null) {
      if (pt.eloA < minElo) minElo = pt.eloA;
      if (pt.eloA > maxElo) maxElo = pt.eloA;
    }
    if (pt.eloB !== null) {
      if (pt.eloB < minElo) minElo = pt.eloB;
      if (pt.eloB > maxElo) maxElo = pt.eloB;
    }
  }
  const pad = 20;
  const yMin = Math.floor((minElo - pad) / 10) * 10;
  const yMax = Math.ceil((maxElo + pad) / 10) * 10;

  return (
    <div className="bg-white dark:bg-gray-50 rounded-lg -mx-1 px-1 pt-2 pb-1">
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
                      label: p.name === "eloA" ? teamA.shortName : teamB.shortName,
                      value: Number(p.value).toFixed(1),
                      color: p.color,
                    }),
                  )
                }
              />
            )}
          />
          <Legend
            formatter={(value) => (value === "eloA" ? teamA.shortName : teamB.shortName)}
            wrapperStyle={{ fontSize: 11, color: neutral[500] }}
          />
          <Line
            type="monotone"
            dataKey="eloA"
            stroke={teamA.color}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="eloB"
            stroke={teamB.color}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
