import type { LeaderboardEntry } from '@/lib/leaderboard/types';

interface Props {
  entries: LeaderboardEntry[];
  periodLabel: string;
}

type MedalRank = 1 | 2 | 3;

const MEDAL_LABEL: Record<MedalRank, string> = {
  1: '1위',
  2: '2위',
  3: '3위',
};

/**
 * cycle 1021 c10 (Tier 1 carry-over B): Hall of Fame 섹션 — 현재 active tab 의
 * top 3 medal display. SVG 인라인 메달 (gold / silver / brand). DESIGN.md brand-* +
 * accent token 정합. emoji 사용자 명시 허가 wait — svg 안전 path.
 *
 * 0 entries 시 section hide (defensive). top 1~3 누락 (entries < 3) 시도 안전:
 * available 분만 노출.
 */
export function HallOfFame({ entries, periodLabel }: Props) {
  if (entries.length === 0) return null;
  const top3 = entries.slice(0, 3);

  return (
    <section
      aria-labelledby="hall-of-fame-heading"
      className="bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/30 dark:to-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 rounded-xl p-5"
    >
      <h2
        id="hall-of-fame-heading"
        className="text-base font-bold text-brand-800 dark:text-brand-200 mb-1"
      >
        명예의 전당
      </h2>
      <p className="text-xs text-brand-700/70 dark:text-brand-300/70 mb-4">
        {periodLabel} 적중률 TOP {top3.length}
      </p>
      <ol className="grid grid-cols-3 gap-3" role="list">
        {top3.map((entry, idx) => {
          const rank = (idx + 1) as MedalRank;
          return (
            <li
              key={entry.device_id}
              className={`flex flex-col items-center text-center rounded-lg px-2 py-3 ${podiumBg(rank)}`}
            >
              <Medal rank={rank} />
              <p
                className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-100 truncate max-w-full"
                title={entry.nickname}
              >
                {entry.nickname}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {MEDAL_LABEL[rank]}
              </p>
              <p className="text-lg font-bold tabular-nums text-brand-700 dark:text-brand-300 mt-1">
                {entry.accuracy_pct}%
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                {entry.correct}/{entry.total}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function podiumBg(rank: MedalRank): string {
  switch (rank) {
    case 1:
      return 'bg-accent/10 dark:bg-accent/15';
    case 2:
      return 'bg-brand-100/60 dark:bg-brand-800/40';
    case 3:
      return 'bg-brand-50 dark:bg-brand-900/30';
  }
}

/**
 * SVG inline medal — circle + ribbon + 등수 숫자.
 * - rank 1 → gold (accent / accent-light)
 * - rank 2 → silver (brand-300 / brand-200 — DESIGN.md 정합)
 * - rank 3 → bronze (brand-600 / brand-500)
 * 외부 hex 사용 X. fill/stroke 는 CSS variable (`var(--color-*)`).
 */
function Medal({ rank }: { rank: MedalRank }) {
  const meta = MEDAL_META[rank];
  return (
    <svg
      width="48"
      height="60"
      viewBox="0 0 48 60"
      role="img"
      aria-label={`${MEDAL_LABEL[rank]} 메달`}
      className="drop-shadow-sm"
    >
      {/* ribbon — 좌우 두 갈래 */}
      <path
        d={`M 14 4 L 20 32 L 24 28 L 28 32 L 34 4 Z`}
        fill={meta.ribbon}
        opacity="0.85"
      />
      {/* outer circle */}
      <circle
        cx="24"
        cy="42"
        r="14"
        fill={meta.fillOuter}
        stroke={meta.stroke}
        strokeWidth="1.5"
      />
      {/* inner circle */}
      <circle cx="24" cy="42" r="10" fill={meta.fillInner} />
      {/* 등수 숫자 */}
      <text
        x="24"
        y="46"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill={meta.textColor}
        fontFamily="system-ui, sans-serif"
      >
        {rank}
      </text>
    </svg>
  );
}

const MEDAL_META: Record<
  MedalRank,
  {
    fillOuter: string;
    fillInner: string;
    stroke: string;
    ribbon: string;
    textColor: string;
  }
> = {
  1: {
    // gold — accent (#c5a23e) / accent-light (#e2c96b)
    fillOuter: 'var(--color-accent-light, #e2c96b)',
    fillInner: 'var(--color-accent, #c5a23e)',
    stroke: 'var(--color-accent, #c5a23e)',
    ribbon: 'var(--color-accent, #c5a23e)',
    textColor: 'var(--color-brand-900, #0a1f12)',
  },
  2: {
    // silver — brand-200 / brand-300
    fillOuter: 'var(--color-brand-200, #8dcea0)',
    fillInner: 'var(--color-brand-300, #5aad70)',
    stroke: 'var(--color-brand-300, #5aad70)',
    ribbon: 'var(--color-brand-300, #5aad70)',
    textColor: 'var(--color-brand-900, #0a1f12)',
  },
  3: {
    // bronze — brand-500 / brand-600
    fillOuter: 'var(--color-brand-500, #2d6b3f)',
    fillInner: 'var(--color-brand-600, #245232)',
    stroke: 'var(--color-brand-600, #245232)',
    ribbon: 'var(--color-brand-600, #245232)',
    textColor: '#ffffff',
  },
};
