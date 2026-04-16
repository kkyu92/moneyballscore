import { KBO_TEAMS, getConfidenceColor, type TeamCode } from "@moneyball/shared";
import { AnalysisLink } from "../shared/AnalysisLink";
import { TeamLogo } from "../shared/TeamLogo";

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
}: PredictionCardProps) {
  const home = KBO_TEAMS[homeTeam];
  const away = KBO_TEAMS[awayTeam];
  // winProb이 있으면 승리확률 표시, 없으면 confidence fallback
  // 토론 결과로 확률이 50% 미만이면 반대팀이 실질 승자
  const debateFlipped = winProb != null && winProb < 0.5;
  const effectiveWinner = debateFlipped
    ? (predictedWinner === homeTeam ? awayTeam : homeTeam)
    : predictedWinner;
  const displayPct = winProb
    ? Math.round((debateFlipped ? 1 - winProb : winProb) * 100)
    : Math.round((0.5 + confidence / 2) * 100);
  const confidencePct = displayPct;

  const cardClass = isBigMatch
    ? "bg-white dark:bg-[var(--color-surface-card)] rounded-xl border-2 border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/30 p-5 hover:shadow-lg transition-shadow relative"
    : "bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 hover:shadow-md transition-shadow";

  return (
    <div className={cardClass}>
      {/* v4-4 빅매치 뱃지 */}
      {isBigMatch && (
        <div className="absolute -top-2.5 left-4 bg-[var(--color-accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          ⭐ 오늘의 빅매치
        </div>
      )}

      {/* 상단: 경기 시간 + 적중 결과 */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs text-gray-500 dark:text-gray-400">{gameTime ?? "18:30"}</span>
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

      {/* 팀 매치업 — away 왼쪽, home 오른쪽 (KBO 관례) */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-center flex-1">
          <div className="flex justify-center mb-1">
            <TeamLogo team={awayTeam} size={40} />
          </div>
          <p className="text-sm font-medium">{away.name.split(" ")[0]}</p>
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
            {KBO_TEAMS[effectiveWinner].name.split(" ")[0]} 승 예측
          </p>
        </div>

        <div className="text-center flex-1">
          <div className="flex justify-center mb-1">
            <TeamLogo team={homeTeam} size={40} />
          </div>
          <p className="text-sm font-medium">{home.name.split(" ")[0]}</p>
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
