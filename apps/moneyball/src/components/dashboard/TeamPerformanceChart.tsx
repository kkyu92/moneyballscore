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
import { ChartGradients, ChartTooltip } from "./ChartTooltip";

interface TeamData {
  team: string;
  accuracy: number;
  total: number;
  color: string;
}

interface TeamPerformanceChartProps {
  data: TeamData[];
}

/**
 * 팀별 적중률 차트. 각 팀 고유 색상을 기반으로 세로 그라데이션 적용.
 * Recharts 는 Cell 에 gradient id 를 fill 로 주려면 각각 <defs> 정의 필요 →
 * team color 로 동적 그라데이션 생성.
 */
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
      <BarChart data={sorted} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <defs>
          {sorted.map((t, i) => (
            <linearGradient
              key={t.team + i}
              id={`teamGradient_${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={t.color} stopOpacity={1} />
              <stop offset="100%" stopColor={t.color} stopOpacity={0.65} />
            </linearGradient>
          ))}
        </defs>
        <ChartGradients />
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
        <XAxis
          dataKey="team"
          tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 500 }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
          interval={0}
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
                ((payload ?? []) as Array<{ value: number; payload: TeamData }>).map((p) => {
                  const d = p.payload;
                  return {
                    label: d.team + " 적중률",
                    value: `${Number(p.value).toFixed(1)}% · ${d.total}경기`,
                    color: d.color,
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
          {sorted.map((_, i) => (
            <Cell key={i} fill={`url(#teamGradient_${i})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
