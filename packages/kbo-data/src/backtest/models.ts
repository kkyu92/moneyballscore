import { HOME_ADVANTAGE, KBO_TEAMS } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import type { GameFeatures, Model } from './types';

/**
 * 실측 홈 어드밴티지 0.015 (51.5%) 를 Elo pt 단위로 환산한 값.
 * 동일 Elo 2팀 기준 pHome = 0.5 + 0.015 = 0.515 → delta ≈ 10.4 Elo pt.
 */
const HOME_ADV_ELO_DEFAULT = 400 * Math.log10((0.5 + HOME_ADVANTAGE) / (0.5 - HOME_ADVANTAGE));

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

function sigmoidElo(deltaElo: number): number {
  return 1 / (1 + Math.pow(10, -deltaElo / 400));
}

/** 최소 baseline: 모두 0.5. */
export const modelCoinFlip: Model = () => 0.5;

/** Elo 차 + 고정 홈어드밴티지 (51.5% 실측) → p(home). v1.5 의 elo + home_adv 부분만. */
export const modelEloHomeAdv: Model = (f) => {
  const delta = f.homeElo - f.awayElo + HOME_ADV_ELO_DEFAULT;
  return clamp(sigmoidElo(delta), 0.15, 0.85);
};

/**
 * 제한 모델 baseline: Elo + form + h2h + park + home adv.
 * 각 팩터를 probability offset 이 아닌 **effective Elo pt** 로 환산 — sigmoid 가
 * 극값에서 부드럽게 saturate 되므로 상수 offset 방식보다 안전.
 *
 * 파라미터는 **v1.5 엔진의 가중치 비율** 을 참고하되 일부는 합리적 디폴트:
 *   - form 50 Elo pt / (home_form - away_form) (승률 100% 차이 = ±50 pt 는 관례적)
 *   - h2h 30 Elo pt / ((h_rate - 0.5) * 2) — 시즌 내 h2h 표본이 작아 완화
 *   - park 2 Elo pt / (parkPf - 100) — 미미
 *   - h2hMinN — h2h shift 적용 최소 표본수 (cycle 67 spec carry-over). 기본 2 = 기존 동작.
 *     2/0=100% 시 ±kH2h Elo pt 노이즈 risk → 3+ 권장 grid 검증 (cycle 69 review-code heavy).
 */
export interface RestrictedParams {
  kElo: number; // Elo diff 스케일 (1.0 = 원본 그대로). logistic 결과는 0.5 부근.
  kForm: number;
  kH2h: number;
  kPark: number;
  homeAdvElo: number;
  h2hMinN: number;
  clampLo: number;
  clampHi: number;
}

export const DEFAULT_RESTRICTED: RestrictedParams = {
  kElo: 1.0,
  kForm: 50,
  kH2h: 30,
  kPark: 2,
  homeAdvElo: HOME_ADV_ELO_DEFAULT,
  h2hMinN: 2,
  clampLo: 0.15,
  clampHi: 0.85,
};

/**
 * RestrictedParams 와 (선택) 팀별 홈어드밴티지 Map 을 받아 모델 함수 생성.
 *
 * @param homeAdvByTeam  홈팀 코드 → HomeAdvantage (Elo pt). 없으면 homeAdvElo 상수 사용.
 */
export function makeRestricted(
  p: RestrictedParams = DEFAULT_RESTRICTED,
  homeAdvByTeam?: Partial<Record<TeamCode, number>>,
): Model {
  return (f: GameFeatures): number => {
    let delta = p.kElo * (f.homeElo - f.awayElo);
    // form — null 처리: 한 쪽만 null 이면 그 팀 0.5 로 간주 (정보 부재)
    const hForm = f.homeForm ?? 0.5;
    const aForm = f.awayForm ?? 0.5;
    delta += p.kForm * (hForm - aForm);

    // h2h — 표본 p.h2hMinN 미만이면 무시 (노이즈 과다). default 2.
    const h2hN = f.h2hHomeWins + f.h2hAwayWins;
    if (h2hN >= p.h2hMinN) {
      const h2hRate = f.h2hHomeWins / h2hN;
      delta += p.kH2h * (h2hRate - 0.5) * 2;
    }

    // park — parkPf 100 중립 기준. 홈팀 타자 구장이면 +, 투수 구장이면 −
    delta += p.kPark * (f.parkPf - 100);

    // home advantage — 팀별 override 우선, 없으면 상수
    const homeAdv = homeAdvByTeam?.[f.homeTeam] ?? p.homeAdvElo;
    delta += homeAdv;

    return clamp(sigmoidElo(delta), p.clampLo, p.clampHi);
  };
}

/**
 * 2023-2025 시즌별 각 팀의 홈 승률 − 리그 평균 → Elo pt 환산 Map 생성.
 * 호출자가 미리 `computeTeamHomeAdvantages()` 로 계산한 결과를 전달.
 */
export function teamHomeAdvantagesInEloPt(
  winRates: Partial<Record<TeamCode, number>>,
): Partial<Record<TeamCode, number>> {
  const out: Partial<Record<TeamCode, number>> = {};
  for (const code of Object.keys(KBO_TEAMS) as TeamCode[]) {
    const rate = winRates[code];
    if (rate == null) continue;
    // rate > 0.5 → 양수, rate 0.55 → +17 Elo pt 수준
    // pt = 400 * log10(rate / (1-rate))
    const safeRate = clamp(rate, 0.1, 0.9);
    out[code] = 400 * Math.log10(safeRate / (1 - safeRate));
  }
  return out;
}

export { HOME_ADV_ELO_DEFAULT };
