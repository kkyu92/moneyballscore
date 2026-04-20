/**
 * 경기 시작 시간 기준 "예측 생성 예상 시각" 계산.
 *
 * 파이프라인은 매 정시 cron (KST 10-22) 에서 "경기 시작 3시간 이내 & 아직 예측 없음"
 * 을 타겟. 가장 이른 커버 시각 = ceil((startMin - 180) / 60).
 *
 * 예:
 *   14:00 경기 → 11:00 KST
 *   18:30 경기 → 16:00 KST  (15:30 이후 첫 정시)
 *   17:00 경기 → 14:00 KST
 *
 * gameTime 입력 형식: "HH:MM"
 */
export function estimatePredictionTime(gameTime: string): string {
  const [hStr, mStr] = gameTime.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "생성 예정";
  const startMin = h * 60 + m;
  const cronHr = Math.ceil((startMin - 180) / 60);
  if (cronHr < 0) return "시작 직전";
  return `${String(cronHr).padStart(2, "0")}:00 KST`;
}
