import { describe, it, expect } from 'vitest';
import {
  selectBigMatch,
  scoreGame,
  computeEloCloseness,
  computeFormMomentum,
  computeConfidenceLow,
  WEIGHTS,
  BIG_MATCH_THRESHOLD,
  type BigMatchCandidate,
} from '../big-match';

function makeCandidate(overrides: Partial<BigMatchCandidate> = {}): BigMatchCandidate {
  return {
    gameId: 1,
    homeTeam: 'LG',
    awayTeam: 'OB',
    homeElo: 1550,
    awayElo: 1480,
    homeRecentForm: 0.6,
    awayRecentForm: 0.5,
    confidence: 0.4,
    ...overrides,
  };
}

// ============================================
// 순수 함수 유닛
// ============================================
describe('computeEloCloseness', () => {
  it('0 pt 격차 → 1.0', () => {
    expect(computeEloCloseness(1500, 1500)).toBe(1);
  });
  it('100 pt 격차 → 0.0', () => {
    expect(computeEloCloseness(1550, 1450)).toBe(0);
  });
  it('50 pt 격차 → 0.5', () => {
    expect(computeEloCloseness(1550, 1500)).toBe(0.5);
  });
  it('200 pt 격차 → 0 (clamp)', () => {
    expect(computeEloCloseness(1600, 1400)).toBe(0);
  });
  it('양방향 대칭', () => {
    expect(computeEloCloseness(1550, 1480)).toBe(computeEloCloseness(1480, 1550));
  });
});

describe('computeFormMomentum', () => {
  it('양팀 모두 상승세 (>0.6)', () => {
    expect(computeFormMomentum(0.7, 0.8)).toBe(1);
  });
  it('양팀 모두 하락세 (<0.4)', () => {
    expect(computeFormMomentum(0.3, 0.2)).toBe(1);
  });
  it('한쪽 상승 한쪽 하락', () => {
    expect(computeFormMomentum(0.8, 0.3)).toBe(0);
  });
  it('둘 다 중간 (0.4~0.6)', () => {
    expect(computeFormMomentum(0.5, 0.5)).toBe(0.5);
  });
});

describe('computeConfidenceLow', () => {
  it('confidence 0 → 1', () => {
    expect(computeConfidenceLow(0)).toBe(1);
  });
  it('confidence 1 → 0', () => {
    expect(computeConfidenceLow(1)).toBe(0);
  });
  it('clamp 음수', () => {
    expect(computeConfidenceLow(-0.5)).toBe(1);
  });
});

// ============================================
// scoreGame
// ============================================
describe('scoreGame', () => {
  it('완벽 빅매치 (라이벌 + 접전 + 양팀 상승 + 낮은 confidence) → 1.0', () => {
    const c = makeCandidate({
      homeTeam: 'LG',
      awayTeam: 'OB', // 라이벌
      homeElo: 1500,
      awayElo: 1500, // 접전 0pt
      homeRecentForm: 0.7,
      awayRecentForm: 0.7, // 둘 다 상승
      confidence: 0, // 모델 자신 없음
    });
    const { score, breakdown } = scoreGame(c);
    expect(score).toBeCloseTo(1.0, 2);
    expect(breakdown.rivalry).toBe(1);
    expect(breakdown.elo).toBe(1);
    expect(breakdown.form).toBe(1);
    expect(breakdown.confLow).toBe(1);
  });

  it('최악 빅매치 (블로우아웃 + 비라이벌 + 폼 반대 + 높은 confidence) → 0', () => {
    const c = makeCandidate({
      homeTeam: 'LG',
      awayTeam: 'SK',  // 라이벌 아님
      homeElo: 1600,
      awayElo: 1400,  // 200pt 격차
      homeRecentForm: 0.9,
      awayRecentForm: 0.2, // 한쪽만
      confidence: 1,  // 모델 확신
    });
    const { score } = scoreGame(c);
    expect(score).toBe(0);
  });

  it('라이벌 보너스만 단독 0.25', () => {
    const c = makeCandidate({
      homeTeam: 'LG',
      awayTeam: 'OB', // 라이벌
      homeElo: 1600,
      awayElo: 1400, // 0 elo
      homeRecentForm: 0.9,
      awayRecentForm: 0.2, // 0 form
      confidence: 1, // 0 conf
    });
    const { score } = scoreGame(c);
    expect(score).toBe(WEIGHTS.rivalryBonus);
  });

  it('결정론적: 같은 입력 = 같은 출력', () => {
    const c = makeCandidate({ gameId: 42 });
    const r1 = scoreGame(c);
    const r2 = scoreGame(c);
    expect(r1).toEqual(r2);
  });
});

