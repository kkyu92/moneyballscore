import { DEFAULT_WEIGHTS, josa, ro } from "@moneyball/shared";
import { FACTOR_LABELS_TECHNICAL as FACTOR_LABELS } from "@/lib/predictions/factorLabels";

export interface FactorRawDetails {
  homeSPFip?: number | null;
  awaySPFip?: number | null;
  homeSPxFip?: number | null;
  awaySPxFip?: number | null;
  homeWoba?: number | null;
  awayWoba?: number | null;
  homeBullpenFip?: number | null;
  awayBullpenFip?: number | null;
  homeWar?: number | null;
  awayWar?: number | null;
  homeForm?: number | null;
  awayForm?: number | null;
  h2hRate?: number | null;
  parkFactor?: number | null;
  homeElo?: number | null;
  awayElo?: number | null;
  homeSfr?: number | null;
  awaySfr?: number | null;
}

export interface FactorExplanation {
  key: string;
  label: string;
  weightPct: number;
  awayValueLabel: string;
  homeValueLabel: string;
  favor: "home" | "away" | "neutral";
  favorTeam: string | null;
  contributionPct: number;
  narrative: string;
}

interface ExplainInput {
  key: string;
  factorValue: number;
  details: FactorRawDetails;
  homeTeamName: string;
  awayTeamName: string;
}


function determineFavor(value: number): "home" | "away" | "neutral" {
  if (value > 0.55) return "home";
  if (value < 0.45) return "away";
  return "neutral";
}

function contributionPp(value: number, weight: number): number {
  return Math.round((value - 0.5) * weight * 200);
}

function fmtFip(v: number | null | undefined): string {
  return v != null ? v.toFixed(2) : "-";
}

function fmtWoba(v: number | null | undefined): string {
  return v != null ? v.toFixed(3) : "-";
}

function fmtPct(v: number | null | undefined): string {
  return v != null ? `${Math.round(v * 100)}%` : "-";
}

function fmtWar(v: number | null | undefined): string {
  return v != null ? v.toFixed(1) : "-";
}

function fmtElo(v: number | null | undefined): string {
  return v != null ? v.toFixed(0) : "-";
}

function fmtSfr(v: number | null | undefined): string {
  return v != null ? v.toFixed(1) : "-";
}

