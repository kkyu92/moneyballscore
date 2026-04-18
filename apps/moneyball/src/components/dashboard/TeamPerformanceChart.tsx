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

interface TeamData {
  team: string;
  accuracy: number;
  total: number;
  color: string;
}

interface TeamPerformanceChartProps {
  data: TeamData[];
}

export function TeamPerformanceChart({ data }: TeamPerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center">
        <span className="text-4xl mb-3">⚾</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">팀별 3경기 이상 검증되면 적중률 비교 차트가 표시됩니다.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">각 팀 최소 3경기 예측 필요</p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.accuracy - a.accuracy);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={sorted} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="team"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(value, _name, props) => {
            const payload = (props as { payload?: { total?: number } }).payload;
            return [
              `${Number(value).toFixed(1)}% (${payload?.total ?? 0}경기)`,
              "적중률",
            ];
          }}
        />
        <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 4" />
        <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
          {sorted.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
