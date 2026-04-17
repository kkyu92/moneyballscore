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
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickFormatter={(d) => d.slice(5)}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(value, _name, props) => {
            const payload = (props as unknown as { payload: DailyAccuracyPoint }).payload;
            return [
              `${Number(value).toFixed(1)}% (${payload.correct}/${payload.total})`,
              "일자 적중률",
            ];
          }}
        />
        <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 4" />
        <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.accuracy >= 50 ? "#3b82f6" : "#9ca3af"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
