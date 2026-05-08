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
import type { TeamEloPoint } from "@/lib/teams/buildTeamEloTrend";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { neutral } from "@/lib/design-tokens";

interface TeamEloChartProps {
  points: TeamEloPoint[];
  teamCode: TeamCode;
}

function fmtDate(date: string): string {
  const parts = date.split("-");
  if (parts.length < 3) return date;
  return `${parts[1]}/${parts[2]}`;
}

export function TeamEloChart({ points, teamCode }: TeamEloChartProps) {
  if (points.length === 0) return null;

  const teamColor = KBO_TEAMS[teamCode].color;
  const teamName = KBO_TEAM_SHORT_NAME[teamCode];

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
            tickFormatter={fmtDate}
            tick={{ fontSize: 11, fill: neutral[500] }}
            tickLine={false}
            axisLine={{ stroke: neutral[200] }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 11, fill: neutral[500] }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            content={(props) => (
              <ChartTooltip
                {...props}
                formatRows={(payload) =>
                  (payload ?? []).map(
                    (p: { value: number; name: string; color: string }) => ({
                      label: p.name === "elo" ? teamName : "리그 평균",
                      value: Number(p.value).toFixed(1),
                      color: p.color,
                    }),
                  )
                }
              />
            )}
          />
          <Legend
            formatter={(value) => (value === "elo" ? teamName : "리그 평균")}
            wrapperStyle={{ fontSize: 11, color: neutral[500] }}
          />
          <Line
            type="monotone"
            dataKey="elo"
            stroke={teamColor}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke={neutral[400]}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
