export const FACTOR_LABELS: Record<string, string> = {
  sp_fip: "선발 투수력",
  sp_xfip: "선발 잠재력",
  lineup_woba: "타선 화력",
  bullpen_fip: "불펜 안정성",
  recent_form: "최근 폼",
  war: "팀 기여도",
  head_to_head: "상대전적",
  park_factor: "구장 특성",
  elo: "팀 전력",
  sfr: "수비력",
};

export const FACTOR_LABELS_TECHNICAL: Record<string, string> = {
  sp_fip: "선발 FIP",
  sp_xfip: "선발 xFIP",
  lineup_woba: "타선 wOBA",
  bullpen_fip: "불펜 FIP",
  recent_form: "최근 10경기 폼",
  war: "WAR 누적",
  head_to_head: "상대전적",
  park_factor: "구장 보정",
  elo: "Elo 레이팅",
  sfr: "수비 SFR",
};

export const FACTOR_TIPS: Record<string, string> = {
  sp_fip: "선발투수의 순수 실력 (낮을수록 좋음)",
  sp_xfip: "운 요소를 제거한 선발투수 잠재력",
  lineup_woba: "타선의 종합 공격 생산성 (높을수록 강함)",
  bullpen_fip: "중계/마무리 투수진의 안정성",
  recent_form: "최근 10경기 승률",
  war: "대체선수 대비 팀 승리 기여도 합산",
  head_to_head: "올 시즌 두 팀 간 직접 대결 승률",
  park_factor: "홈구장이 타자/투수 중 누구에게 유리한지",
  elo: "상대적 팀 전력 수치 (강팀 이기면 크게 오름)",
  sfr: "수비가 실점 방어에 기여하는 정도",
};

/**
 * factors 맵에서 predictedWinner 쪽으로 가장 강하게 기울어진 top-N 팩터 이름 반환.
 * value 범위 [0,1]: 0.5=중립, >0.5=홈 우위, <0.5=원정 우위
 */
export function topFavoringFactors(
  factors: Record<string, number>,
  isHomePredicted: boolean,
  n = 2,
): string[] {
  return Object.entries(factors)
    .filter(([key]) => key in FACTOR_LABELS)
    .filter(([, value]) =>
      isHomePredicted ? value > 0.52 : value < 0.48,
    )
    .sort(([, a], [, b]) => {
      const sa = isHomePredicted ? a - 0.5 : 0.5 - a;
      const sb = isHomePredicted ? b - 0.5 : 0.5 - b;
      return sb - sa;
    })
    .slice(0, n)
    .map(([key]) => FACTOR_LABELS[key]);
}
