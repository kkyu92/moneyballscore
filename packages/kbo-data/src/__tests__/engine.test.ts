import { describe, it, expect } from 'vitest';
import { predict } from '../engine/predictor';
import { DEFAULT_WEIGHTS } from '@moneyball/shared';
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

describe('예측 엔진 v1.5', () => {
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

  it('동등한 팀일 때 확률이 ~0.53 (홈 어드밴티지)', () => {
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
    // 홈 어드밴티지 +3%로 ~0.53
    expect(result.homeWinProb).toBeGreaterThan(0.50);
    expect(result.homeWinProb).toBeLessThan(0.56);
  });
});

describe('가중치 합산', () => {
  it('가중치 합이 0.85', () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 0.85)).toBeLessThan(0.001);
  });

  it('모든 가중치가 양수', () => {
    for (const [key, val] of Object.entries(DEFAULT_WEIGHTS)) {
      expect(val).toBeGreaterThan(0);
    }
  });
});
