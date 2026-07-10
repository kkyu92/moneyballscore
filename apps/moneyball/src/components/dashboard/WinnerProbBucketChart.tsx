"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

import { ACCURACY_BASELINE } from "@moneyball/shared";

import type { WinnerProbBucket } from "@/lib/accuracy/buildAccuracyData";
import { brand, chartCursorTint, neutral, semantic } from "@/lib/design-tokens";
import { ChartTooltip } from "./ChartTooltip";

interface WinnerProbBucketChartProps {
  data: WinnerProbBucket[];
}

interface BucketRow {
  label: string;
  predicted: number;
  actual: number | null;
  n: number;
  hits: number;
  ci95Half: number;
}

/**
 * winner prob bucket × 실제 적중률 calibration evidence.
 * 4 bucket (50-60% / 60-70% / 70-80% / 80%+).
 * brand color (well-calibrated) / warning (over-confident: predicted > actual + 0.05).
 */
export function WinnerProbBucketChart({ data }: WinnerProbBucketChartProps) {
  const hasData = data.some((b) => b.n > 0);
  if (!hasData) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-center">
        <span className="text-3xl mb-2">📊</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          확률 bucket 측정에는 더 많은 검증 예측이 필요합니다.
        </p>
      </div>
    );
  }

  const rows: BucketRow[] = data.map((b) => ({
    label: b.label,
    predicted: b.avgPredicted ?? (b.min + b.max) / 2,
    actual: b.accuracy,
    n: b.n,
    hits: b.hits,
    ci95Half: b.ci95Half,
  }));

  const colorFor = (row: BucketRow): string => {
    if (row.actual === null) return neutral[400];
    if (row.predicted - row.actual > 0.05) return semantic.warning;
    return brand[500];
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-gray-100 dark:text-gray-800"
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: neutral[500] }}
          tickLine={false}
          axisLine={{ stroke: neutral[200] }}
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fontSize: 11, fill: neutral[400] }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          label={{
            value: "실제 적중률",
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
          strokeOpacity={0.4}
        />
        <Tooltip
          cursor={{ fill: chartCursorTint }}
          content={(props) => (
            <ChartTooltip
              {...props}
              formatRows={(payload) => {
                const items = (payload ?? []) as Array<{
                  payload: BucketRow;
                  color: string;
                }>;
                if (items.length === 0) return [];
                const row = items[0].payload;
                if (row.actual === null) {
                  return [
                    {
                      label: "표본",
                      value: `n=${row.n} (소표본)`,
                      color: neutral[400],
                    },
                    {
                      label: "예측 평균",
                      value: `${(row.predicted * 100).toFixed(1)}%`,
                      color: items[0].color,
                    },
                  ];
                }
                return [
                  {
                    label: "예측 평균",
                    value: `${(row.predicted * 100).toFixed(1)}%`,
                    color: items[0].color,
                  },
                  {
                    label: "실제 적중률",
                    value: `${(row.actual * 100).toFixed(1)}% (±${(row.ci95Half * 100).toFixed(1)}%p)`,
                    color: items[0].color,
                  },
                  {
                    label: "표본",
                    value: `${row.hits}/${row.n}`,
                    color: items[0].color,
                  },
                ];
              }}
            />
          )}
        />
        <Bar dataKey="actual" radius={[6, 6, 0, 0]}>
          {rows.map((row, i) => (
            <Cell key={i} fill={colorFor(row)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
