// /insights hub + daily archive 공용 status badge — sweep 52 통합.
// 직전 duplicate: apps/moneyball/src/app/insights/page.tsx + apps/moneyball/src/app/insights/[date]/page.tsx 2 위치.
// 동일 분기 5종 (취소 / 적중 / 빗나감 / 결과 대기 / 예정) — sweep 52 chain 연장.

export interface StatusBadge {
  label: string;
  cls: string;
}

export function insightsStatusBadge(
  status: string,
  isCorrect: boolean | null,
): StatusBadge {
  if (status === "postponed") {
    return {
      label: "취소",
      cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    };
  }
  if (isCorrect === true) {
    return {
      label: "적중",
      cls: "bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200",
    };
  }
  if (isCorrect === false) {
    return {
      label: "빗나감",
      cls: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    };
  }
  if (status === "final") {
    return {
      label: "결과 대기",
      cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    };
  }
  return {
    label: "예정",
    cls: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200",
  };
}
