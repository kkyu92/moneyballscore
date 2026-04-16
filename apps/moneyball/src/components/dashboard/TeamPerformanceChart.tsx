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
      <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
        데이터 축적 후 차트가 표시됩니다.
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
          formatter={(value, _name, props) => [
            `${Number(value).toFixed(1)}% (${(props as any).payload?.total ?? 0}경기)`,
            "적중률",
          ]}
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
