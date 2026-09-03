/**
 * 경기 시작 시간 기준 "예측 생성 예상 시각" 계산.
 *
 * 파이프라인은 Cloudflare Worker cron `17 0-14 * * *` (UTC) = 매시 17분,
 * KST 09:17-23:17 에서 "경기 시작 3시간 이내 & 아직 예측 없음" 을 타겟
 * (cloudflare-worker/wrangler.toml 참조, 2026-04-29 GH Actions cron 폐지 후
 * 이 스케줄로 이관 — 과거 "정시 KST 10-22" 서술은 그 이전 GH Actions cron 값).
 * 가장 이른 커버 시각 = ceil((startMin - 180) / 60), 09:17 이전은 09:17로 clamp.
 *
 * 예:
 *   14:00 경기 → 11:17 KST
 *   18:30 경기 → 16:17 KST  (15:30 이후 첫 cron)
 *   17:00 경기 → 14:17 KST
 *   10:00 경기 → 09:17 KST  (계산상 07:17이지만 파이프라인 시작 09:17 이전엔 안 돎)
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
  const clampedHr = Math.min(23, Math.max(9, cronHr));
  return `${String(clampedHr).padStart(2, "0")}:17 KST`;
}
