export function formatChartDate(date: string): string {
  const parts = date.split("-");
  if (parts.length < 3) return date;
  return `${parts[1]}/${parts[2]}`;
}
