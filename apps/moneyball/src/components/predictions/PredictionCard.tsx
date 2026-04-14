import { KBO_TEAMS, getConfidenceColor, type TeamCode } from "@moneyball/shared";

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
}: PredictionCardProps) {
  const home = KBO_TEAMS[homeTeam];
  const away = KBO_TEAMS[awayTeam];
  // winProb이 있으면 승리확률 표시, 없으면 confidence fallback
  const displayPct = winProb
    ? Math.round(winProb * 100)
    : Math.round((0.5 + confidence / 2) * 100);
  const confidencePct = displayPct;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* 상단: 경기 시간 + 적중 결과 */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs text-gray-500">{gameTime ?? "18:30"}</span>
        {isCorrect !== null && isCorrect !== undefined && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isCorrect
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isCorrect ? "적중" : "실패"}
          </span>
        )}
      </div>

      {/* 팀 매치업 */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-center flex-1">
          <div
            className="w-10 h-10 rounded-full mx-auto mb-1 flex items-center justify-center text-white font-bold text-xs"
            style={{ backgroundColor: away.color }}
          >
            {awayTeam}
          </div>
          <p className="text-sm font-medium">{away.name.split(" ")[0]}</p>
          {awayScore !== null && awayScore !== undefined && (
            <p className="text-2xl font-bold mt-1">{awayScore}</p>
          )}
        </div>

        <div className="px-4 text-center">
          <span className="text-xs text-gray-400">VS</span>
          <div className="mt-1">
            <span
              className={`text-lg font-bold ${getConfidenceColor(confidencePct)}`}
            >
              {confidencePct}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {KBO_TEAMS[predictedWinner].name.split(" ")[0]} 승 예측
          </p>
        </div>

        <div className="text-center flex-1">
          <div
            className="w-10 h-10 rounded-full mx-auto mb-1 flex items-center justify-center text-white font-bold text-xs"
            style={{ backgroundColor: home.color }}
          >
            {homeTeam}
          </div>
          <p className="text-sm font-medium">{home.name.split(" ")[0]}</p>
          {homeScore !== null && homeScore !== undefined && (
            <p className="text-2xl font-bold mt-1">{homeScore}</p>
          )}
        </div>
      </div>

      {/* 핵심 지표 */}
      <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-2 text-xs">
        {homeSPName && awaySPName && (
          <div className="col-span-2 flex justify-between text-gray-600">
            <span>
              선발: {awaySPName}
              {awaySPFip != null && (
                <span className="text-gray-400"> FIP {awaySPFip}</span>
              )}
            </span>
            <span>
              {homeSPName}
              {homeSPFip != null && (
                <span className="text-gray-400"> FIP {homeSPFip}</span>
              )}
            </span>
          </div>
        )}
        {homeWoba != null && awayWoba != null && (
          <div className="col-span-2 flex justify-between text-gray-600">
            <span>
              타선 wOBA <span className="font-mono">{awayWoba.toFixed(3)}</span>
            </span>
            <span>
              <span className="font-mono">{homeWoba.toFixed(3)}</span> wOBA
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
