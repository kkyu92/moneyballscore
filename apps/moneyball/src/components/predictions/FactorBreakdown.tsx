import { KBO_TEAMS, DEFAULT_WEIGHTS, type TeamCode } from "@moneyball/shared";

const FACTOR_LABELS: Record<string, string> = {
  sp_fip: "선발 FIP",
  sp_xfip: "선발 xFIP",
  lineup_woba: "타선 wOBA",
  bullpen_fip: "불펜 FIP",
  recent_form: "최근 폼",
  war: "WAR",
  head_to_head: "상대전적",
  park_factor: "구장보정",
  elo: "Elo 레이팅",
  sfr: "수비 SFR",
};

interface FactorBreakdownProps {
  factors: Record<string, number>;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  details: {
    homeSPFip?: number;
    awaySPFip?: number;
    homeSPxFip?: number;
    awaySPxFip?: number;
    homeWoba?: number;
    awayWoba?: number;
    homeBullpenFip?: number;
    awayBullpenFip?: number;
    homeWar?: number;
    awayWar?: number;
    homeForm?: number;
    awayForm?: number;
    h2hRate?: number;
    parkFactor?: number;
    homeElo?: number;
    awayElo?: number;
    homeSfr?: number;
    awaySfr?: number;
  };
}

function formatDetail(key: string, details: FactorBreakdownProps["details"]): string {
  switch (key) {
    case "sp_fip":
      return `${details.awaySPFip?.toFixed(2) ?? "-"} vs ${details.homeSPFip?.toFixed(2) ?? "-"}`;
    case "sp_xfip":
      return `${details.awaySPxFip?.toFixed(2) ?? "-"} vs ${details.homeSPxFip?.toFixed(2) ?? "-"}`;
    case "lineup_woba":
      return `${details.awayWoba?.toFixed(3) ?? "-"} vs ${details.homeWoba?.toFixed(3) ?? "-"}`;
    case "bullpen_fip":
      return `${details.awayBullpenFip?.toFixed(2) ?? "-"} vs ${details.homeBullpenFip?.toFixed(2) ?? "-"}`;
    case "recent_form":
      return `${details.awayForm != null ? Math.round(details.awayForm * 100) + "%" : "-"} vs ${details.homeForm != null ? Math.round(details.homeForm * 100) + "%" : "-"}`;
    case "war":
      return `${details.awayWar?.toFixed(1) ?? "-"} vs ${details.homeWar?.toFixed(1) ?? "-"}`;
    case "head_to_head":
      return details.h2hRate != null ? `홈 ${Math.round(details.h2hRate * 100)}%` : "-";
    case "park_factor":
      return details.parkFactor != null ? `${details.parkFactor.toFixed(2)}` : "-";
    case "elo":
      return `${details.awayElo?.toFixed(0) ?? "-"} vs ${details.homeElo?.toFixed(0) ?? "-"}`;
    case "sfr":
      return `${details.awaySfr?.toFixed(1) ?? "-"} vs ${details.homeSfr?.toFixed(1) ?? "-"}`;
    default:
      return "-";
  }
}

export function FactorBreakdown({ factors, homeTeam, awayTeam, details }: FactorBreakdownProps) {
  const homeName = KBO_TEAMS[homeTeam].name.split(" ")[0];
  const awayName = KBO_TEAMS[awayTeam].name.split(" ")[0];

  // 팩터를 가중치 순으로 정렬
  const sortedFactors = Object.entries(factors)
    .filter(([key]) => key in DEFAULT_WEIGHTS)
    .sort(([a], [b]) => {
      const wa = DEFAULT_WEIGHTS[a as keyof typeof DEFAULT_WEIGHTS] || 0;
      const wb = DEFAULT_WEIGHTS[b as keyof typeof DEFAULT_WEIGHTS] || 0;
      return wb - wa;
    });

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <h4 className="text-sm font-bold text-gray-600 mb-3">예측 근거 (팩터별 분석)</h4>
      <div className="text-xs text-gray-400 mb-2 flex justify-between">
        <span>← {awayName} 유리</span>
        <span>{homeName} 유리 →</span>
      </div>
      <div className="space-y-2">
        {sortedFactors.map(([key, value]) => {
          const weight = DEFAULT_WEIGHTS[key as keyof typeof DEFAULT_WEIGHTS] || 0;
          const pct = Math.round(weight * 100);
          // value: 0=원정유리, 0.5=중립, 1=홈유리
          const barPct = Math.round(value * 100);
          const favorable = value > 0.55 ? "home" : value < 0.45 ? "away" : "neutral";

          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-20 shrink-0 text-right">
                {FACTOR_LABELS[key] || key}
              </span>
              <span className="text-xs text-gray-400 w-8 shrink-0 text-right">
                {pct}%
              </span>
              <div className="flex-1 h-4 bg-gray-200 rounded-full relative overflow-hidden">
                {/* 중심선 */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-400 z-10" />
                {/* 바 */}
                {barPct >= 50 ? (
                  <div
                    className="absolute top-0 bottom-0 bg-blue-500 rounded-r-full"
                    style={{
                      left: "50%",
                      width: `${barPct - 50}%`,
                    }}
                  />
                ) : (
                  <div
                    className="absolute top-0 bottom-0 bg-red-400 rounded-l-full"
                    style={{
                      right: "50%",
                      width: `${50 - barPct}%`,
                    }}
                  />
                )}
              </div>
              <span className="text-xs text-gray-500 w-28 shrink-0">
                {formatDetail(key, details)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
