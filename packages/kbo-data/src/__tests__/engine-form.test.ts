import { describe, expect, it } from 'vitest';
import {
  calculateRecentForm,
  calculateHeadToHead,
  type FinishedGame,
} from '../engine/form';

// teamId 매핑 (테스트용 가상)
const OB = 1;
const HT = 2;
const LG = 3;
const SS = 4;

function g(home: number, away: number, winner: number | null): FinishedGame {
  return { home_team_id: home, away_team_id: away, winner_team_id: winner };
}

describe('calculateRecentForm', () => {
  it('경기 없으면 null', () => {
    expect(calculateRecentForm([], OB, 10)).toBeNull();
  });

  it('teamId 해당 없음이면 null', () => {
    const games = [g(LG, SS, LG), g(LG, HT, HT)];
    expect(calculateRecentForm(games, OB, 10)).toBeNull();
  });

  it('홈에서 승 2 + 패 1 = 0.667', () => {
    const games = [
      g(OB, HT, OB),
      g(OB, LG, LG),
      g(OB, SS, OB),
    ];
    expect(calculateRecentForm(games, OB, 10)).toBeCloseTo(0.667, 2);
  });

  it('원정으로 승 1 + 패 0 = 1.0', () => {
    const games = [g(HT, OB, OB)];
    expect(calculateRecentForm(games, OB, 10)).toBe(1.0);
  });

  it('승자 null (무승부/기권) 은 패로 계산', () => {
    const games = [g(OB, HT, OB), g(OB, LG, null)];
    expect(calculateRecentForm(games, OB, 10)).toBe(0.5);
  });

  it('lastN 초과 경기는 제외', () => {
    // OB 관련 15경기, 모두 OB 승. lastN=10 → 10승 = 1.0
    const games: FinishedGame[] = Array.from({ length: 15 }, () =>
      g(OB, HT, OB),
    );
    expect(calculateRecentForm(games, OB, 10)).toBe(1.0);
  });

  it('다른 팀 경기 섞여 있어도 teamId 기준 필터링', () => {
    const games = [
      g(LG, SS, LG), // 무관
      g(OB, HT, OB), // OB 승
      g(HT, OB, OB), // OB 승
      g(LG, HT, HT), // 무관
      g(OB, LG, LG), // OB 패
    ];
    // OB 3경기 중 2승 = 0.667
    expect(calculateRecentForm(games, OB, 10)).toBeCloseTo(0.667, 2);
  });

  it('lastN=5 로 제한', () => {
    const games = [
      g(OB, HT, OB), // win
      g(OB, LG, OB), // win
      g(OB, SS, SS), // loss
      g(OB, HT, OB), // win
      g(OB, LG, LG), // loss
      g(OB, SS, OB), // win (6번째, 제외)
    ];
    // lastN=5 → 첫 5경기만: 3승 2패 = 0.6
    expect(calculateRecentForm(games, OB, 5)).toBe(0.6);
  });
});

describe('calculateHeadToHead', () => {
  it('맞상대 경기 없으면 0-0', () => {
    const games = [g(LG, SS, LG)];
    expect(calculateHeadToHead(games, OB, HT)).toEqual({ wins: 0, losses: 0 });
  });

  it('homeTeamId 승 2 + 패 1', () => {
    const games = [
      g(OB, HT, OB), // OB win
      g(HT, OB, OB), // OB win (원정)
      g(OB, HT, HT), // OB loss
    ];
    expect(calculateHeadToHead(games, OB, HT)).toEqual({ wins: 2, losses: 1 });
  });

  it('순서 무관 — 원정 경기 포함', () => {
    const games = [
      g(HT, OB, HT), // OB 원정 패
      g(HT, OB, OB), // OB 원정 승
    ];
    expect(calculateHeadToHead(games, OB, HT)).toEqual({ wins: 1, losses: 1 });
  });

  it('다른 팀 경기는 무시', () => {
    const games = [
      g(OB, HT, OB),
      g(LG, SS, LG), // 무관
      g(OB, SS, OB), // 무관 (다른 상대)
    ];
    expect(calculateHeadToHead(games, OB, HT)).toEqual({ wins: 1, losses: 0 });
  });

  it('winner null 은 양쪽 스킵', () => {
    const games = [g(OB, HT, null)];
    expect(calculateHeadToHead(games, OB, HT)).toEqual({ wins: 0, losses: 0 });
  });

  it('homeTeamId / awayTeamId 순서 바꿔도 상대전적 동일하게 계산', () => {
    const games = [g(OB, HT, OB), g(OB, HT, HT)];
    expect(calculateHeadToHead(games, OB, HT)).toEqual({ wins: 1, losses: 1 });
    // HT 기준: HT 1승 OB 에게 1패
    expect(calculateHeadToHead(games, HT, OB)).toEqual({ wins: 1, losses: 1 });
  });
});
