'use client';

import { shortTeamName, type TeamCode } from '@moneyball/shared';
import { useUserPicks } from '@/hooks/use-user-picks';

interface Props {
  gameId: number;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
}

export function PickButton({ gameId, homeTeam, awayTeam }: Props) {
  const { getPick, setPick } = useUserPicks();
  const current = getPick(gameId);

  const homeName = shortTeamName(homeTeam) ?? homeTeam;
  const awayName = shortTeamName(awayTeam) ?? awayTeam;

  const base =
    'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
  const active = 'bg-brand-500 dark:bg-brand-400 text-white border-transparent';
  const idle =
    'border-gray-200 dark:border-[var(--color-border)] text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-300';

  return (
    <div className="flex items-center gap-2 mt-2 px-1">
      <span className="text-xs text-gray-400 dark:text-gray-400 shrink-0">내 픽</span>
      <button
        type="button"
        onClick={() => setPick(gameId, 'away')}
        className={`${base} ${current?.pick === 'away' ? active : idle}`}
        aria-pressed={current?.pick === 'away'}
        aria-label={`${awayName} 원정팀 픽`}
      >
        {awayName} 원정
      </button>
      <button
        type="button"
        onClick={() => setPick(gameId, 'home')}
        className={`${base} ${current?.pick === 'home' ? active : idle}`}
        aria-pressed={current?.pick === 'home'}
        aria-label={`${homeName} 홈팀 픽`}
      >
        {homeName} 홈
      </button>
    </div>
  );
}
