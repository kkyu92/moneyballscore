import { KBO_TEAMS, type TeamCode } from '@moneyball/shared';
import { TeamLogo } from '../shared/TeamLogo';

interface JudgeVerdictPanelProps {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  predictedWinner: TeamCode;
  homeWinProb: number; // 0 ~ 1
  confidence: number;   // 0 ~ 1
  reasoning: string;
  calibrationApplied?: string | null;
}

/**
 * v4-4 심판 판정 패널 — /analysis/game/[id] 최상단에 배치.
 *
 * Design 리뷰 Pass 1: 사용자가 가장 먼저 보고 싶은 "AI 최종 판단"을 맨 위.
 * 핵심 숫자(홈 승리 %)가 가장 큰 시각 anchor.
 */
export function JudgeVerdictPanel({
  homeTeam,
  awayTeam,
  predictedWinner,
  homeWinProb,
  confidence,
  reasoning,
  calibrationApplied,
}: JudgeVerdictPanelProps) {
  const winnerTeam = KBO_TEAMS[predictedWinner];
  const homePct = Math.round(homeWinProb * 100);
  const awayPct = 100 - homePct;
  const isHomeWinner = predictedWinner === homeTeam;
  const confPct = Math.round(confidence * 100);

  return (
    <section
      aria-labelledby="judge-verdict-title"
      className="bg-gradient-to-br from-[var(--color-bg-hero-start)] to-[var(--color-bg-hero-end)] rounded-2xl p-6 md:p-8 text-white shadow-xl"
    >
      <header className="flex items-center justify-between mb-4">
        <h2 id="judge-verdict-title" className="text-sm font-medium text-brand-200">
          🎯 AI 심판 최종 판정
        </h2>
        <span className="text-xs text-brand-300">
          판정 신뢰도 {confPct}%
        </span>
      </header>

      <div className="flex items-center justify-center gap-3 md:gap-6 mb-6">
        <div className="text-center flex-1 max-w-[30%]">
          <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 rounded-full overflow-hidden border-2 border-white/30 bg-white/5">
            <TeamLogo team={awayTeam} size={64} className="w-full h-full" />
          </div>
          <p className="text-sm text-brand-200">{KBO_TEAMS[awayTeam].name}</p>
          <p
            className="text-2xl md:text-3xl font-bold mt-1"
            aria-label={`${KBO_TEAMS[awayTeam].name} 승리 확률 ${awayPct}%`}
          >
            {awayPct}%
          </p>
        </div>

        <div className="text-2xl md:text-3xl font-bold text-brand-300">vs</div>

        <div className="text-center flex-1 max-w-[30%]">
          <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 rounded-full overflow-hidden border-2 border-white/30 bg-white/5">
            <TeamLogo team={homeTeam} size={64} className="w-full h-full" />
          </div>
          <p className="text-sm text-brand-200">{KBO_TEAMS[homeTeam].name}</p>
          <p
            className="text-2xl md:text-3xl font-bold mt-1"
            aria-label={`${KBO_TEAMS[homeTeam].name} 승리 확률 ${homePct}%`}
          >
            {homePct}%
          </p>
        </div>
      </div>

      <div className="text-center mb-4">
        <div className="inline-block bg-white/10 rounded-full px-4 py-1">
          <p className="text-sm text-brand-200">
            예측 승자: <span className="font-bold text-white">{winnerTeam.name}</span>
            {isHomeWinner ? ' (홈)' : ' (원정)'}
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
