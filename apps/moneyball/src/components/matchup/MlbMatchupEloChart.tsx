"use client";

import type { MlbMatchupEloPoint } from "@/lib/mlb/buildMlbMatchupEloTrend";
import { MatchupEloChart } from "./MatchupEloChart";

// KBO MatchupEloChart.tsx 렌더링 로직 재사용 (plan #25 Phase 2b step 2 병렬 구현이었으나
// cycle 2582 review-code(heavy) 로 JSX 중복 제거 — point shape 이 구조적으로 동일해 KBO 쪽
// 컴포넌트에 그대로 위임 가능. 데이터 산출(buildMlbMatchupEloTrend)은 KBO 와 별개 유지.

interface MlbMatchupEloChartProps {
  points: MlbMatchupEloPoint[];
  teamA: { shortName: string; color: string };
  teamB: { shortName: string; color: string };
}

export function MlbMatchupEloChart(props: MlbMatchupEloChartProps) {
  return <MatchupEloChart {...props} />;
}
