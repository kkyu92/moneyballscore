import { KBO_TEAMS, type TeamCode } from "@moneyball/shared";
import { TeamLogo } from "../shared/TeamLogo";
import { estimatePredictionTime } from "@/lib/predictions/estimateTime";

interface PlaceholderCardProps {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  gameTime?: string;
  status?: string | null;
  homeSPName?: string;
  awaySPName?: string;
}

export function PlaceholderCard({
  homeTeam,
  awayTeam,
  gameTime,
  status,
  homeSPName,
  awaySPName,
}: PlaceholderCardProps) {
  const home = KBO_TEAMS[homeTeam];
  const away = KBO_TEAMS[awayTeam];

  let statusMsg: string;
  let statusIcon = "⏳";
  if (status === "postponed") {
    statusMsg = "우천취소";
    statusIcon = "🌧";
  } else if (status === "live") {
    statusMsg = "경기 진행중";
    statusIcon = "🔴";
  } else if (status === "final") {
    statusMsg = "경기 종료 · 예측 미기록";
    statusIcon = "—";
  } else if (!homeSPName || !awaySPName) {
    statusMsg = "선발 확정 대기";
  } else if (gameTime) {
    statusMsg = `예측 준비중 · 약 ${estimatePredictionTime(gameTime)} 생성`;
  } else {
    statusMsg = "예측 준비중";
  }

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-dashed border-gray-300 dark:border-[var(--color-border)] p-5 opacity-80">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {gameTime ?? "18:30"}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-center flex-1">
          <div className="flex justify-center mb-1">
            <TeamLogo team={awayTeam} size={40} />
          </div>
          <p className="text-sm font-medium">{away.name.split(" ")[0]}</p>
        </div>

        <div className="px-4 text-center">
          <span className="text-2xl" aria-hidden="true">
            {statusIcon}
          </span>
        </div>

        <div className="text-center flex-1">
          <div className="flex justify-center mb-1">
            <TeamLogo team={homeTeam} size={40} />
          </div>
          <p className="text-sm font-medium">{home.name.split(" ")[0]}</p>
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-[var(--color-border)] pt-3 text-center text-sm text-gray-500 dark:text-gray-400">
        {statusMsg}
      </div>

      {(homeSPName || awaySPName) && status !== "postponed" && (
        <div className="mt-2 text-xs text-center text-gray-400 dark:text-gray-500">
          {awaySPName ?? "미확정"} vs {homeSPName ?? "미확정"}
        </div>
      )}
    </div>
  );
}
