import { redirect } from "next/navigation";
import { getCurrentMonth } from "@/lib/reviews/computeMonthRange";

// mlb/reviews/monthly/page.tsx(KO) 의 EN 대응 (cycle 2356) — computeMonthRange 는
// league/locale-agnostic (날짜 계산만) 이라 그대로 재사용, redirect target 만
// /en/mlb 하위로 변경.
export default function MlbMonthlyIndexPageEn() {
  const current = getCurrentMonth();
  redirect(`/en/mlb/reviews/monthly/${current.monthId}`);
}
