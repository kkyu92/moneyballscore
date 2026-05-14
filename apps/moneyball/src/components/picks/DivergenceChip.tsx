import Link from 'next/link';
import { shortTeamName, type TeamCode } from '@moneyball/shared';

function eulReul(name: string): string {
  const code = name.charCodeAt(name.length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 !== 0 ? '을' : '를';
  }
  return '를';
}

export interface DivergenceGame {
  gameId: number;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  aiHomePct: number;
  communityHomePct: number;
  communityTotal: number;
}

interface Props {
  game: DivergenceGame;
}

export function DivergenceChip({ game }: Props) {
  const homeName = shortTeamName(game.homeTeam) ?? game.homeTeam;
  const awayName = shortTeamName(game.awayTeam) ?? game.awayTeam;
  const delta = Math.abs(game.aiHomePct - game.communityHomePct);

  // Determine which side each party favors
  const aiSide = game.aiHomePct >= 50 ? homeName : awayName;
  const communitySide = game.communityHomePct >= 50 ? homeName : awayName;
  const communityPct = game.communityHomePct >= 50 ? game.communityHomePct : 100 - game.communityHomePct;
  const aiPct = game.aiHomePct >= 50 ? game.aiHomePct : 100 - game.aiHomePct;

  if (delta < 20 || game.communityTotal < 3) return null;

  return (
    <Link
      href={`/analysis/game/${game.gameId}`}
      className="flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-sm hover:bg-accent/15 transition-colors"
    >
      <span className="text-accent dark:text-accent-light shrink-0 text-base">⚡</span>
      <span className="text-gray-700 dark:text-gray-200 min-w-0">
        <span className="font-semibold text-accent dark:text-accent-light">{communitySide}</span>
        {eulReul(communitySide)} 커뮤니티 {communityPct}% 픽 — AI는{' '}
        <span className="font-semibold">{aiSide}</span> {aiPct}% 예측
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">({game.communityTotal}명)</span>
      </span>
      <span className="shrink-0 text-xs text-accent dark:text-accent-light ml-auto">분석 →</span>
    </Link>
  );
}
