import Link from "next/link";
import { mlbShortTeamName } from "@moneyball/shared";
import type { MlbWeeklyHighlight } from "@/lib/reviews/mlb-shared";

// HighlightCard.tsx(KBO) 의 MLB 대응. 재사용 불가 이유: MlbWeeklyHighlight 는
// gameId(number) 대신 externalGameId(string) + predictedWinnerCode 대신
// predictedHomeWin(boolean) 을 쓰는 별도 shape (mlb-shared.ts) — 필드명이 달라
// KBO 컴포넌트에 그대로 태울 수 없음. 상세 페이지 링크도 /analysis/game/[id] 가
// 아니라 /mlb/games/[date]/[homeCode]-vs-[awayCode] slug (sitemap.ts 동일 패턴).
export function MlbHighlightCard({
  h,
  showResultSuffix = false,
}: {
  h: MlbWeeklyHighlight;
  showResultSuffix?: boolean;
}) {
  const winnerName =
    h.predictedHomeWin === null
      ? null
      : mlbShortTeamName(h.predictedHomeWin ? h.homeCode : h.awayCode);
  const badgeClass =
    h.badge === "박빙 적중"
      ? "bg-purple-500/15 text-purple-600 dark:text-purple-300"
      : h.badge === "고확신 적중"
        ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
        : "bg-red-500/15 text-red-600 dark:text-red-300";
  return (
    <Link
      href={`/mlb/games/${h.gameDate}/${h.homeCode}-vs-${h.awayCode}`}
      className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeClass}`}
        >
          {h.badge}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {h.gameDate}
        </span>
      </div>
      <p className="text-base font-semibold">
        {h.awayName}
        <span className="font-mono mx-2">
          {h.awayScore ?? "-"} : {h.homeScore ?? "-"}
        </span>
        {h.homeName}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        예측 {winnerName ?? ""} {Math.round(h.winnerProb * 100)}%
        {showResultSuffix ? ` · ${h.isCorrect ? "적중" : "빗나감"}` : ""}
      </p>
    </Link>
  );
}
