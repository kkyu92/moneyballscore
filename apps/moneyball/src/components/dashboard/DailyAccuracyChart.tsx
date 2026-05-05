"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

import type { DailyAccuracyPoint } from "@/lib/dashboard/buildDailyAccuracy";
import { brand, chartCursorTint, neutral, semantic } from "@/lib/design-tokens";
import { ChartGradients, ChartTooltip } from "./ChartTooltip";

interface DailyAccuracyChartProps {
  data: DailyAccuracyPoint[];
}

export function DailyAccuracyChart({ data }: DailyAccuracyChartProps) {
  if (data.length < 3) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center">
        <span className="text-4xl mb-3">📅</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">3일 이상 검증되면 일자별 적중률 그래프가 표시됩니다.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">현재 {data.length}일 검증 완료</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <ChartGradients />
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: neutral[400] }}
          tickLine={false}
          axisLine={{ stroke: neutral[200] }}
          tickFormatter={(d) => d.slice(5)}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: neutral[400] }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          cursor={{ fill: chartCursorTint }}
          content={(props) => (
            <ChartTooltip
              {...props}
              formatRows={(payload) =>
                ((payload ?? []) as Array<{ value: number; payload: DailyAccuracyPoint }>).map((p) => {
                  const d = p.payload;
                  const passed = d.accuracy >= 50;
                  return {
                    label: "적중률",
                    value: `${Number(p.value).toFixed(1)}% (${d.correct}/${d.total})`,
                    color: passed ? brand[500] : neutral[500],
                  };
                })
              }
            />
          )}
        />
        <ReferenceLine
          y={50}
          stroke={semantic.error}
          strokeDasharray="4 4"
          strokeOpacity={0.6}
        />
        <Bar
          dataKey="accuracy"
          radius={[6, 6, 0, 0]}
          animationDuration={600}
          filter="url(#barShadow)"
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.accuracy >= 50
                  ? "url(#brandBarGradient)"
                  : "url(#mutedBarGradient)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