export function explainFactor(input: ExplainInput): FactorExplanation {
  const { key, factorValue, details, homeTeamName, awayTeamName } = input;
  const weight = DEFAULT_WEIGHTS[key as keyof typeof DEFAULT_WEIGHTS] ?? 0;
  const weightPct = Math.round(weight * 100);
  const favor = determineFavor(factorValue);
  const favorTeam =
    favor === "home" ? homeTeamName : favor === "away" ? awayTeamName : null;
  const contribPp = contributionPp(factorValue, weight);
  const contribSign = contribPp > 0 ? "+" : "";

  let awayLabel = "-";
  let homeLabel = "-";
  let narrative = "";

  switch (key) {
    case "sp_fip": {
      awayLabel = fmtFip(details.awaySPFip);
      homeLabel = fmtFip(details.homeSPFip);
      if (details.awaySPFip != null && details.homeSPFip != null) {
        const diff = Math.abs(details.awaySPFip - details.homeSPFip);
        const diffStr = diff.toFixed(2);
        const better =
          details.awaySPFip < details.homeSPFip ? awayTeamName : homeTeamName;
        const weightStr = `${weightPct}%`;
        narrative =
          favor === "neutral"
            ? `양 선발 FIP 격차 ${diffStr}${ro(diffStr)} 크지 않아 결정적 요소는 아니다.`
            : `선발 FIP에서 ${better}${josa(better, "이", "가")} ${diffStr} 낮아 방어력 우위. 가중치 ${weightStr}${ro(weightStr)} 이번 예측에 ${contribSign}${contribPp}%p 기여.`;
      }
      break;
    }
    case "sp_xfip": {
      awayLabel = fmtFip(details.awaySPxFip);
      homeLabel = fmtFip(details.homeSPxFip);
      if (details.awaySPxFip != null && details.homeSPxFip != null) {
        const diff = Math.abs(details.awaySPxFip - details.homeSPxFip);
        const better =
          details.awaySPxFip < details.homeSPxFip
            ? awayTeamName
            : homeTeamName;
        narrative =
          favor === "neutral"
            ? "xFIP 격차가 작아 선발 잠재력은 팽팽."
            : `${better}의 xFIP${josa("xFIP", "이", "가")} ${diff.toFixed(2)} 낮다. 홈런 운을 제거한 기대 실점에서 우위.`;
      }
      break;
    }
    case "lineup_woba": {
      awayLabel = fmtWoba(details.awayWoba);
      homeLabel = fmtWoba(details.homeWoba);
      if (details.awayWoba != null && details.homeWoba != null) {
        const diff = Math.abs(details.awayWoba - details.homeWoba);
        const better =
          details.awayWoba > details.homeWoba ? awayTeamName : homeTeamName;
        narrative =
          favor === "neutral"
            ? "양 팀 wOBA가 근접해 타격 화력은 비슷한 수준."
            : `${better} 타선의 wOBA가 ${diff.toFixed(3)} 높아 출루·장타 생산성에서 우위. 가중치 ${weightPct}%.`;
      }
      break;
    }
    case "bullpen_fip": {
      awayLabel = fmtFip(details.awayBullpenFip);
      homeLabel = fmtFip(details.homeBullpenFip);
      if (details.awayBullpenFip != null && details.homeBullpenFip != null) {
        const diff = Math.abs(
          details.awayBullpenFip - details.homeBullpenFip
        );
        const better =
          details.awayBullpenFip < details.homeBullpenFip
            ? awayTeamName
            : homeTeamName;
        narrative =
          favor === "neutral"
            ? "불펜 안정성에서 큰 격차 없음."
            : `${better} 불펜의 FIP${josa("FIP", "이", "가")} ${diff.toFixed(2)} 낮다. 후반 리드 지키기 우위 (${weightPct}% 가중).`;
      }
      break;
    }
    case "recent_form": {
      awayLabel = fmtPct(details.awayForm);
      homeLabel = fmtPct(details.homeForm);
      if (details.awayForm != null && details.homeForm != null) {
        const diff = Math.abs(details.awayForm - details.homeForm);
        const better =
          details.awayForm > details.homeForm ? awayTeamName : homeTeamName;
        const diffPp = Math.round(diff * 100);
        narrative =
          favor === "neutral"
            ? "최근 10경기 폼이 비슷해 모멘텀 변수는 중립."
            : `${better}${josa(better, "이", "가")} 최근 10경기 승률에서 ${diffPp}%p 앞선다. 폼 모멘텀 우위.`;
      }
      break;
    }
    case "war": {
      awayLabel = fmtWar(details.awayWar);
      homeLabel = fmtWar(details.homeWar);
      if (details.awayWar != null && details.homeWar != null) {
        const diff = Math.abs(details.awayWar - details.homeWar);
        const better =
          details.awayWar > details.homeWar ? awayTeamName : homeTeamName;
        narrative =
          favor === "neutral"
            ? "팀 WAR 누적이 근접해 전력치는 팽팽."
            : `${better}의 WAR 누적이 ${diff.toFixed(1)} 많다. 대체선수 대비 승리 기여도에서 앞섬.`;
      }
      break;
    }
    case "head_to_head": {
      if (details.h2hRate != null) {
        const homeWinPct = Math.round(details.h2hRate * 100);
        const awayWinPct = 100 - homeWinPct;
        awayLabel = `${awayWinPct}%`;
        homeLabel = `${homeWinPct}%`;
        const awayWinPctStr = `${awayWinPct}`;
        narrative =
          favor === "neutral"
            ? `올 시즌 상대전적 ${homeWinPct}:${awayWinPct}${ro(awayWinPctStr)} 거의 호각.`
            : `상대전적에서 ${favorTeam}${josa(favorTeam ?? "", "이", "가")} ${favor === "home" ? homeWinPct : awayWinPct}% 승률로 앞선다.`;
      } else {
        narrative = "올 시즌 첫 대결이라 상대전적 데이터 없음.";
      }
      break;
    }
    case "park_factor": {
      if (details.parkFactor != null) {
        awayLabel = details.parkFactor.toFixed(2);
        homeLabel = details.parkFactor.toFixed(2);
        if (details.parkFactor > 1.02) {
          narrative = `파크팩터 ${details.parkFactor.toFixed(2)}로 타자 친화 구장. 득점 인플레이션 영향.`;
        } else if (details.parkFactor < 0.98) {
          narrative = `파크팩터 ${details.parkFactor.toFixed(2)}로 투수 친화 구장. 득점 디플레이션.`;
        } else {
          narrative = "중립 구장. 구장 보정 영향 최소.";
        }
      }
      break;
    }
    case "elo": {
      awayLabel = fmtElo(details.awayElo);
      homeLabel = fmtElo(details.homeElo);
      if (details.awayElo != null && details.homeElo != null) {
        const diff = Math.abs(details.awayElo - details.homeElo);
        const better =
          details.awayElo > details.homeElo ? awayTeamName : homeTeamName;
        narrative =
          favor === "neutral"
            ? "Elo 레이팅 격차 작음, 전력 대등."
            : `${better} Elo가 ${Math.round(diff)}점 높다. 최근 승패 반영 전력 우위.`;
      }
      break;
    }
    case "sfr": {
      awayLabel = fmtSfr(details.awaySfr);
      homeLabel = fmtSfr(details.homeSfr);
      if (details.awaySfr != null && details.homeSfr != null) {
        const diff = Math.abs(details.awaySfr - details.homeSfr);
        const better =
          details.awaySfr > details.homeSfr ? awayTeamName : homeTeamName;
        narrative =
          favor === "neutral"
            ? "수비 SFR 차이 미미."
            : `${better} 수비가 SFR ${diff.toFixed(1)}점 우위. 실점 방어 기여 높음.`;
      }
      break;
    }
  }

  return {
    key,
    label: FACTOR_LABELS[key] ?? key,
    weightPct,
    awayValueLabel: awayLabel,
    homeValueLabel: homeLabel,
    favor,
    favorTeam,
    contributionPct: contribPp,
    narrative,
  };
}

