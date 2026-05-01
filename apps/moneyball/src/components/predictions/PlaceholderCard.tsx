import { shortTeamName, type TeamCode } from "@moneyball/shared";
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
  let statusMsg: string;
  let statusIcon = "⏳";
  if (status === "postponed") {
    // KBO API 가 CANCEL_SC_ID="1"/"2" 두 값만 노출하고 사유 (우천/미세먼지/
    // 구장·감염병 등) 를 구분하지 않음. 중립 표기로 통일.
    statusMsg = "경기 취소";
    statusIcon = "🚫";
  } else if (status === "live") {
    statusMsg = "경기 진행중";
    statusIcon = "🔴";
  } else if (status === "final") {
    // "예측 미기록" 은 통계 작성자 어휘. 일반 사용자엔 "예측 없음" 이 더 자연.
    statusMsg = "경기 종료 · 예측 없음";
    statusIcon = "—";
  } else if (!homeSPName || !awaySPName) {
    statusMsg = "선발 확정 대기";
  } else if (gameTime) {
    statusMsg = `예측 준비중 · 약 ${estimatePredictionTime(gameTime)} 생성`;
  } else {
    statusMsg = "예측 준비중";
  }

  // 스크린리더용 카드 요약 — 매치업 + 시각 + 상태를 한 문장으로.
  // 시각적으로는 같은 정보가 분산돼 있어 SR 사용자가 토막으로 듣게 됨.
  const displayTime = gameTime ?? "18:30";
  const ariaLabel = `${shortTeamName(awayTeam)} 대 ${shortTeamName(homeTeam)} (홈) · ${displayTime} · ${statusMsg}`;

  return (
    <article
      aria-label={ariaLabel}
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-dashed border-gray-300 dark:border-[var(--color-border)] p-5 opacity-80"
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          <time dateTime={displayTime}>{displayTime}</time>
        </span>
        <span
          aria-hidden="true"
          className="text-xs text-gray-400 dark:text-gray-500"
        >
          —
        </span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-center flex-1">
          <div className="flex justify-center mb-1">
            <TeamLogo team={awayTeam} size={40} />
          </div>
          <p className="text-sm font-medium">{shortTeamName(awayTeam)}</p>
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
    </article>
  );
}
