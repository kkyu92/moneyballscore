"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { KBO_TEAMS, KBO_TEAM_SHORT_NAME, type TeamCode } from "@moneyball/shared";
import type { EloDataPoint } from "@/lib/standings/buildEloTrend";

interface EloTrendChartProps {
  points: EloDataPoint[];
  teams: TeamCode[];
}

function fmtDate(date: string): string {
  const parts = date.split("-");
  if (parts.length < 3) return date;
  return `${parts[1]}/${parts[2]}`;
}

export function EloTrendChart({ points, teams }: EloTrendChartProps) {
  if (points.length === 0) return null;

  // Elo 범위 계산 (여백 포함)
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
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={points}
        margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
      >
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 11 }}
          width={48}
          tickFormatter={(v: number) => v.toFixed(0)}
        />
        <Tooltip
          formatter={(value: unknown, name: unknown) => {
            const v = typeof value === "number" ? value.toFixed(1) : String(value);
            const n = typeof name === "string" ? (KBO_TEAM_SHORT_NAME[name as TeamCode] ?? name) : String(name);
            return [v, n];
          }}
          labelFormatter={(label: unknown) => String(label)}
        />
        <Legend
          formatter={(value: string) =>
            KBO_TEAM_SHORT_NAME[value as TeamCode] ?? value
          }
          wrapperStyle={{ fontSize: 12 }}
        />
        {teams.map((team) => (
          <Line
            key={team}
            type="monotone"
            dataKey={team}
            stroke={KBO_TEAMS[team].color}
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
