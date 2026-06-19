import { josa, shortTeamName, type TeamCode } from '@moneyball/shared';
import { explainFactor, type FactorRawDetails } from '@/lib/analysis/factor-explanations';
import { FACTOR_LABELS_TECHNICAL } from '@/lib/predictions/factorLabels';

const SUMMARY_FACTOR_KEYS = ['sp_fip', 'lineup_woba', 'elo', 'recent_form'] as const;

interface GameAnalysisProseProps {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  homeWinProb: number;
  factors: Record<string, number>;
  details: FactorRawDetails;
}

export function GameAnalysisProse({
  homeTeam,
  awayTeam,
  homeWinProb,
  factors,
  details,
}: GameAnalysisProseProps) {
  const homeName = shortTeamName(homeTeam);
  const awayName = shortTeamName(awayTeam);

  const explain = (key: string) =>
    explainFactor({ key, factorValue: factors[key] ?? 0.5, details, homeTeamName: homeName, awayTeamName: awayName });

  const pitching = ['sp_fip', 'sp_xfip', 'bullpen_fip']
    .filter((k) => k in factors)
    .map(explain)
    .filter((e) => e.narrative)
    .map((e) => e.narrative);

  const batting = ['lineup_woba', 'war', 'recent_form', 'elo']
    .filter((k) => k in factors)
    .map(explain)
    .filter((e) => e.narrative)
    .map((e) => e.narrative);

  const situational = ['head_to_head', 'park_factor', 'sfr']
    .filter((k) => k in factors)
    .map(explain)
    .filter((e) => e.narrative)
    .map((e) => e.narrative);

  const favored = homeWinProb > 0.5 ? homeName : awayName;
  const marginPp = Math.round(Math.abs(homeWinProb - 0.5) * 200);
  const confidenceLabel =
    marginPp < 10 ? '박빙의 접전' : marginPp < 20 ? '소폭 우위' : '명확한 우위';

  if (pitching.length === 0 && batting.length === 0 && situational.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="prose-summary-title"
      className="bg-gray-50 dark:bg-[var(--color-surface-card)] rounded-xl p-5 space-y-3 text-sm text-gray-700 dark:text-gray-200 leading-relaxed"
    >
      <h2
        id="prose-summary-title"
        className="text-base font-bold text-gray-900 dark:text-gray-100"
      >
        AI 종합 분석 요약
      </h2>

      {pitching.length > 0 && (
        <p>
          <span className="font-medium">투수진 비교 — </span>
          {pitching.join(' ')}
        </p>
      )}

      {batting.length > 0 && (
        <p>
          <span className="font-medium">타격·전력 비교 — </span>
          {batting.join(' ')}
        </p>
      )}

      {situational.length > 0 && (
        <p>
          <span className="font-medium">부가 변수 — </span>
          {situational.join(' ')}
        </p>
      )}

      <p>
        10개 세이버메트릭스 팩터를 종합한 정량 모델은 {confidenceLabel}으로{' '}
        {favored}
        {josa(favored, '이', '가')} {marginPp > 0 ? `${marginPp}%p 앞선다` : '팽팽하다'}고 평가한다.
        {SUMMARY_FACTOR_KEYS.map((k) => FACTOR_LABELS_TECHNICAL[k]).join('·')}을 가중합산한 결과이며, 당일 선발 변경이나 돌발 변수는 반영되지 않는다.
      </p>
    </section>
  );
}
