"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

import { PRODUCTION_ERA_HISTORY } from "@moneyball/shared";

import type { BrierTrendPoint } from "@/lib/accuracy/buildAccuracyData";
import { brand, chartCursorTint, neutral, semantic } from "@/lib/design-tokens";
import { ChartTooltip } from "./ChartTooltip";

interface BrierTrendChartProps {
  data: BrierTrendPoint[];
}

// scoring_rule 색상 매핑 — DESIGN.md semantic + brand token 정합.
// v1.5 = neutral (baseline) / v1.6 = error (anomaly) / v1.7-revert = warning (revert) / v1.8 = brand (current) / all = brand 강조.
const SR_COLOR_MAP: Record<string, string> = {
  all: brand[600],
  "v1.5": neutral[500], // baseline
  "v1.6": semantic.error, // anomaly (n=46 37%)
  "v1.7-revert": semantic.warning, // revert
  "v1.8": brand[500], // current
};

// silent drift wave-255 (cycle 1559) — hardcoded era list → PRODUCTION_ERA_HISTORY registry.
// 신규 era 추가 시 packages/shared/src/model-version-labels.ts 1줄 = chart line 자동 반영.
const SR_ORDER = ["all", ...PRODUCTION_ERA_HISTORY];

interface PivotRow {
  weekLabel: string;
  date: string;
  [sr: string]: string | number | null;
}

export function BrierTrendChart({ data }: BrierTrendChartProps) {
  if (data.length < 3) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center">
        <span className="text-4xl mb-3">📈</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          3주 이상 검증되면 Brier score 시계열 그래프가 표시됩니다.
        </p>
      </div>
    );
  }

  // pivot — week × scoring_rule = row × column
  const weeksMap = new Map<string, PivotRow>();
  for (const p of data) {
    if (!weeksMap.has(p.date)) {
      weeksMap.set(p.date, { weekLabel: p.weekLabel, date: p.date });
    }
    const row = weeksMap.get(p.date)!;
    row[p.scoringRule] = p.brier;
  }
  const pivotData = Array.from(weeksMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // active SR — 데이터 있는 SR 만 line 박제
  const activeSRs = SR_ORDER.filter((sr) =>
    pivotData.some((row) => row[sr] !== undefined && row[sr] !== null),
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={pivotData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          className="text-gray-100 dark:text-gray-800"
        />
        <XAxis
          dataKey="weekLabel"
          tick={{ fontSize: 11, fill: neutral[400] }}
          tickLine={false}
          axisLine={{ stroke: neutral[200] }}
        />
        <YAxis
          domain={[0.15, 0.35]}
          tick={{ fontSize: 11, fill: neutral[400] }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v.toFixed(2)}
          label={{ value: "Brier", angle: -90, position: "insideLeft", fontSize: 11, fill: neutral[400] }}
        />
        <ReferenceLine y={0.25} stroke={neutral[400]} strokeDasharray="4 4" strokeOpacity={0.4} />
        <Tooltip
          cursor={{ fill: chartCursorTint }}
          content={(props) => (
            <ChartTooltip
              {...props}
              formatRows={(payload) =>
                ((payload ?? []) as Array<{ value: number; dataKey: string; color: string }>)
                  .filter((p) => p.value !== null && p.value !== undefined)
                  .map((p) => ({
                    label: p.dataKey === "all" ? "전체" : p.dataKey,
                    value: Number(p.value).toFixed(4),
                    color: p.color,
                  }))
              }
            />
          )}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => (value === "all" ? "전체" : value)}
        />
        {activeSRs.map((sr) => (
          <Line
            key={sr}
            type="monotone"
            dataKey={sr}
            stroke={SR_COLOR_MAP[sr] ?? neutral[400]}
            strokeWidth={sr === "all" ? 2.5 : 1.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
