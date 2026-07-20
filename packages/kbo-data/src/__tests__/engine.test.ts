import { describe, it, expect } from 'vitest';
import { predict } from '../engine/predictor';
import { DEFAULT_WEIGHTS, SHADOW_V20_WEIGHTS } from '@moneyball/shared';
import type { PredictionInput } from '../types';

function makeInput(overrides?: Partial<PredictionInput>): PredictionInput {
  return {
    game: {
      date: '2026-04-14',
      homeTeam: 'LG',
      awayTeam: 'OB',
      gameTime: '18:30',
      stadium: '서울종합운동장 야구장',
      homeSP: '임찬규',
      awaySP: '곽빈',
      status: 'scheduled',
      externalGameId: 'KBOG20260414LGT0',
    },
    homeSPStats: {
      name: '임찬규', team: 'LG',
      fip: 3.20, xfip: 3.50, era: 3.10, innings: 85, war: 2.5, kPer9: 8.5,
    },
    awaySPStats: {
      name: '곽빈', team: 'OB',
      fip: 4.10, xfip: 4.30, era: 4.20, innings: 70, war: 1.2, kPer9: 6.8,
    },
    homeTeamStats: { team: 'LG', woba: 0.340, bullpenFip: 3.80, totalWar: 18.5, sfr: 2.5 },
    awayTeamStats: { team: 'OB', woba: 0.320, bullpenFip: 4.20, totalWar: 15.0, sfr: -1.0 },
    homeElo: { team: 'LG', elo: 1550, winPct: 0.58 },
    awayElo: { team: 'OB', elo: 1480, winPct: 0.48 },
    headToHead: { wins: 7, losses: 5 },
    homeRecentForm: 0.7,
    awayRecentForm: 0.4,
    parkFactor: 1.02,
    ...overrides,
  };
}

