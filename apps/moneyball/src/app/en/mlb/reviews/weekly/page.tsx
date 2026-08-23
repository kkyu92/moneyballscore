import { redirect } from "next/navigation";
import { getCurrentWeek } from "@/lib/reviews/computeWeekRange";

// mlb/reviews/weekly/page.tsx(KO) 의 EN 대응 (wave-660, cycle 2355) — computeWeekRange
// 는 league/locale-agnostic (ISO 8601 주차 계산만) 이라 그대로 재사용, redirect target 만
// /en/mlb 하위로 변경.
export default function MlbWeeklyIndexPageEn() {
  const current = getCurrentWeek();
  redirect(`/en/mlb/reviews/weekly/${current.weekId}`);
}
