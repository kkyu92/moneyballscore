import { shortTeamName, type TeamCode } from '@moneyball/shared';
import { TeamLogo } from './TeamLogo';
import type { WeatherSlot } from '@/lib/weather';

interface MiniGameCardProps {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  gameTime: string;       // "HH:MM"
  stadium?: string | null;
  weather?: WeatherSlot | null;
}

/**
 * 홈 empty-state "다음 경기 일정" 에서 사용하는 컴팩트 카드.
 * PredictionCard 와 달리 예측 지표 없이 기본 정보만.
 * 돔구장(WO 고척)이어도 외부 기온 관람객 정보로 유용 → 날씨 표시 유지.
 */
export function MiniGameCard({
  homeTeam,
  awayTeam,
  gameTime,
  stadium,
  weather,
}: MiniGameCardProps) {
  return (
    <div className="bg-white dark:bg-[var(--color-surface)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {gameTime}
        </span>
        {stadium && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {stadium}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamLogo team={awayTeam} size={32} />
          <span className="text-sm font-medium truncate">
            {shortTeamName(awayTeam)}
          </span>
        </div>

        <span className="text-xs text-gray-400 dark:text-gray-500 px-2">vs</span>

        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold truncate text-right">
            {shortTeamName(homeTeam)}
          </span>
          <span
            aria-label="홈팀"
            title="홈팀"
            className="text-[9px] font-bold px-1 py-0.5 rounded text-brand-700 dark:text-brand-300 bg-brand-100 dark:bg-brand-900/40"
          >
            홈
          </span>
          <TeamLogo team={homeTeam} size={32} />
        </div>
      </div>

      {/* 날씨 — 돔구장 포함 일관 표시. 데이터 없으면 줄 생략. */}
      {weather && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-[var(--color-border)] text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <span aria-hidden="true">{weather.icon}</span>
          <span className="font-medium">{weather.tempC}°C</span>
          <span className="text-gray-400 dark:text-gray-500">·</span>
          <span>{weather.label}</span>
          {weather.precipPct > 0 && (
            <>
              <span className="text-gray-400 dark:text-gray-500">·</span>
              <span>강수 {weather.precipPct}%</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
