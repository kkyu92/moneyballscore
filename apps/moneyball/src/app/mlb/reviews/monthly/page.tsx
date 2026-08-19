import { redirect } from "next/navigation";
import { getCurrentMonth } from "@/lib/reviews/computeMonthRange";

// reviews/monthly/page.tsx(KBO) 의 MLB 대응 (plan #26 Phase 2) — computeMonthRange 는
// league-agnostic(날짜 계산만) 이라 그대로 재사용, redirect target 만 /mlb 하위로 변경.
export default function MlbMonthlyIndexPage() {
  const current = getCurrentMonth();
  redirect(`/mlb/reviews/monthly/${current.monthId}`);
}