export interface GameOverviewInput {
  homeWinProb: number;
  homeSPFip?: number | null;
  awaySPFip?: number | null;
  homeWoba?: number | null;
  awayWoba?: number | null;
  homeTeamName: string;
  awayTeamName: string;
  h2hRate?: number | null;
}

export interface GameOverview {
  tags: string[];
  summary: string;
}

export function buildGameOverview(input: GameOverviewInput): GameOverview {
  const tags: string[] = [];

  const avgSpFip =
    input.homeSPFip != null && input.awaySPFip != null
      ? (input.homeSPFip + input.awaySPFip) / 2
      : null;
  const avgWoba =
    input.homeWoba != null && input.awayWoba != null
      ? (input.homeWoba + input.awayWoba) / 2
      : null;

  if (avgSpFip != null && avgSpFip <= 3.5) tags.push("투수전 예상");
  if (avgWoba != null && avgWoba >= 0.34) tags.push("타격전 예상");

  const prob = input.homeWinProb;
  if (prob >= 0.45 && prob <= 0.55) tags.push("박빙");
  else if (prob >= 0.6 || prob <= 0.4) tags.push("우세 뚜렷");

  let summary = "";
  const marginPp = Math.round(Math.abs(prob - 0.5) * 200);
  const favored = prob > 0.5 ? input.homeTeamName : input.awayTeamName;

  if (marginPp <= 10) {
    summary = `${input.awayTeamName} vs ${input.homeTeamName} — 승률 격차 ${marginPp}%p의 접전. 초반 득점이 승부를 가를 가능성.`;
  } else if (marginPp < 20) {
    summary = `${favored} 승률이 ${marginPp}%p 앞선다. 핵심 팩터가 그대로 작동하면 예측대로, 변수 한 두 개만 틀어져도 역전 가능.`;
  } else {
    summary = `${favored} 승률이 ${marginPp}%p 크게 앞서는 우세 경기. 이변이 나오려면 복수 팩터가 반대로 움직여야 한다.`;
  }

  if (input.h2hRate != null) {
    const homePct = Math.round(input.h2hRate * 100);
    if (Math.abs(homePct - 50) >= 20) {
      const better =
        homePct > 50 ? input.homeTeamName : input.awayTeamName;
      const advPct = Math.abs(homePct - 50);
      summary += ` 올 시즌 상대전적은 ${better}${josa(better, "이", "가")} ${50 + advPct}% 승률로 강세.`;
    }
  }

  return { tags, summary };
}
