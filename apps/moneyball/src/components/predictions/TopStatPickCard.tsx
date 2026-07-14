import Link from 'next/link';
import { KBO_FACTOR_COUNT, shortTeamName, winnerProbOf, ELO_NEUTRAL_WIN_PCT, type TeamCode } from '@moneyball/shared';
import { TeamLogo } from '../shared/TeamLogo';

interface TopStatPickCardProps {
  gameId: number;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  homeWinProb: number;
  date: string;
}

export function TopStatPickCard({ gameId, homeTeam, awayTeam, homeWinProb, date }: TopStatPickCardProps) {
  const winProb = winnerProbOf(homeWinProb);
  const isHomeFavored = homeWinProb >= ELO_NEUTRAL_WIN_PCT;
  const favoredTeam = isHomeFavored ? homeTeam : awayTeam;
  const underdogTeam = isHomeFavored ? awayTeam : homeTeam;
  const pct = Math.round(winProb * 100);

  return (
    <section
      aria-labelledby="top-stat-pick-title"
      className="bg-gradient-to-r from-brand-800 to-brand-700 rounded-2xl p-6 md:p-8 text-white"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-brand-300 text-sm">{date}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent-light)] border border-[var(--color-accent)]/30 font-medium">
          통계 모델 추천 픽
        </span>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <TeamLogo team={favoredTeam} size={48} className="opacity-95" />
          <div>
            <h2 id="top-stat-pick-title" className="text-3xl md:text-4xl font-bold leading-none">
              {shortTeamName(favoredTeam)}
            </h2>
            <p className="text-brand-300 text-sm mt-0.5">승리 예측</p>
          </div>
        </div>
        <span className="text-brand-400 text-sm font-medium mx-1">vs</span>
        <div className="flex items-center gap-2 opacity-60">
          <TeamLogo team={underdogTeam} size={36} />
          <span className="text-xl font-semibold text-brand-200">{shortTeamName(underdogTeam)}</span>
        </div>
        <span className="text-2xl font-bold ml-auto text-[var(--color-accent-light)]">
          {pct}%
        </span>
      </div>

      <p className="text-brand-200 text-sm mb-4">세이버메트릭스 {KBO_FACTOR_COUNT}팩터 정량 분석</p>

      <Link
        href={`/analysis/game/${gameId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent-light)] hover:text-white transition-colors duration-[var(--motion-fast)]"
        aria-label={`${shortTeamName(favoredTeam)} vs ${shortTeamName(underdogTeam)} 팩터 분석 보기`}
      >
        팩터 분석 보기 →
      </Link>
    </section>
  );
}
