import { describe, it, expect } from 'vitest';
import { matchPitcher, normalizeName, tagSource } from '../pipeline/snapshot-pitchers';
import type { PitcherStats } from '../types';

describe('normalizeName', () => {
  it('trims whitespace', () => {
    expect(normalizeName('  김광현  ')).toBe('김광현');
  });
  it('collapses internal whitespace', () => {
    expect(normalizeName('양 의 지')).toBe('양의지');
  });
  it('preserves tabs and multiple spaces', () => {
    expect(normalizeName('김\t민수 ')).toBe('김민수');
  });
});

describe('matchPitcher', () => {
  const teamMap = { LG: 1, SS: 2, HT: 3 };
  const pitchers = [
    { id: 101, name_ko: '김광현', team_id: 2 }, // SS
    { id: 102, name_ko: '양의지', team_id: 1 }, // LG
    { id: 103, name_ko: '동명이인', team_id: 1 },
    { id: 104, name_ko: '동명이인', team_id: 3 },
  ];

  it('matches on name + current team', () => {
    const r = matchPitcher('김광현', 'SS', teamMap, pitchers);
    expect(r.playerId).toBe(101);
    expect(r.reason).toBe('match');
  });

  it('ignores extra whitespace', () => {
    const r = matchPitcher(' 김광현 ', 'SS', teamMap, pitchers);
    expect(r.playerId).toBe(101);
  });

  it('falls back to name-only when current team row not found but name unique', () => {
    // 이적 시뮬: "양의지" 가 팀 SS 에서 등판 (실제 LG 소속)
    const r = matchPitcher('양의지', 'SS', teamMap, pitchers);
    expect(r.playerId).toBe(102);
    expect(r.reason).toBe('match');
  });

  it('returns name_miss when name exists twice (동명이인)', () => {
    const r = matchPitcher('동명이인', 'SS', teamMap, pitchers); // SS 팀엔 없음, 이름은 2건
    expect(r.playerId).toBeNull();
    expect(r.reason).toBe('name_miss');
  });

  it('resolves 동명이인 via team disambiguation', () => {
    const r = matchPitcher('동명이인', 'LG', teamMap, pitchers);
    expect(r.playerId).toBe(103);
    expect(r.reason).toBe('match');
  });

  it('returns team_miss for unknown team code', () => {
    const r = matchPitcher('김광현', 'XX' as never, teamMap, pitchers);
    expect(r.playerId).toBeNull();
    expect(r.reason).toBe('team_miss');
  });

  it('returns name_miss when name absent entirely', () => {
    const r = matchPitcher('없는선수', 'LG', teamMap, pitchers);
    expect(r.playerId).toBeNull();
    expect(r.reason).toBe('name_miss');
  });
});

describe('tagSource', () => {
  const base: PitcherStats = {
    name: '투수A', team: 'LG',
    fip: 4.0, xfip: 4.0, era: 4.0, innings: 50, war: 0, kPer9: 7.0,
  };

  it('tags as kbo-basic1 when WAR=0 and xfip===fip (Basic1 signature)', () => {
    const r = tagSource([base]);
    expect(r[0]._source).toBe('kbo-basic1');
  });

  it('tags as fancy-stats when WAR > 0', () => {
    const r = tagSource([{ ...base, war: 2.5 }]);
    expect(r[0]._source).toBe('fancy-stats');
  });

  it('tags as fancy-stats when xfip differs from fip (Fancy has real xfip)', () => {
    const r = tagSource([{ ...base, xfip: 3.8 }]);
    expect(r[0]._source).toBe('fancy-stats');
  });

  it('preserves all original fields', () => {
    const r = tagSource([base]);
    expect(r[0].name).toBe('투수A');
    expect(r[0].fip).toBe(4.0);
    expect(r[0].innings).toBe(50);
  });

  it('handles empty input', () => {
    expect(tagSource([])).toEqual([]);
  });
});
