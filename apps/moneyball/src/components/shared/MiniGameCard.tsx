import { KBO_TEAMS, type TeamCode } from '@moneyball/shared';
import { TeamLogo } from './TeamLogo';
import type { WeatherSlot } from '@/lib/weather';

interface MiniGameCardProps {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  gameTime: string;       // "HH:MM"
  stadium?: string | null;
  weather?: WeatherSlot | null;
  /**
   * 돔구장 여부. 날씨 표기 억제용 — 고척(WO) 홈경기는 기후 무관.
   */
  isDome?: boolean;
}

/**
 * 홈 empty-state "다음 경기 일정" 에서 사용하는 컴팩트 카드.
 * PredictionCard 와 달리 예측 지표 없이 기본 정보만.
 */
export function MiniGameCard({
  homeTeam,
  awayTeam,
  gameTime,
  stadium,
  weather,
  isDome,
}: MiniGameCardProps) {
  const home = KBO_TEAMS[homeTeam];
  const away = KBO_TEAMS[awayTeam];

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
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
            {away.name.split(' ')[0]}
          </span>
        </div>

        <span className="text-xs text-gray-400 dark:text-gray-500 px-2">vs</span>

        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-medium truncate text-right">
            {home.name.split(' ')[0]}
          </span>
          <TeamLogo team={homeTeam} size={32} />
        </div>
      </div>

      {/* 날씨 — 돔구장은 기후 무관, 날씨 데이터 없으면 줄 생략 */}
      {!isDome && weather && (
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

      {isDome && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-[var(--color-border)] text-xs text-gray-500 dark:text-gray-400">
          🏟 돔구장 (기후 영향 없음)
        </div>
      )}
    </div>
  );
}
