"use client";

import { brand, neutral, semantic } from "@/lib/design-tokens";

type Primitive = string | number | null | undefined;

interface ChartTooltipRow {
  label: string;
  value: string;
  color?: string;
  muted?: boolean;
}

/**
 * Recharts `Tooltip` 의 content prop 에 넘기는 함수 시그니처가 generics 이
 * 복잡해 인터페이스로 재현하기 까다롭다 — 실무에선 payload 만 소비하고
 * title/formatRows 만 노출.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RechartsPayload = any;

interface ChartTooltipProps {
  active?: boolean;
  payload?: RechartsPayload;
  label?: string | number;
  title?: string;
  formatRows?: (payload: RechartsPayload) => ChartTooltipRow[];
}

/**
 * 모든 대시보드 차트가 공유하는 커스텀 툴팁. 브랜드 색상 기반 카드 스타일
 * + dark mode + 애니메이션. Recharts 기본 툴팁의 흰 배경 + 회색 테두리
 * 보다 시각적 weight 줘서 "트렌디" 느낌.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  title,
  formatRows,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const rows: ChartTooltipRow[] = formatRows
    ? formatRows(payload)
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload as any[]).map((p) => ({
        label: p.name ?? "",
        value: formatNumber(p.value),
        color: p.color,
      }));

  return (
    <div className="rounded-xl border border-gray-200 dark:border-[var(--color-border)] bg-white/95 dark:bg-[var(--color-surface-card)]/95 backdrop-blur-sm shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
        {title ?? label}
      </p>
      {rows.map((r, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 ${r.muted ? "opacity-60" : ""}`}
        >
          {r.color && (
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: r.color }}
            />
          )}
          <span className="text-gray-500 dark:text-gray-400">{r.label}</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100 ml-auto tabular-nums">
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatNumber(v: Primitive): string {
  if (v == null) return "—";
  if (typeof v === "number") {
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }
  return String(v);
}

/** 공통 gradient <defs> — 차트 컴포넌트에서 children 으로 포함. */
export function ChartGradients() {
  return (
    <defs>
      <linearGradient id="brandAreaGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={semantic.info} stopOpacity={0.45} />
        <stop offset="100%" stopColor={semantic.info} stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="brandBarGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={brand[400]} stopOpacity={1} />
        <stop offset="100%" stopColor={brand[700]} stopOpacity={0.9} />
      </linearGradient>
      <linearGradient id="mutedBarGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={neutral[400]} stopOpacity={0.85} />
        <stop offset="100%" stopColor={neutral[500]} stopOpacity={0.75} />
      </linearGradient>
      <filter id="barShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow
          dx="0"
          dy="2"
          stdDeviation="2"
          floodColor={brand[900]}
          floodOpacity="0.15"
        />
      </filter>
    </defs>
  );
}
