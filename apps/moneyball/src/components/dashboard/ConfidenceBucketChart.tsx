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
  LabelList,
} from "recharts";

import type { ConfidenceBucketResult } from "@/lib/dashboard/buildConfidenceBuckets";

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
      <BarChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(value, _name, props) => {
            const payload = (props as unknown as { payload: (typeof data)[number] }).payload;
            return [
              payload.hasData
                ? `${Number(value).toFixed(1)}% (${payload.total}경기)`
                : "표본 없음",
              "구간 적중률",
            ];
          }}
        />
        <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 4" />
        <Bar dataKey="accuracy" fill="#3b82f6" radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="total"
            position="top"
            formatter={(v) => {
              const n = typeof v === "number" ? v : Number(v);
              return Number.isFinite(n) && n > 0 ? `n=${n}` : "";
            }}
            style={{ fontSize: 10, fill: "#9ca3af" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
