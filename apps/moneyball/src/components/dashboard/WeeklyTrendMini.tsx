"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { getAccuracyColor } from "@moneyball/shared";

export interface WeeklyTrendPoint {
  label: string;
  weekId: string;
  rate: number;
  verified: number;
  correct: number;
  isCurrent: boolean;
}

interface WeeklyTrendMiniProps {
  weeks: WeeklyTrendPoint[];
}

function barColor(rate: number, verified: number): string {
  if (verified === 0) return "#e5e7eb";
  if (rate >= 0.65) return "#10b981";
  if (rate >= 0.55) return "#f59e0b";
  return "#ef4444";
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: WeeklyTrendPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-gray-800 dark:text-gray-100">{d.weekId}</p>
      {d.verified === 0 ? (
        <p className="text-gray-400 mt-0.5">데이터 없음</p>
      ) : (
        <>
          <p className="text-gray-600 dark:text-gray-300 mt-0.5">
            {Math.round(d.rate * 100)}% ({d.correct}/{d.verified})
          </p>
          {d.isCurrent && (
            <p className="text-brand-500 mt-0.5">진행 중</p>
          )}
        </>
      )}
    </div>
  );
}

export function WeeklyTrendMini({ weeks }: WeeklyTrendMiniProps) {
  const router = useRouter();
  const current = [...weeks].reverse().find((w) => w.isCurrent);
  const currentPct =
    current && current.verified > 0 ? Math.round(current.rate * 100) : null;

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          최근 4주 성과
        </h3>
        <Link
          href="/reviews/weekly"
          className="text-xs text-brand-600 hover:text-brand-800 hover:underline"
        >
          전체 보기 →
        </Link>
      </div>
      {currentPct != null ? (
        <div className="flex items-end gap-1.5">
          <span
            className={`text-4xl font-bold ${getAccuracyColor(currentPct)}`}
          >
            {currentPct}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            이번 주
          </span>
        </div>
      ) : (
        <div className="flex items-end gap-1.5">
          <span className="text-4xl font-bold text-gray-400 dark:text-gray-500">
            --%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            이번 주 집계 전
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={56}>
        <BarChart
          data={weeks}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          barCategoryGap="20%"
        >
          <ReferenceLine y={0.5} stroke="#9ca3af" strokeDasharray="3 2" strokeWidth={1} />
          <Bar
            dataKey="rate"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
            style={{ cursor: "pointer" }}
            onClick={(data) => {
              const weekId = (data as { payload?: { weekId?: string } })?.payload?.weekId;
              if (weekId) router.push(`/reviews/weekly/${weekId}`);
            }}
          >
            {weeks.map((w, i) => (
              <Cell
                key={i}
                fill={barColor(w.rate, w.verified)}
                opacity={w.isCurrent ? 1 : 0.7}
                strokeWidth={w.isCurrent ? 1.5 : 0}
                stroke={w.isCurrent ? barColor(w.rate, w.verified) : "none"}
              />
            ))}
          </Bar>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-gray-400 dark:text-gray-500"
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
