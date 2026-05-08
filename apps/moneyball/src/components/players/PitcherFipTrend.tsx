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
import type { PitcherFipPoint } from "@/lib/players/buildPitcherFipTrend";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import { formatChartDate } from "@/components/dashboard/chart-format";
import { neutral } from "@/lib/design-tokens";

interface PitcherFipTrendProps {
  points: PitcherFipPoint[];
  teamColor: string | null;
}

export function PitcherFipTrend({ points, teamColor }: PitcherFipTrendProps) {
  if (points.length < 3) return null;

  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const pt of points) {
    if (pt.fip < minVal) minVal = pt.fip;
    if (pt.fip > maxVal) maxVal = pt.fip;
    if (pt.xfip != null) {
      if (pt.xfip < minVal) minVal = pt.xfip;
      if (pt.xfip > maxVal) maxVal = pt.xfip;
    }
  }
  const pad = 0.5;
  const yMin = Math.floor((minVal - pad) * 2) / 2;
  const yMax = Math.ceil((maxVal + pad) * 2) / 2;

  const fipColor = teamColor ?? neutral[700];

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
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <Tooltip
            content={(props) => (
              <ChartTooltip
                {...props}
                formatRows={(payload) =>
                  (payload ?? [])
                    .filter(
                      (p: { value: number | null }) =>
                        p.value != null && Number.isFinite(p.value),
                    )
                    .map(
                      (p: { value: number; name: string; color: string }) => ({
                        label: p.name === "fip" ? "FIP" : "xFIP",
                        value: Number(p.value).toFixed(2),
                        color: p.color,
                      }),
                    )
                }
              />
            )}
          />
          <Legend
            formatter={(value) => (value === "fip" ? "FIP" : "xFIP")}
            wrapperStyle={{ fontSize: 11, color: neutral[500] }}
          />
          <Line
            type="monotone"
            dataKey="fip"
            stroke={fipColor}
            strokeWidth={2}
            dot={{ r: 3, fill: fipColor }}
          />
          <Line
            type="monotone"
            dataKey="xfip"
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
