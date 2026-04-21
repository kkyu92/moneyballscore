import {
  getConfidenceColor,
  shortTeamName,
  type TeamCode,
} from "@moneyball/shared";
import { AnalysisLink } from "../shared/AnalysisLink";
import { TeamLogo } from "../shared/TeamLogo";
import type { WeatherSlot } from "@/lib/weather";

interface PredictionCardProps {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  confidence: number;
  predictedWinner: TeamCode;
  winProb?: number; // 예측 승자의 승리 확률 (0-1)
  homeSPName?: string;
  awaySPName?: string;
  homeSPFip?: number;
  awaySPFip?: number;
  homeWoba?: number;
  awayWoba?: number;
  gameTime?: string;
  isCorrect?: boolean | null;
  homeScore?: number | null;
  awayScore?: number | null;
  gameId?: number; // v4-4: AnalysisLink 용
  isBigMatch?: boolean; // v4-4: 빅매치 뱃지 + 금색 테두리 강조
  stadium?: string | null;
  weather?: WeatherSlot | null;
  status?: string | null; // scheduled / live / final / postponed — DB games.status
}

export function PredictionCard({
  homeTeam,
  awayTeam,
  confidence,
  predictedWinner,
  homeSPName,
  awaySPName,
  homeSPFip,
  awaySPFip,
  homeWoba,
  awayWoba,
  gameTime,
  isCorrect,
  homeScore,
  awayScore,
  winProb,
  gameId,
  isBigMatch = false,
  stadium,
  weather,
  status,
}: PredictionCardProps) {
  const isLive = status === 'live';
  const isFinal = status === 'final';
  const isPostponed = status === 'postponed';
  // winProb = 예측 승자의 승리 확률. DB predicted_winner 기준으로 표시.
  // debate가 50% 미만으로 낮춰도 predicted_winner는 유지 (적중 판정 일관성)
  const displayPct = winProb
    ? Math.round(winProb * 100)
    : Math.round((0.5 + confidence / 2) * 100);
  const confidencePct = displayPct;

  const cardClass = isBigMatch
    ? "bg-white dark:bg-[var(--color-surface-card)] rounded-xl border-2 border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/30 p-5 hover:shadow-lg transition-shadow relative"
    : isLive
      ? "bg-white dark:bg-[var(--color-surface-card)] rounded-xl border-2 border-red-400 dark:border-red-600 ring-1 ring-red-300/40 dark:ring-red-700/40 p-5 hover:shadow-md transition-shadow"
      : "bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 hover:shadow-md transition-shadow";

  return (
    <div className={cardClass}>
      {/* v4-4 빅매치 뱃지 */}
      {isBigMatch && (
        <div className="absolute -top-2.5 left-4 bg-[var(--color-accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          ⭐ 오늘의 빅매치
        </div>
      )}

      {/* 상단: 경기 시간 + 상태 배지 + 적중 결과 */}
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">{gameTime ?? "18:30"}</span>
          {isLive && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 px-1.5 py-0.5 rounded-full"
              aria-label="진행 중"
            >
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              진행 중
            </span>
          )}
          {isFinal && (
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
              종료
            </span>
          )}
          {isPostponed && (
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
              우천취소
            </span>
          )}
        </div>
        {isCorrect !== null && isCorrect !== undefined && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isCorrect
                ? "bg-green-100 dark:bg-green-900/30 text-green-700"
                : "bg-red-100 dark:bg-red-900/30 text-red-700"
            }`}
          >
            {isCorrect ? "적중" : "실패"}
          </span>
        )}
      </div>
      {(stadium || weather) && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
          {stadium && <span>{stadium}</span>}
          {stadium && weather && (
            <span className="text-gray-300 dark:text-gray-600">·</span>
          )}
          {weather && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">{weather.icon}</span>
              <span>{weather.tempC}°C</span>
              {weather.precipPct > 0 && (
                <span className="text-gray-400 dark:text-gray-500">
                  · 강수 {weather.precipPct}%
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* 팀 매치업 — away 왼쪽, home 오른쪽 (KBO 관례) */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-center flex-1">
          <div className="flex justify-center mb-1">
            <TeamLogo team={awayTeam} size={40} />
          </div>
          <p className="text-sm font-medium">{shortTeamName(awayTeam)}</p>
          {awayScore !== null && awayScore !== undefined && (
            <p className="text-2xl font-bold mt-1">{awayScore}</p>
          )}
        </div>

        <div className="px-4 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500">VS</span>
          <div className="mt-1">
            <span
              className={`text-lg font-bold ${getConfidenceColor(confidencePct)}`}
            >
              {confidencePct}%
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {shortTeamName(predictedWinner)} 승 예측
          </p>
        </div>

        <div className="text-center flex-1">
          <div className="flex justify-center mb-1">
            <TeamLogo team={homeTeam} size={40} />
          </div>
          <p className="text-sm font-semibold inline-flex items-center gap-1.5 justify-center">
            {shortTeamName(homeTeam)}
            <span
              aria-label="홈팀"
              title="홈팀"
              className="text-[9px] font-bold px-1 py-0.5 rounded text-brand-700 dark:text-brand-300 bg-brand-100 dark:bg-brand-900/40"
            >
              홈
            </span>
          </p>
          {homeScore !== null && homeScore !== undefined && (
            <p className="text-2xl font-bold mt-1">{homeScore}</p>
          )}
        </div>
      </div>

      {/* 핵심 지표 */}
      <div className="border-t border-gray-100 dark:border-[var(--color-border)] pt-3 grid grid-cols-2 gap-2 text-sm">
        {homeSPName && awaySPName && (
          <div className="col-span-2 flex justify-between text-gray-600 dark:text-gray-300">
            <span>
              선발: {awaySPName}
              {awaySPFip != null && (
                <span className="text-gray-400 dark:text-gray-500"> FIP {awaySPFip}</span>
              )}
            </span>
            <span>
              {homeSPName}
              {homeSPFip != null && (
                <span className="text-gray-400 dark:text-gray-500"> FIP {homeSPFip}</span>
              )}
            </span>
          </div>
        )}
        {homeWoba != null && awayWoba != null && (
          <div className="col-span-2 flex justify-between text-gray-600 dark:text-gray-300">
            <span>
              타선 wOBA <span className="font-mono">{awayWoba.toFixed(3)}</span>
            </span>
            <span>
              <span className="font-mono">{homeWoba.toFixed(3)}</span> wOBA
            </span>
          </div>
        )}
      </div>

      {/* v4-4: 상세 분석 링크 */}
      {gameId != null && (
        <div className="border-t border-gray-100 dark:border-[var(--color-border)] pt-3 mt-3 text-center">
          <AnalysisLink gameId={gameId} label="AI 분석 보기" variant="subtle" />
        </div>
      )}
    </div>
  );
}
