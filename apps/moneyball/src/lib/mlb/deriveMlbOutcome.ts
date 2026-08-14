/**
 * MLB `predictions` 행의 `predicted_winner`/`is_correct`/`confidence` 컬럼은 전량 NULL
 * (mlb-pipeline.ts `runPredictFinal` 이 의도적으로 안 씀 — 팀이 string 코드라 INT FK 인
 * 저 컬럼들이 애초에 안 맞음). `home_win_prob` + 경기 결과로 직접 derive 하는 게 정상
 * 설계이지 버그가 아님 — buildMlbTeamProfile.ts/buildMlbMatchupProfile.ts 양쪽이 같은
 * 로직을 따로 구현하고 있던 걸 여기로 통합(cycle 2117 review-code heavy).
 */
export interface MlbOutcomeInput {
  homeWinProb: number | null | undefined;
  hasFinalScore: boolean;
  homeScore: number | null | undefined;
  awayScore: number | null | undefined;
}

export interface MlbOutcomeResult {
  predictedHomeWin: boolean | null;
  actualHomeWin: boolean | null;
  isCorrect: boolean | null;
  confidence: number | null;
}

export function deriveMlbOutcome(input: MlbOutcomeInput): MlbOutcomeResult {
  const predictedHomeWin = input.homeWinProb != null ? input.homeWinProb >= 0.5 : null;
  const actualHomeWin =
    input.hasFinalScore && input.homeScore != null && input.awayScore != null
      ? input.homeScore > input.awayScore
      : null;
  const isCorrect =
    predictedHomeWin != null && actualHomeWin != null
      ? predictedHomeWin === actualHomeWin
      : null;
  const confidence =
    input.homeWinProb != null ? Math.max(input.homeWinProb, 1 - input.homeWinProb) : null;

  return { predictedHomeWin, actualHomeWin, isCorrect, confidence };
}
