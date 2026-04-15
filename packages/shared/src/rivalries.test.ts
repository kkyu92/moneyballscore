import { describe, it, expect } from 'vitest';
import { KBO_RIVALRIES, isRivalry } from './rivalries';

describe('KBO_RIVALRIES', () => {
  it('5쌍 정의', () => {
    expect(KBO_RIVALRIES).toHaveLength(5);
  });

  it('각 쌍이 정확히 2팀', () => {
    for (const pair of KBO_RIVALRIES) {
      expect(pair).toHaveLength(2);
    }
  });

  it('중복 쌍 없음', () => {
    const keys = KBO_RIVALRIES.map(([a, b]) => [a, b].sort().join('-'));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('isRivalry', () => {
  it('LG-OB 양방향 true', () => {
    expect(isRivalry('LG', 'OB')).toBe(true);
    expect(isRivalry('OB', 'LG')).toBe(true);
  });

  it('HT-SS 양방향 true (KIA = HT)', () => {
    expect(isRivalry('HT', 'SS')).toBe(true);
    expect(isRivalry('SS', 'HT')).toBe(true);
  });

  it('NC-LT 양방향 true', () => {
    expect(isRivalry('NC', 'LT')).toBe(true);
    expect(isRivalry('LT', 'NC')).toBe(true);
  });

  it('라이벌 아닌 조합 false', () => {
    expect(isRivalry('LG', 'SK')).toBe(false);
    expect(isRivalry('KT', 'NC')).toBe(false);
  });

  it('같은 팀 코드 false (edge case)', () => {
    expect(isRivalry('LG', 'LG')).toBe(false);
  });
});
