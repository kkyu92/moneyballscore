// `updateAccuracy` (daily.ts) write 측 silent drift 차단:
//
// (1) 기존 `for (game of finalGames) await db.update(...)` 는 N+1 sequential
//     round-trip — 부분 실패 시 일부 prediction 만 verified 박제.
// (2) supabase `.update()` 는 DB 오류 시 throw X — `.error` 리턴만. 기존 코드는
//     결과 destructure X = silent skip (CLAUDE.md 사례 3 model_version VARCHAR
//     overflow 패턴 동일 영역 재현).
//
// `buildAccuracyUpdates` 는 winner_team_id + predicted_winner 매칭으로 update
// payload list 만 만드는 순수 함수. 호출 측이 Promise.all + `.error` 체크로
// concurrent 실행 + 오류 가시화.
export function buildAccuracyUpdates(
  finalGames: Array<{ id: number; winner_team_id: number }>,
  predByGameId: Map<number, { id: number; predicted_winner: number }>,
  verifiedAt: string,
): Array<{
  predId: number;
  payload: { is_correct: boolean; actual_winner: number; verified_at: string };
}> {
  return finalGames.flatMap((game) => {
    const pred = predByGameId.get(game.id);
    if (!pred) return [];
    return [
      {
        predId: pred.id,
        payload: {
          is_correct: pred.predicted_winner === game.winner_team_id,
          actual_winner: game.winner_team_id,
          verified_at: verifiedAt,
        },
      },
    ];
  });
}