describe('예측 엔진 v1.8', () => {
  it('홈팀 유리 시 homeWinProb > 0.5', () => {
    const result = predict(makeInput());
    expect(result.homeWinProb).toBeGreaterThan(0.5);
    expect(result.predictedWinner).toBe('LG');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('확률이 0.15 ~ 0.85 범위 내', () => {
    const result = predict(makeInput());
    expect(result.homeWinProb).toBeGreaterThanOrEqual(0.15);
    expect(result.homeWinProb).toBeLessThanOrEqual(0.85);
  });

  it('모든 팩터가 기록됨', () => {
    const result = predict(makeInput());
    const expectedKeys = Object.keys(DEFAULT_WEIGHTS);
    for (const key of expectedKeys) {
      expect(result.factors).toHaveProperty(key);
    }
  });

  it('reasoning에 팀명 포함', () => {
    const result = predict(makeInput());
    expect(result.reasoning).toMatch(/LG|두산/);
  });

  it('동등한 팀일 때 확률이 ~0.515 (홈 어드밴티지 실측 +1.5%p)', () => {
    const equalInput = makeInput({
      homeSPStats: { name: 'A', team: 'LG', fip: 4.0, xfip: 4.0, era: 4.0, innings: 80, war: 2.0, kPer9: 7.0 },
      awaySPStats: { name: 'B', team: 'OB', fip: 4.0, xfip: 4.0, era: 4.0, innings: 80, war: 2.0, kPer9: 7.0 },
      homeTeamStats: { team: 'LG', woba: 0.330, bullpenFip: 4.0, totalWar: 15, sfr: 0 },
      awayTeamStats: { team: 'OB', woba: 0.330, bullpenFip: 4.0, totalWar: 15, sfr: 0 },
      homeElo: { team: 'LG', elo: 1500, winPct: 0.5 },
      awayElo: { team: 'OB', elo: 1500, winPct: 0.5 },
      headToHead: { wins: 5, losses: 5 },
      homeRecentForm: 0.5,
      awayRecentForm: 0.5,
      parkFactor: 1.0,
    });
    const result = predict(equalInput);
    // 홈 어드밴티지 +1.5%p로 ~0.515
    expect(result.homeWinProb).toBeGreaterThan(0.50);
    expect(result.homeWinProb).toBeLessThan(0.54);
  });
});

describe('normalize 음수 입력값 (SFR 버그 수정 cycle 208)', () => {
  it('홈팀 음수 SFR, 원정팀 양수 SFR → sfr 팩터 < 0.5 (홈 열세)', () => {
    const result = predict(makeInput({
      homeTeamStats: { team: 'LG', woba: 0.330, bullpenFip: 4.0, totalWar: 15, sfr: -5.0 },
      awayTeamStats: { team: 'OB', woba: 0.330, bullpenFip: 4.0, totalWar: 15, sfr: 3.0 },
    }));
    expect(result.factors.sfr).toBeGreaterThanOrEqual(0);
    expect(result.factors.sfr).toBeLessThan(0.5);
  });

  it('홈팀 양수 SFR, 원정팀 음수 SFR → sfr 팩터 > 0.5 (홈 우세)', () => {
    const result = predict(makeInput({
      homeTeamStats: { team: 'LG', woba: 0.330, bullpenFip: 4.0, totalWar: 15, sfr: 3.0 },
      awayTeamStats: { team: 'OB', woba: 0.330, bullpenFip: 4.0, totalWar: 15, sfr: -5.0 },
    }));
    expect(result.factors.sfr).toBeGreaterThan(0.5);
    expect(result.factors.sfr).toBeLessThanOrEqual(1.0);
  });

  it('양팀 모두 음수 SFR, 홈팀이 덜 나쁨 → sfr 팩터 > 0.5', () => {
    const result = predict(makeInput({
      homeTeamStats: { team: 'LG', woba: 0.330, bullpenFip: 4.0, totalWar: 15, sfr: -2.0 },
      awayTeamStats: { team: 'OB', woba: 0.330, bullpenFip: 4.0, totalWar: 15, sfr: -5.0 },
    }));
    expect(result.factors.sfr).toBeGreaterThan(0.5);
  });

  it('모든 팩터값이 0 이상 (음수 팩터 없음)', () => {
    const result = predict(makeInput({
      homeTeamStats: { team: 'LG', woba: 0.320, bullpenFip: 4.2, totalWar: 15, sfr: -7.9 },
      awayTeamStats: { team: 'OB', woba: 0.340, bullpenFip: 3.8, totalWar: 18, sfr: 3.2 },
    }));
    for (const [key, val] of Object.entries(result.factors)) {
      expect(val, `팩터 ${key} 음수`).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('가중치 합산', () => {
  it('가중치 합이 0.85', () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce<number>(
      (a, b) => a + b,
      0,
    );
    expect(Math.abs(sum - 0.85)).toBeLessThan(0.001);
  });

  it('가중치 >= 0 (v1.8: 모든 factor > 0)', () => {
    for (const [, val] of Object.entries(DEFAULT_WEIGHTS)) {
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });

});

describe('WAR data gap guard (cycle 1904, wave-533)', () => {
  it('홈팀 totalWar > 0, 원정팀 totalWar = 0 → war 팩터 = 0.5 (데이터 갭 중립)', () => {
    const result = predict(makeInput({
      homeTeamStats: { team: 'LG', woba: 0.330, bullpenFip: 4.0, totalWar: 5.3, sfr: -0.3 },
      awayTeamStats: { team: 'OB', woba: 0.330, bullpenFip: 4.0, totalWar: 0, sfr: -7.5 },
    }));
    expect(result.factors.war).toBe(0.5);
  });

  it('원정팀 totalWar > 0, 홈팀 totalWar = 0 → war 팩터 = 0.5 (데이터 갭 중립)', () => {
    const result = predict(makeInput({
      homeTeamStats: { team: 'LG', woba: 0.330, bullpenFip: 4.0, totalWar: 0, sfr: 2.0 },
      awayTeamStats: { team: 'OB', woba: 0.330, bullpenFip: 4.0, totalWar: 8.5, sfr: 1.0 },
    }));
    expect(result.factors.war).toBe(0.5);
  });

  it('양팀 모두 totalWar > 0 → war 팩터 정상 계산 (홈팀 우세 시 > 0.5)', () => {
    const result = predict(makeInput({
      homeTeamStats: { team: 'LG', woba: 0.330, bullpenFip: 4.0, totalWar: 12.2, sfr: 2.0 },
      awayTeamStats: { team: 'OB', woba: 0.330, bullpenFip: 4.0, totalWar: 5.0, sfr: 1.0 },
    }));
    expect(result.factors.war).toBeGreaterThan(0.5);
    expect(result.factors.war).toBeLessThan(1.0);
  });

  it('양팀 모두 totalWar = 0 → war 팩터 = 0.5 (기존 동작 유지)', () => {
    const result = predict(makeInput({
      homeTeamStats: { team: 'LG', woba: 0.330, bullpenFip: 4.0, totalWar: 0, sfr: 2.0 },
      awayTeamStats: { team: 'OB', woba: 0.330, bullpenFip: 4.0, totalWar: 0, sfr: 1.0 },
    }));
    expect(result.factors.war).toBe(0.5);
  });

  it('post-break LG vs KT 시나리오 — war=0 중립 vs war 유효 비교', () => {
    // cycle 1903 lesson: LG(home, war=5.3) vs KT(away, war=0) 데이터 갭
    // 데이터 갭(awayWar=0) → war=0.5 (중립)
    // 홈팀 WAR 큰 유효 데이터(homeWar=12) vs 원정팀 소(awayWar=3) → war > 0.5
    const withGap = predict(makeInput({
      homeElo: { team: 'LG', elo: 1545, winPct: 0.57 },
      awayElo: { team: 'OB', elo: 1525, winPct: 0.53 },
      homeTeamStats: { team: 'LG', woba: 0.315, bullpenFip: 4.1, totalWar: 12.2, sfr: -0.3 },
      awayTeamStats: { team: 'OB', woba: 0.325, bullpenFip: 4.3, totalWar: 0, sfr: -7.5 },
      homeRecentForm: 0.4,
      awayRecentForm: 0.7,
    }));
    const withData = predict(makeInput({
      homeElo: { team: 'LG', elo: 1545, winPct: 0.57 },
      awayElo: { team: 'OB', elo: 1525, winPct: 0.53 },
      homeTeamStats: { team: 'LG', woba: 0.315, bullpenFip: 4.1, totalWar: 12.2, sfr: -0.3 },
      awayTeamStats: { team: 'OB', woba: 0.325, bullpenFip: 4.3, totalWar: 3.0, sfr: -7.5 },
      homeRecentForm: 0.4,
      awayRecentForm: 0.7,
    }));
    // 데이터 갭 시 war=0.5 (중립)
    expect(withGap.factors.war).toBe(0.5);
    // 유효 데이터 시 war > 0.5 (홈팀 WAR 12 vs 원정팀 WAR 3 → 홈팀 유리)
    expect(withData.factors.war).toBeGreaterThan(0.5);
    // 데이터 갭 보정 시 homeWinProb 이 유효 데이터 케이스보다 낮음 (홈 과대평가 제거)
    expect(withGap.homeWinProb).toBeLessThan(withData.homeWinProb);
  });
});

describe('predict opts.weights (cycle 1127 plan-v17 candidate N — V2_MODEL_ENABLED swap)', () => {
  it('opts 미지정 → DEFAULT_WEIGHTS 사용 (기존 동작 유지)', () => {
    const baseline = predict(makeInput());
    const explicit = predict(makeInput(), { weights: DEFAULT_WEIGHTS });
    expect(baseline.homeWinProb).toBe(explicit.homeWinProb);
    expect(baseline.predictedWinner).toBe(explicit.predictedWinner);
  });

  it('opts.weights = SHADOW_V20_WEIGHTS → DEFAULT_WEIGHTS 결과와 다름 (가중치 swap 검증)', () => {
    const v18 = predict(makeInput());
    const v20 = predict(makeInput(), { weights: SHADOW_V20_WEIGHTS });
    // 동일 input + 다른 weights → homeWinProb 가 달라야 (factor 가중 분포 차이)
    expect(v18.homeWinProb).not.toBe(v20.homeWinProb);
  });

  it('opts.weights = SHADOW_V20_WEIGHTS → reasoning 생성 정상 (DEFAULT_WEIGHTS hardcode silent X)', () => {
    const result = predict(makeInput(), { weights: SHADOW_V20_WEIGHTS });
    expect(typeof result.reasoning).toBe('string');
    expect(result.reasoning.length).toBeGreaterThan(0);
  });
});
