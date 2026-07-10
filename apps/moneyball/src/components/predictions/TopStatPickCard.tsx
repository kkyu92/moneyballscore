import Link from 'next/link';
import { shortTeamName, winnerProbOf, type TeamCode } from '@moneyball/shared';

interface TopStatPickCardProps {
  gameId: number;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  homeWinProb: number;
  date: string;
}

export function TopStatPickCard({ gameId, homeTeam, awayTeam, homeWinProb, date }: TopStatPickCardProps) {
  const winProb = winnerProbOf(homeWinProb);
  const isHomeFavored = homeWinProb >= 0.5;
  const favoredTeam = isHomeFavored ? homeTeam : awayTeam;
  const underdogTeam = isHomeFavored ? awayTeam : homeTeam;
  const pct = Math.round(winProb * 100);

  return (
    <section className="bg-gradient-to-r from-brand-800 to-brand-700 rounded-2xl p-6 md:p-8 text-white">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-brand-300 text-sm">{date}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[#c5a23e]/20 text-[#e2c96b] border border-[#c5a23e]/30 font-medium">
          통계 모델 추천 픽
        </span>
      </div>

      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-3xl md:text-4xl font-bold">{shortTeamName(favoredTeam)}</span>
        <span className="text-brand-300 text-lg">승리 예측</span>
        <span className="text-2xl font-bold text-[#e2c96b] ml-auto">{pct}%</span>
      </div>

      <p className="text-brand-200 text-sm mb-4">
        {shortTeamName(favoredTeam)} vs {shortTeamName(underdogTeam)} — 세이버메트릭스 10팩터 정량 분석
      </p>

      <Link
        href={`/analysis/game/${gameId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#e2c96b] hover:text-white transition-colors"
      >
        팩터 분석 보기 →
      </Link>
    </section>
  );
}
