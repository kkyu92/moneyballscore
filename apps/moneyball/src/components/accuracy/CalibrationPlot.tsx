"use client";

import {
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Line,
  ComposedChart,
} from "recharts";

import type { CalibrationBucket } from "@/lib/dashboard/compareModels";
import { brand, neutral, semantic } from "@/lib/design-tokens";
import { ChartTooltip } from "@/components/dashboard/ChartTooltip";

export interface CalibrationSeriesData {
  label: string;
  color: string;
  buckets: CalibrationBucket[];
}

interface CalibrationPlotProps {
  series: CalibrationSeriesData[];
}

interface PlotRow {
  predicted: number;
  actual: number;
  n: number;
  bucket: string;
}

const PERFECT_LINE: Array<{ predicted: number; perfect: number }> = [
  { predicted: 0, perfect: 0 },
  { predicted: 1, perfect: 1 },
];

function toRows(buckets: CalibrationBucket[]): PlotRow[] {
  return buckets
    .filter((b) => b.n > 0)
    .map((b) => ({
      predicted: b.avgPredicted,
      actual: b.actualRate,
      n: b.n,
      bucket: `${Math.round(b.lo * 100)}-${Math.round(b.hi * 100)}%`,
    }));
}

export function CalibrationPlot({ series }: CalibrationPlotProps) {
  const hasData = series.some((s) => s.buckets.some((b) => b.n > 0));
  if (!hasData) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-center">
        <span className="text-3xl mb-2">📈</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          calibration plot 측정에는 더 많은 검증 예측이 필요합니다.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-gray-100 dark:text-gray-800"
        />
        <XAxis
          type="number"
          dataKey="predicted"
          domain={[0, 1]}
          tick={{ fontSize: 11, fill: neutral[500] }}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          label={{
            value: "예측 확률 (평균)",
            position: "insideBottom",
            offset: -2,
            fontSize: 11,
            fill: neutral[500],
          }}
        />
        <YAxis
          type="number"
          dataKey="actual"
          domain={[0, 1]}
          tick={{ fontSize: 11, fill: neutral[500] }}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          label={{
            value: "실제 적중률",
            angle: -90,
            position: "insideLeft",
            fontSize: 11,
            fill: neutral[500],
          }}
        />
        <ReferenceLine
          segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
          stroke={neutral[400]}
          strokeDasharray="4 4"
          ifOverflow="visible"
        />
        <Line
          data={PERFECT_LINE}
          dataKey="perfect"
          stroke="transparent"
          dot={false}
          activeDot={false}
          legendType="none"
        />
        <Tooltip
          content={(props) => (
            <ChartTooltip
              {...props}
              formatRows={(payload) => {
                const items = (payload ?? []) as Array<{
                  name?: string;
                  payload: PlotRow;
                  color: string;
                }>;
                if (items.length === 0) return [];
                const row = items[0].payload;
                return [
                  {
                    label: "Bucket",
                    value: row.bucket,
                    color: items[0].color,
                  },
                  {
                    label: "예측 평균",
                    value: `${(row.predicted * 100).toFixed(1)}%`,
                    color: items[0].color,
                  },
                  {
                    label: "실제 적중률",
                    value: `${(row.actual * 100).toFixed(1)}%`,
                    color: items[0].color,
                  },
                  {
                    label: "표본",
                    value: `n=${row.n}`,
                    color: items[0].color,
                  },
                ];
              }}
            />
          )}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
        />
        {series.map((s) => (
          <Scatter
            key={s.label}
            name={s.label}
            data={toRows(s.buckets)}
            fill={s.color}
            line={{ stroke: s.color, strokeWidth: 1.5 }}
            lineType="joint"
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export const CALIBRATION_COLORS = {
  v18: brand[600],
  shadow: semantic.warning,
  v20: semantic.info,
} as const;
