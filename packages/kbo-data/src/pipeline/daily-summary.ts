import type { TeamCode } from '@moneyball/shared';

// `buildDailySummary` (daily.ts) read 측 silent drift 차단:
//
// (1) 기존 `const { data } = await db.from('predictions').select(...)` 는
//     supabase `.error` destructure X — DB 오류 시 data=null → `(data ?? []).map`
//     이 빈 배열 silent fallback → notifyPredictions 가 빈 summary 받아 Telegram
//     알림 ghost 박제 + summary_sent 플래그 박제 → 다음 fire `already sent`
//     silent skip = 사용자 무감지 ghost notification.
// (2) cycle 136 (#127) read 측 N+1 batch + cycle 141 (#132) write 측
//     `.error` 가드의 read 측 짝 cleanup. CLAUDE.md 사례 3 (predictions
//     `.error` 미체크 silent fail) 패턴 동일 영역 (daily.ts) 3번째 재현.
//
// `buildSummaryPredictions` 는 row → SummaryPrediction 변환만 담당하는 순수
// 함수. 호출 측이 supabase `.error` 체크 + 명시적 throw + summary.length === 0
// 가드로 ghost notification 차단.

export type SummaryPrediction = {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  predictedWinner: TeamCode;
  confidence: number;
  homeWinProb: number;
};

export type SummaryRow = {
  confidence: number | null;
  reasoning: { homeWinProb?: number } | null;
  winner: { code: string } | null;
  game: {
    home_team: { code: string } | null;
    away_team: { code: string } | null;
  } | null;
};

export function buildSummaryPredictions(rows: SummaryRow[]): SummaryPrediction[] {
  return rows.map((p) => ({
    homeTeam: p.game?.home_team?.code as TeamCode,
    awayTeam: p.game?.away_team?.code as TeamCode,
    predictedWinner: p.winner?.code as TeamCode,
    confidence: p.confidence ?? 0,
    homeWinProb: p.reasoning?.homeWinProb ?? 0.5,
  }));
}
