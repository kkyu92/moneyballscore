import Link from 'next/link';

interface AnalysisLinkProps {
  gameId: number;
  label?: string;
  variant?: 'default' | 'subtle' | 'primary';
}

/**
 * v4-4: 경기 상세 분석 링크 재사용 컴포넌트.
 * PredictionCard, BigMatchDebateCard 등에서 공통 사용.
 *
 * 다크모드 + a11y (focus-visible + 44px 터치) 준수.
 */
export function AnalysisLink({
  gameId,
  label = 'AI 분석 보기',
  variant = 'default',
}: AnalysisLinkProps) {
  const baseClass =
    'inline-flex items-center gap-1 text-sm font-medium transition-colors ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-brand-500 rounded min-h-[44px] px-2';

  const variantClass =
    variant === 'primary'
      ? 'text-white bg-brand-600 hover:bg-brand-700 px-4 py-2'
      : variant === 'subtle'
      ? 'text-gray-500 hover:text-brand-600'
      : 'text-brand-600 hover:text-brand-800 hover:underline';

  return (
    <Link
      href={`/analysis/game/${gameId}`}
      className={`${baseClass} ${variantClass}`}
      aria-label={`경기 ${gameId}의 ${label}`}
    >
      {label}
      <span aria-hidden="true">→</span>
    </Link>
  );
}
