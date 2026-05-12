'use client';

import type { WeeklyGroup } from '@/lib/picks/buildPicksStats';

interface Props {
  groups: WeeklyGroup[];
}

export function PicksTrendChart({ groups }: Props) {
  if (groups.length < 2) return null;

  // 오래된→최신 순서 (역순)
  const sorted = [...groups].reverse();

  const W = 280;
  const H = 80;
  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 10;
  const PAD_B = 24;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const n = sorted.length;
  const xStep = n > 1 ? chartW / (n - 1) : chartW;

  const toY = (rate: number | null): number | null => {
    if (rate === null) return null;
    return PAD_T + chartH - rate * chartH;
  };

  const myPoints = sorted.map((g, i) => ({
    x: PAD_L + i * xStep,
    y: toY(g.stats.myRate),
  }));
  const aiPoints = sorted.map((g, i) => ({
    x: PAD_L + i * xStep,
    y: toY(g.stats.aiRate),
  }));

  const toPolylineSegments = (pts: { x: number; y: number | null }[]): string[] => {
    const segments: string[] = [];
    let current: string[] = [];
    for (const pt of pts) {
      if (pt.y !== null) {
        current.push(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
      } else {
        if (current.length >= 2) segments.push(current.join(' '));
        current = [];
      }
    }
    if (current.length >= 2) segments.push(current.join(' '));
    return segments;
  };

  const mySegments = toPolylineSegments(myPoints);
  const aiSegments = toPolylineSegments(aiPoints);
  const midY = PAD_T + chartH * 0.5;

  const labels = sorted.map((g) => {
    // "5월 11일~17일" → "5/11~"
    const m = g.stats.weekLabel.match(/(\d+)월\s*(\d+)일/);
    if (m) return `${m[1]}/${m[2]}~`;
    return g.stats.weekLabel.slice(0, 5);
  });

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">주차별 적중률 추이</h2>
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <svg width="16" height="2" aria-hidden="true">
              <line x1="0" y1="1" x2="16" y2="1" stroke="currentColor" strokeWidth="2" className="text-brand-500 dark:text-brand-400" />
            </svg>
            나
          </span>
          <span className="flex items-center gap-1">
            <svg width="16" height="2" aria-hidden="true">
              <line x1="0" y1="1" x2="16" y2="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4,2" className="text-gray-400 dark:text-gray-500" />
            </svg>
            AI
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        aria-label="주차별 픽 적중률 추이 차트"
        role="img"
      >
        {/* 50% 기준선 */}
        <line
          x1={PAD_L} y1={midY} x2={W - PAD_R} y2={midY}
          strokeWidth={0.5} strokeDasharray="3,3"
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        {/* AI 선 */}
        {aiSegments.map((pts, i) => (
          <polyline key={`ai-${i}`} points={pts}
            fill="none" strokeWidth={1.5} strokeDasharray="4,3"
            className="stroke-gray-400 dark:stroke-gray-500"
          />
        ))}
        {/* 내 적중률 선 */}
        {mySegments.map((pts, i) => (
          <polyline key={`my-${i}`} points={pts}
            fill="none" strokeWidth={2}
            className="stroke-brand-500 dark:stroke-brand-400"
          />
        ))}
        {/* 내 적중률 점 */}
        {myPoints.map((pt, i) =>
          pt.y !== null ? (
            <circle key={i} cx={pt.x} cy={pt.y} r={3}
              className="fill-brand-500 dark:fill-brand-400"
            />
          ) : null
        )}
        {/* x축 레이블 */}
        {labels.map((label, i) => (
          <text key={i}
            x={myPoints[i].x} y={H - 4}
            textAnchor="middle" fontSize={8}
            className="fill-gray-400 dark:fill-gray-500"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}
