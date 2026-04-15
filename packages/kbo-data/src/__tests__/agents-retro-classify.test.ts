import { describe, it, expect } from 'vitest';
import {
  classifyMemoryType,
  buildMemoryForTeam,
  addDays,
} from '../agents/retro';

// ============================================
// classifyMemoryType
// ============================================
describe('classifyMemoryType', () => {
  it('head_to_head 팩터 → matchup', () => {
    const t = classifyMemoryType({
      factorKey: 'head_to_head_rate',
      factorValue: 0.7,
      teamSide: 'home',
      teamWon: true,
    });
    expect(t).toBe('matchup');
  });

  it('h2h 별칭 → matchup', () => {
    expect(
      classifyMemoryType({
        factorKey: 'h2h_win_rate',
        factorValue: 0.3,
        teamSide: 'away',
        teamWon: false,
      })
    ).toBe('matchup');
  });

  it('편향 ≤ 0.05 → pattern', () => {
    expect(
      classifyMemoryType({
        factorKey: 'home_sp_fip',
        factorValue: 0.52,
        teamSide: 'home',
        teamWon: true,
      })
    ).toBe('pattern');
  });

  it('홈팀이 이겼고 factor도 홈 유리 → strength (반영 잘됨)', () => {
    expect(
      classifyMemoryType({
        factorKey: 'home_sp_fip',
        factorValue: 0.7, // 홈 유리
        teamSide: 'home',
        teamWon: true,
      })
    ).toBe('strength');
  });

  it('홈팀이 졌는데 factor는 홈 유리 → weakness (factor 반영 부족)', () => {
    expect(
      classifyMemoryType({
        factorKey: 'home_bullpen_fip',
        factorValue: 0.7,
        teamSide: 'home',
        teamWon: false,
      })
    ).toBe('weakness');
  });

  it('원정팀이 이겼고 factor는 원정 유리(value<0.5) → strength', () => {
    expect(
      classifyMemoryType({
        factorKey: 'away_lineup_woba',
        factorValue: 0.3, // 원정 유리
        teamSide: 'away',
        teamWon: true,
      })
    ).toBe('strength');
  });

  it('원정팀이 졌는데 factor는 원정 유리 → weakness', () => {
    expect(
      classifyMemoryType({
        factorKey: 'away_lineup_woba',
        factorValue: 0.3,
        teamSide: 'away',
        teamWon: false,
      })
    ).toBe('weakness');
  });
});

// ============================================
// addDays
// ============================================
describe('addDays', () => {
  it('2026-04-15 + 7 = 2026-04-22', () => {
    expect(addDays('2026-04-15', 7)).toBe('2026-04-22');
  });
  it('월말 넘김', () => {
    expect(addDays('2026-04-28', 7)).toBe('2026-05-05');
  });
});

// ============================================
// buildMemoryForTeam
// ============================================
describe('buildMemoryForTeam', () => {
  it('factors 빈 객체 → null', () => {
    const m = buildMemoryForTeam({
      factors: {},
      teamCode: 'LG',
      teamSide: 'home',
      teamWon: false,
      date: '2026-04-15',
      opponentCode: 'OB',
    });
    expect(m).toBeNull();
  });

  it('모든 factor가 0.5 → null (bias 없음)', () => {
    const m = buildMemoryForTeam({
      factors: { home_sp_fip: 0.5, home_lineup_woba: 0.5 },
      teamCode: 'LG',
      teamSide: 'home',
      teamWon: false,
      date: '2026-04-15',
      opponentCode: 'OB',
    });
    expect(m).toBeNull();
  });

  it('maxBias factor 선택 + weakness 분류 (홈팀이 졌는데 factor 유리)', () => {
    const m = buildMemoryForTeam({
      factors: { home_sp_fip: 0.75, park_factor: 0.52 },
      teamCode: 'LG',
      teamSide: 'home',
      teamWon: false,
      date: '2026-04-15',
      opponentCode: 'OB',
    });
    expect(m).not.toBeNull();
    expect(m!.type).toBe('weakness');
    expect(m!.content).toContain('LG');
    expect(m!.content).toContain('home_sp_fip');
    expect(m!.content).toContain('weakness');
    expect(m!.content).toContain('vs OB');
    expect(m!.confidence).toBe(0.6);
  });

  it('strength 케이스 (원정팀이 이겼고 factor도 원정 유리)', () => {
    const m = buildMemoryForTeam({
      factors: { away_bullpen_fip: 0.2 },
      teamCode: 'OB',
      teamSide: 'away',
      teamWon: true,
      date: '2026-04-15',
      opponentCode: 'LG',
    });
    expect(m).not.toBeNull();
    expect(m!.type).toBe('strength');
    expect(m!.content).toContain('OB');
  });
});
