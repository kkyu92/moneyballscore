"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartGradients, ChartTooltip } from "./ChartTooltip";

interface DataPoint {
  date: string;
  accuracy: number;
  total: number;
}

interface AccuracyChartProps {
  data: DataPoint[];
}

export function AccuracyChart({ data }: AccuracyChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center">
        <span className="text-4xl mb-3">📈</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">경기 결과가 검증되면 누적 적중률 차트가 표시됩니다.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">매일 KST 23:00 자동 업데이트</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <ChartGradients />
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
          tickFormatter={(d) => d.slice(5)}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "3 3" }}
          content={(props) => (
            <ChartTooltip
              {...props}
              formatRows={(payload) =>
                ((payload ?? []) as Array<{ value: number; payload: DataPoint }>).map((p) => {
                  const d = p.payload;
                  return {
                    label: "누적 적중률",
                    value: `${Number(p.value).toFixed(1)}% · n=${d.total}`,
                    color: "#3b82f6",
                  };
                })
              }
            />
          )}
        />
        <ReferenceLine
          y={50}
          stroke="#ef4444"
          strokeDasharray="4 4"
          strokeOpacity={0.6}
          label={{
            value: "50% 기준",
            fontSize: 10,
            fill: "#ef4444",
            position: "insideBottomRight",
          }}
        />
        <Area
          type="monotone"
          dataKey="accuracy"
          stroke="#3b82f6"
          strokeWidth={2.5}
          fill="url(#brandAreaGradient)"
          dot={{ r: 2, stroke: "#3b82f6", strokeWidth: 1.5, fill: "#ffffff" }}
          activeDot={{ r: 5, stroke: "#ffffff", strokeWidth: 2, fill: "#3b82f6" }}
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
