import { josa, mlbShortTeamName, NEUTRAL_FACTOR, FACTOR_CONTRIBUTION_SCALE, type MlbTeamCode } from '@moneyball/shared';
import { buildMlbGameOverview, type MlbWaterfallBar } from '@moneyball/kbo-data';
import { OVERVIEW_CLOSE_PP, OVERVIEW_DOMINANT_PP } from '@/lib/analysis/factor-explanations';

interface MlbGameOverviewProps {
  homeTeam: MlbTeamCode;
  awayTeam: MlbTeamCode;
  homeWinProb: number;
  bars: MlbWaterfallBar[];
  factorCount: number;
  locale?: 'ko' | 'en';
}

export function MlbGameOverview({ homeTeam, awayTeam, homeWinProb, bars, factorCount, locale = 'ko' }: MlbGameOverviewProps) {
  const homeName = mlbShortTeamName(homeTeam);
  const awayName = mlbShortTeamName(awayTeam);
  const { pitching, batting, situational } = buildMlbGameOverview(bars, homeName, awayName, locale);

  if (pitching.length === 0 && batting.length === 0 && situational.length === 0) {
    return null;
  }

  const favored = homeWinProb >= NEUTRAL_FACTOR ? homeName : awayName;
  const marginPp = Math.round(Math.abs(homeWinProb - NEUTRAL_FACTOR) * FACTOR_CONTRIBUTION_SCALE);

  if (locale === 'en') {
    const confidenceLabel = marginPp <= OVERVIEW_CLOSE_PP ? 'a close contest' : marginPp < OVERVIEW_DOMINANT_PP ? 'a slight edge' : 'a clear edge';
    return (
      <section
        aria-labelledby="mlb-prose-summary-title"
        className="bg-gray-50 dark:bg-[var(--color-surface-card)] rounded-xl p-5 space-y-3 text-sm text-gray-700 dark:text-gray-200 leading-relaxed"
      >
        <h2 id="mlb-prose-summary-title" className="text-base font-bold text-gray-900 dark:text-gray-100">
          AI Analysis Summary
        </h2>

        {pitching.length > 0 && (
          <p>
            <span className="font-medium">Pitching — </span>
            {pitching.join(' ')}
          </p>
        )}

        {batting.length > 0 && (
          <p>
            <span className="font-medium">Batting &amp; Roster — </span>
            {batting.join(' ')}
          </p>
        )}

        {situational.length > 0 && (
          <p>
            <span className="font-medium">Situational — </span>
            {situational.join(' ')}
          </p>
        )}

        <p>
          Combining {factorCount} sabermetric factors, the quantitative model sees {confidenceLabel} with {favored}
          {' '}
          {marginPp > 0 ? `ahead by ${marginPp}pp.` : 'in a dead heat.'}
        </p>
      </section>
    );
  }

  const confidenceLabel = marginPp <= OVERVIEW_CLOSE_PP ? '박빙의 접전' : marginPp < OVERVIEW_DOMINANT_PP ? '소폭 우위' : '명확한 우위';

  return (
    <section
      aria-labelledby="mlb-prose-summary-title"
      className="bg-gray-50 dark:bg-[var(--color-surface-card)] rounded-xl p-5 space-y-3 text-sm text-gray-700 dark:text-gray-200 leading-relaxed"
    >
      <h2 id="mlb-prose-summary-title" className="text-base font-bold text-gray-900 dark:text-gray-100">
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
        {factorCount}개 세이버메트릭스 팩터를 종합한 정량 모델은 {confidenceLabel}으로 {favored}
        {josa(favored, '이', '가')} {marginPp > 0 ? `${marginPp}%p 앞선다` : '팽팽하다'}고 평가한다.
      </p>
    </section>
  );
}
