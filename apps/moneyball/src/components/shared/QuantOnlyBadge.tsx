// cycle 459 fix-incident heavy — AI 토론 fallback (quant-only) 사용자 가시 라벨.
// silent quality drift 차단: 사용자가 fallback 상태인지 명시적으로 인지.
// reasoning 자체는 cycle 450 FALLBACK_USER_TEXT 로 swap 됨 — 본 배지는 추가 signal.

interface QuantOnlyBadgeProps {
  variant?: 'light' | 'dark';
}

export function QuantOnlyBadge({ variant = 'light' }: QuantOnlyBadgeProps) {
  const base =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border';
  const palette =
    variant === 'dark'
      ? 'bg-amber-500/15 text-amber-200 border-amber-300/40'
      : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/60';

  return (
    <span
      className={`${base} ${palette} group relative`}
      tabIndex={0}
      aria-label="AI 토론 일시 중단 — 정량 모델 예측만 사용 중"
    >
      <span aria-hidden>⚠️</span>
      <span>정량 모델만</span>
      <span
        role="tooltip"
        className="absolute left-0 top-full mt-1 z-20 hidden group-hover:block group-focus:block w-56 rounded-md border border-amber-300 bg-white p-2 text-[11px] leading-snug text-gray-700 shadow-lg dark:border-amber-700/60 dark:bg-[var(--color-surface-card)] dark:text-gray-200"
      >
        AI 에이전트 토론이 일시 중단되어 정량 모델 예측만 표시됩니다. 토론 정상화 시 자동 복구됩니다.
      </span>
    </span>
  );
}
