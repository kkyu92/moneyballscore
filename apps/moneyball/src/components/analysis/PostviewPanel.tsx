import { FactorErrorsBars } from './FactorErrorsBars';
import { KBO_TEAMS, type TeamCode } from '@moneyball/shared';

interface TeamPostview {
  summary: string;
  keyFactor: string;
  missedBy: string;
}

interface PostviewPanelProps {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  homePostview?: TeamPostview;
  awayPostview?: TeamPostview;
  factorErrors: Array<{
    factor: string;
    predictedBias: number;
    diagnosis?: string;
  }>;
  judgeReasoning: string;
}

/**
 * v4-4 사후 분석 패널 — /analysis/game/[id] 하단 조건부 렌더.
 * post_game row 있는 경기에만 표시.
 *
 * 구성: factorErrors 막대 차트 + 홈/원정 postview + 심판 사후 reasoning
 */
export function PostviewPanel({
  homeTeam,
  awayTeam,
  homePostview,
  awayPostview,
  factorErrors,
  judgeReasoning,
}: PostviewPanelProps) {
  const homeName = KBO_TEAMS[homeTeam].name;
  const awayName = KBO_TEAMS[awayTeam].name;

  return (
    <section
      aria-labelledby="postview-title"
      className="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-200 p-6 md:p-8"
    >
      <header className="mb-6">
        <h2
          id="postview-title"
          className="text-xl font-bold text-brand-800 mb-1"
        >
          ⚡ 사후 분석
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          경기 종료 후 AI가 “무엇을 틀렸나” 진단
        </p>
      </header>

      {/* Factor 편향 차트 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
          Factor 편향 Top {factorErrors.length || 0}
        </h3>
        <FactorErrorsBars errors={factorErrors} />
      </div>

      {/* 양팀 postview — 관례: away 왼쪽 / home 오른쪽 */}
      {(homePostview || awayPostview) && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {awayPostview && (
            <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border-2 border-[var(--color-away)]/40 p-4">
              <h4 className="text-sm font-semibold text-[var(--color-away)] mb-2">
                {awayName} 사후 의견
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-4">
                {awayPostview.summary}
              </p>
              {awayPostview.keyFactor && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">핵심:</span>{' '}
                  {awayPostview.keyFactor}
                </p>
              )}
              {awayPostview.missedBy && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic border-t border-gray-100 dark:border-[var(--color-border)] pt-2 mt-2">
                  놓친 것: {awayPostview.missedBy}
                </p>
              )}
            </div>
          )}
          {homePostview && (
            <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-200 p-4">
              <h4 className="text-sm font-semibold text-brand-700 mb-2">
                {homeName} 사후 의견
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-4">
                {homePostview.summary}
              </p>
              {homePostview.keyFactor && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">핵심:</span>{' '}
                  {homePostview.keyFactor}
                </p>
              )}
              {homePostview.missedBy && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic border-t border-gray-100 dark:border-[var(--color-border)] pt-2 mt-2">
                  놓친 것: {homePostview.missedBy}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 심판 사후 reasoning */}
      {judgeReasoning && (
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-200 p-4">
          <h3 className="text-sm font-semibold text-brand-700 mb-2">
            AI 심판 종합 분석
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {judgeReasoning}
          </p>
        </div>
      )}
    </section>
  );
}
