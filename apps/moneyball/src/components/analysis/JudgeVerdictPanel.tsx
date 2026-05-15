import { KBO_TEAMS, type TeamCode } from '@moneyball/shared';
import { TeamLogo } from '../shared/TeamLogo';
import { QuantOnlyBadge } from '../shared/QuantOnlyBadge';

interface JudgeVerdictPanelProps {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  predictedWinner: TeamCode;
  homeWinProb: number; // 0 ~ 1 (DB 저장 단위)
  confidence: number;   // 0 ~ 1
  reasoning: string;
  calibrationApplied?: string | null;
  isQuantOnlyFallback?: boolean;
}

/**
 * v4-4 심판 판정 패널 — /analysis/game/[id] 최상단에 배치.
 *
 * 예측 승자 적중 확률을 단일 anchor 로 노출.
 * "홈팀이 이길 확률" 이 아니라 "우리 예측이 맞을 확률" 관점.
 */
export function JudgeVerdictPanel({
  homeTeam,
  awayTeam,
  predictedWinner,
  homeWinProb,
  confidence,
  reasoning,
  calibrationApplied,
  isQuantOnlyFallback = false,
}: JudgeVerdictPanelProps) {
  const winnerTeam = KBO_TEAMS[predictedWinner];
  const isHomeWinner = predictedWinner === homeTeam;
  // 예측 승자 적중 확률 = max(hwp, 1-hwp)
  const winnerProb = Math.max(homeWinProb, 1 - homeWinProb);
  const winnerPct = Math.round(winnerProb * 100);
  const confPct = Math.round(confidence * 100);

  return (
    <section
      aria-labelledby="judge-verdict-title"
      className="bg-gradient-to-br from-[var(--color-bg-hero-start)] to-[var(--color-bg-hero-end)] rounded-2xl p-6 md:p-8 text-white shadow-xl"
    >
      <header className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 id="judge-verdict-title" className="text-sm font-medium text-brand-200">
            🎯 AI 심판 최종 판정
          </h2>
          {isQuantOnlyFallback && <QuantOnlyBadge variant="dark" />}
        </div>
        <span className="text-xs text-brand-300">
          판정 신뢰도 {confPct}%
        </span>
      </header>

      <div className="flex items-center justify-center gap-3 md:gap-6 mb-6">
        <div className="text-center flex-1 max-w-[30%] opacity-60">
          <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 rounded-full overflow-hidden border-2 border-white/20 bg-white/5">
            <TeamLogo team={awayTeam} size={64} className="w-full h-full" />
          </div>
          <p className="text-sm text-brand-200">{KBO_TEAMS[awayTeam].name}</p>
          <p className="text-xs text-brand-300 mt-1">원정</p>
        </div>

        <div className="text-2xl md:text-3xl font-bold text-brand-300">vs</div>

        <div className="text-center flex-1 max-w-[30%] opacity-60">
          <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 rounded-full overflow-hidden border-2 border-white/20 bg-white/5">
            <TeamLogo team={homeTeam} size={64} className="w-full h-full" />
          </div>
          <p className="text-sm text-brand-200">{KBO_TEAMS[homeTeam].name}</p>
          <p className="text-xs text-brand-300 mt-1">홈</p>
        </div>
      </div>

      {/* 예측 승자 + 적중 확률 (단일 anchor) */}
      <div className="text-center mb-4">
        <div
          className="inline-block bg-white/10 rounded-2xl px-6 py-4 border border-white/20"
          aria-label={`예측 승자 ${winnerTeam.name}, 적중 확률 ${winnerPct}%`}
        >
          <p className="text-xs text-brand-200 mb-1">
            예측 승자 {isHomeWinner ? '(홈)' : '(원정)'}
          </p>
          <p className="text-3xl md:text-4xl font-bold">
            {winnerTeam.name} <span className="text-brand-300">{winnerPct}%</span>
          </p>
        </div>
      </div>

      {reasoning && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
            {reasoning}
          </p>
        </div>
      )}

      {calibrationApplied && (
        <p className="text-xs text-brand-300 mt-3 italic">
          보정 적용: {calibrationApplied}
        </p>
      )}
    </section>
  );
}
