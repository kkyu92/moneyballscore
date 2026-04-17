import { redirect } from "next/navigation";
import { getCurrentWeek } from "@/lib/reviews/computeWeekRange";

export default function WeeklyIndexPage() {
  const current = getCurrentWeek();
  redirect(`/reviews/weekly/${current.weekId}`);
}
