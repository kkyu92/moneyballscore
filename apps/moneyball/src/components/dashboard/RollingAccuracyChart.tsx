"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import {
  ACCURACY_BASELINE,
  ROLLING_ACCURACY_WINDOW_DAYS,
} from "@moneyball/shared";

import type { RollingAccuracyPoint } from "@/lib/accuracy/buildAccuracyData";
import { brand, chartCursorTint, neutral } from "@/lib/design-tokens";
import { ChartTooltip } from "./ChartTooltip";

interface RollingAccuracyChartProps {
  data: RollingAccuracyPoint[];
  windowDays?: number;
}

/**
 * rolling window accuracy 추세 line chart.
 * totalDays each day = 직전 windowDays (해당 날짜 포함) 적중률 mean.
 * brand-500 line + 0.5 baseline (동전) reference. n<3 day = null (line 끊김 X via connectNulls).
 * window = ROLLING_ACCURACY_WINDOW_DAYS (shared registry).
 */
export function RollingAccuracyChart({
  data,
  windowDays = ROLLING_ACCURACY_WINDOW_DAYS,
}: RollingAccuracyChartProps) {
  const hasData = data.some((p) => p.windowAccuracy !== null);
  if (!hasData) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center">
        <span className="text-4xl mb-3">📈</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {windowDays}일 rolling 적중률 측정에는 누적 표본이 더 필요합니다.
        </p>
      </div>
    );
  }

  const tickFormatter = (label: string, index: number) => {
    return index % 7 === 0 ? label : "";
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-gray-100 dark:text-gray-800"
        />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 11, fill: neutral[400] }}
          tickLine={false}
          axisLine={{ stroke: neutral[200] }}
          tickFormatter={tickFormatter}
          interval={0}
        />
        <YAxis
          domain={[0.3, 0.7]}
          tick={{ fontSize: 11, fill: neutral[400] }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          label={{
            value: "적중률",
            angle: -90,
            position: "insideLeft",
            fontSize: 11,
            fill: neutral[400],
          }}
        />
        <ReferenceLine
          y={ACCURACY_BASELINE}
          stroke={neutral[400]}
          strokeDasharray="4 4"
          strokeOpacity={0.5}
          label={{
            value: "동전 50%",
            fontSize: 10,
            fill: neutral[400],
            position: "insideTopRight",
          }}
        />
        <Tooltip
          cursor={{ fill: chartCursorTint }}
          content={(props) => (
            <ChartTooltip
              {...props}
              formatRows={(payload) =>
                ((payload ?? []) as Array<{
                  value: number;
                  payload: RollingAccuracyPoint;
                  color: string;
                }>)
                  .filter((p) => p.value !== null && p.value !== undefined)
                  .map((p) => ({
                    label: `${windowDays}일 rolling`,
                    value: `${(p.value * 100).toFixed(1)}% (n=${p.payload.windowN})`,
                    color: p.color,
                  }))
              }
            />
          )}
        />
        <Line
          type="monotone"
          dataKey="windowAccuracy"
          stroke={brand[500]}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
