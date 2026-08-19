import { redirect } from "next/navigation";
import { getCurrentWeek } from "@/lib/reviews/computeWeekRange";

// reviews/weekly/page.tsx(KBO) 의 MLB 대응 — computeWeekRange 는 league-agnostic
// (ISO 8601 주차 계산만) 이라 그대로 재사용, redirect target 만 /mlb 하위로 변경.
export default function MlbWeeklyIndexPage() {
  const current = getCurrentWeek();
  redirect(`/mlb/reviews/weekly/${current.weekId}`);
}
