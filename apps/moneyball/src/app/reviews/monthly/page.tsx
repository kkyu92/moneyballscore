import { redirect } from "next/navigation";
import { getCurrentMonth } from "@/lib/reviews/computeMonthRange";

export default function MonthlyIndexPage() {
  const current = getCurrentMonth();
  redirect(`/reviews/monthly/${current.monthId}`);
}
