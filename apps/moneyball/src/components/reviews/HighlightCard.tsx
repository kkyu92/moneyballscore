import Link from "next/link";
import { shortTeamName } from "@moneyball/shared";
import type { WeeklyHighlight } from "@/lib/reviews/shared";

// wave-598: monthly/weekly 리뷰 페이지에 동일 정의가 중복되던 컴포넌트 통합 (silent drift family).
// "박빙 적중" purple = DESIGN.md Decisions Log 참조 — 3-tier 배지 (박빙/고확신/실패) 중 유일한 non-brand/non-red 색상.
export function HighlightCard({
  h,
  showResultSuffix = false,
}: {
  h: WeeklyHighlight;
  showResultSuffix?: boolean;
}) {
  const winnerName = h.predictedWinnerCode
    ? shortTeamName(h.predictedWinnerCode)
    : null;
  const badgeClass =
    h.badge === "박빙 적중"
      ? "bg-purple-500/15 text-purple-600 dark:text-purple-300"
      : h.badge === "고확신 적중"
        ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
        : "bg-red-500/15 text-red-600 dark:text-red-300";
  return (
    <Link
      href={`/analysis/game/${h.gameId}`}
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
