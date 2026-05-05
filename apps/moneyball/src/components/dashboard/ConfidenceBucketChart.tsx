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
  LabelList,
} from "recharts";

import type { ConfidenceBucketResult } from "@/lib/dashboard/buildConfidenceBuckets";
import { ChartGradients, ChartTooltip } from "./ChartTooltip";

interface ConfidenceBucketChartProps {
  result: ConfidenceBucketResult;
}

export function ConfidenceBucketChart({ result }: ConfidenceBucketChartProps) {
  if (result.gated) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center">
        <span className="text-4xl mb-3">🎯</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          검증 10경기 이상 쌓이면 확신 구간별 적중률이 표시됩니다.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          현재 {result.totalVerified}경기 검증 완료 (최소 10)
        </p>
      </div>
    );
  }

  const data = result.buckets.map((b) => ({
    label: b.label,
    accuracy: b.accuracy ?? 0,
    total: b.total,
    hasData: b.total > 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 24, right: 10, left: -10, bottom: 5 }}>
        <ChartGradients />
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          cursor={{ fill: "rgba(59,130,246,0.06)" }}
          content={(props) => (
            <ChartTooltip
              {...props}
              formatRows={(payload) =>
                ((payload ?? []) as Array<{ value: number; payload: (typeof data)[number] }>).map((p) => {
                  const d = p.payload;
                  return {
                    label: "구간 적중률",
                    value: d.hasData
                      ? `${Number(p.value).toFixed(1)}% · ${d.total}경기`
                      : "표본 없음",
                    color: "#2d6b3f",
                    muted: !d.hasData,
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
                entry.hasData
                  ? "url(#brandBarGradient)"
                  : "url(#mutedBarGradient)"
              }
            />
          ))}
          <LabelList
            dataKey="total"
            position="top"
            formatter={(v) => {
              const n = typeof v === "number" ? v : Number(v);
              return Number.isFinite(n) && n > 0 ? `n=${n}` : "";
            }}
            style={{ fontSize: 10, fill: "#9ca3af", fontWeight: 500 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
