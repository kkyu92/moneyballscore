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

const CALIBRATION_FULL_N = 100;

interface CalibrationPlotProps {
  series: CalibrationSeriesData[];
  /** total paired predictions — shows progress badge below CALIBRATION_FULL_N */
  totalN?: number;
}

interface PlotRow {
  predicted: number;
  actual: number;
  n: number;
  bucket: string;
}

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

export function CalibrationPlot({ series, totalN }: CalibrationPlotProps) {
  const hasData = series.some((s) => s.buckets.some((b) => b.n > 0));
  if (!hasData) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-center gap-2">
        <span className="text-3xl">📈</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          calibration plot 측정에는 더 많은 검증 예측이 필요합니다.
        </p>
        {totalN !== undefined && (
          <div className="w-full max-w-xs">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
              n={totalN} / {CALIBRATION_FULL_N}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${Math.min((totalN / CALIBRATION_FULL_N) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {totalN !== undefined && totalN < CALIBRATION_FULL_N && (
        <div className="mb-3 rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
          <div className="flex items-center justify-between mb-1">
            <span>표본 수집 중 — n={totalN} / {CALIBRATION_FULL_N} (n={CALIBRATION_FULL_N} 도달 시 신뢰도 ↑)</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-yellow-200 dark:bg-yellow-800">
            <div
              className="h-full rounded-full bg-yellow-500"
              style={{ width: `${Math.min((totalN / CALIBRATION_FULL_N) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
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
    </div>
  );
}

export const CALIBRATION_COLORS = {
  v18: brand[600],
  shadow: semantic.warning,
  v20: semantic.info,
} as const;
