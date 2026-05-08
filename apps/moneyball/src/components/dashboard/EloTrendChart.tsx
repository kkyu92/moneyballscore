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
import { KBO_TEAMS, KBO_TEAM_SHORT_NAME, type TeamCode } from "@moneyball/shared";
import type { EloDataPoint } from "@/lib/standings/buildEloTrend";
import { ChartTooltip } from "./ChartTooltip";
import { formatChartDate } from "./chart-format";
import { neutral } from "@/lib/design-tokens";

interface EloTrendChartProps {
  points: EloDataPoint[];
  teams: TeamCode[];
}

export function EloTrendChart({ points, teams }: EloTrendChartProps) {
  if (points.length === 0) return null;

  let minElo = Infinity;
  let maxElo = -Infinity;
  for (const pt of points) {
    for (const team of teams) {
      const v = pt[team];
      if (typeof v === "number") {
        if (v < minElo) minElo = v;
        if (v > maxElo) maxElo = v;
      }
    }
  }
  const pad = 30;
  const yMin = Math.floor((minElo - pad) / 10) * 10;
  const yMax = Math.ceil((maxElo + pad) / 10) * 10;

  return (
    <div className="bg-white dark:bg-gray-50 rounded-lg -mx-1 px-1 pt-2 pb-1">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={points}
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={neutral[200]} strokeOpacity={0.6} />
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
            width={48}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <Tooltip
            content={(props) => (
              <ChartTooltip
                {...props}
                formatRows={(payload) =>
                  ((payload ?? []) as Array<{ value: number; name: string; color: string }>)
                    .sort((a, b) => b.value - a.value)
                    .map((p) => ({
                      label: KBO_TEAM_SHORT_NAME[p.name as TeamCode] ?? p.name,
                      value: Number(p.value).toFixed(1),
                      color: p.color,
                    }))
                }
              />
            )}
          />
          <Legend
            formatter={(value: string) =>
              KBO_TEAM_SHORT_NAME[value as TeamCode] ?? value
            }
            wrapperStyle={{ fontSize: 11, color: neutral[500] }}
          />
          {teams.map((team) => (
            <Line
              key={team}
              type="monotone"
              dataKey={team}
              stroke={KBO_TEAMS[team].color}
              strokeWidth={1.5}
              dot={false}
              // 시즌 시작 first observation 이전 forward-fill 부재 (buildEloTrend) — connectNulls 필요
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
