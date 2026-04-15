interface FactorError {
  factor: string;
  predictedBias: number; // -0.5 ~ +0.5
  diagnosis?: string;
}

interface FactorErrorsBarsProps {
  errors: FactorError[];
}

/**
 * v4-4 factor 편향 시각화 — postview에서 사용.
 *
 * Design 리뷰 D4: 색 코딩
 *   홈 유리 편향(+) → var(--color-factor-favor) 녹색
 *   원정 유리 편향(-) → var(--color-factor-against) 오렌지
 *
 * a11y: 각 막대 aria-label 포함
 */
export function FactorErrorsBars({ errors }: FactorErrorsBarsProps) {
  if (errors.length === 0) {
    return (
      <p className="text-xs text-gray-500 italic">factor 분석 데이터 없음</p>
    );
  }

  // 최대 편향 절댓값 기준으로 막대 길이 정규화 (최대 0.5)
  const maxAbs = Math.max(
    ...errors.map((e) => Math.abs(e.predictedBias)),
    0.05
  );

  return (
    <div className="space-y-3">
      {errors.map((err) => {
        const bias = err.predictedBias;
        const isHomeFavor = bias > 0;
        const widthPct = Math.min(100, (Math.abs(bias) / maxAbs) * 100);
        const color = isHomeFavor
          ? 'bg-[var(--color-factor-favor)]'
          : 'bg-[var(--color-factor-against)]';
        const biasLabel = bias >= 0 ? `+${bias.toFixed(2)}` : bias.toFixed(2);

        return (
          <div key={err.factor} className="text-xs">
            <div className="flex justify-between items-baseline mb-1">
              <span className="font-mono font-medium text-gray-700">
                {err.factor}
              </span>
              <span
                className={`font-mono ${
                  isHomeFavor
                    ? 'text-[var(--color-factor-favor)]'
                    : 'text-[var(--color-factor-against)]'
                }`}
              >
                {biasLabel}
              </span>
            </div>
            <div
              className="bg-gray-100 rounded-full h-2 overflow-hidden"
              role="img"
              aria-label={`${err.factor} 편향 ${biasLabel}, ${
                isHomeFavor ? '홈팀 유리' : '원정팀 유리'
              }`}
            >
              <div
                className={`h-full rounded-full transition-all ${color}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            {err.diagnosis && (
              <p className="text-gray-500 mt-1">{err.diagnosis}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