// ============================================
// selectBigMatch — 3단계 fallback
// ============================================
describe('selectBigMatch', () => {
  it('1단계: 경기 0개 → no-games', () => {
    const r = selectBigMatch([]);
    expect(r.mode).toBe('no-games');
    expect(r.bigMatchGameId).toBeNull();
    expect(r.score).toBe(0);
  });

  it('2단계: 모든 경기가 임계값 미달 → below-threshold', () => {
    const candidates = [
      makeCandidate({
        gameId: 1,
        homeTeam: 'SK',
        awayTeam: 'WO', // 라이벌 아님
        homeElo: 1600,
        awayElo: 1400, // 0
        homeRecentForm: 0.9,
        awayRecentForm: 0.2, // 0
        confidence: 0.95, // 0.05
      }),
    ];
    const r = selectBigMatch(candidates);
    expect(r.mode).toBe('below-threshold');
    expect(r.bigMatchGameId).toBeNull();
    expect(r.score).toBeLessThan(BIG_MATCH_THRESHOLD);
  });

  it('3단계: 라이벌 접전 경기 있음 → normal', () => {
    const candidates = [
      makeCandidate({
        gameId: 10,
        homeTeam: 'LG',
        awayTeam: 'OB',
        homeElo: 1500,
        awayElo: 1500,
        homeRecentForm: 0.7,
        awayRecentForm: 0.7,
        confidence: 0.1,
      }),
    ];
    const r = selectBigMatch(candidates);
    expect(r.mode).toBe('normal');
    expect(r.bigMatchGameId).toBe(10);
    expect(r.score).toBeGreaterThanOrEqual(BIG_MATCH_THRESHOLD);
  });

  it('여러 경기 중 최고 점수 선택', () => {
    const candidates = [
      makeCandidate({
        gameId: 1,
        homeTeam: 'SK',
        awayTeam: 'WO',
        homeElo: 1500,
        awayElo: 1500,
        homeRecentForm: 0.5,
        awayRecentForm: 0.5,
        confidence: 0.3,
      }), // 비라이벌
      makeCandidate({
        gameId: 2,
        homeTeam: 'LG',
        awayTeam: 'OB', // 라이벌
        homeElo: 1500,
        awayElo: 1500,
        homeRecentForm: 0.7,
        awayRecentForm: 0.7,
        confidence: 0.1,
      }),
    ];
    const r = selectBigMatch(candidates);
    expect(r.bigMatchGameId).toBe(2);
  });

  it('동점 tiebreaker: gameId 낮은 쪽 (결정론)', () => {
    const baseParams = {
      homeElo: 1500,
      awayElo: 1500,
      homeRecentForm: 0.7,
      awayRecentForm: 0.7,
      confidence: 0.1,
    };
    const candidates = [
      makeCandidate({ ...baseParams, gameId: 5, homeTeam: 'LG', awayTeam: 'OB' }),
      makeCandidate({ ...baseParams, gameId: 3, homeTeam: 'HT', awayTeam: 'SS' }),
    ];
    const r = selectBigMatch(candidates);
    expect(r.bigMatchGameId).toBe(3); // 같은 점수지만 gameId 낮은 쪽
  });

  it('결정론적 전체 호출 (같은 입력 = 같은 출력)', () => {
    const candidates = [
      makeCandidate({ gameId: 1, homeTeam: 'LG', awayTeam: 'OB' }),
      makeCandidate({ gameId: 2, homeTeam: 'HT', awayTeam: 'SS' }),
    ];
    const r1 = selectBigMatch(candidates);
    const r2 = selectBigMatch(candidates);
    expect(r1).toEqual(r2);
  });
});
