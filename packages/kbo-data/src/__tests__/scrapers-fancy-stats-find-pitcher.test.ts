import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findPitcher } from '../scrapers/fancy-stats';
import type { PitcherStats } from '../types';

const samplePitchers: PitcherStats[] = [
  { name: '김원중', team: 'LT', fip: 3.50, xfip: 3.40, era: 0, innings: 0, war: 1.5, kPer9: 9.2 },
  { name: '박세웅', team: 'LT', fip: 3.80, xfip: 3.70, era: 0, innings: 0, war: 1.2, kPer9: 8.5 },
  { name: '김원중', team: 'KT', fip: 4.20, xfip: 4.10, era: 0, innings: 0, war: 0.8, kPer9: 7.8 }, // 가상의 동명이인
];

describe('findPitcher', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('exact 매칭 (이름+팀) → 해당 row 반환 + warn 없음', () => {
    const result = findPitcher(samplePitchers, '박세웅', 'LT');
    expect(result).not.toBeNull();
    expect(result?.team).toBe('LT');
    expect(result?.fip).toBe(3.80);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('이름 자체 매칭 X → null + warn 없음', () => {
    const result = findPitcher(samplePitchers, '존재안함', 'LT');
    expect(result).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('byName fallback team mismatch → row 반환 + console.warn 1회 (silent drift 가시화)', () => {
    // KBO 가상 동명이인 시나리오 — game.homeSP="김원중" / game.homeTeam="SS" 인데
    // pitcherStats 에 ("김원중","SS") row 없음. exact 실패 후 byName 첫 결과 (LT 김원중)
    // 반환 = wrong-team stat. cycle 145 xfip fallback family 패턴 — 가시화로 silent 차단.
    const result = findPitcher(samplePitchers, '김원중', 'SS');
    expect(result).not.toBeNull();
    expect(result?.team).toBe('LT'); // 첫 byName 결과 (동작 호환 유지)
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[findPitcher] byName fallback team mismatch silent drift',
      expect.objectContaining({
        name: '김원중',
        requestedTeam: 'SS',
        foundTeam: 'LT',
      }),
    );
  });

  it('exact 우선 — 동명이인 정상 매칭', () => {
    // 입력 team=KT 일 때 exact 매칭이 KT 김원중 잡아 byName fallback 진입 X.
    const result = findPitcher(samplePitchers, '김원중', 'KT');
    expect(result).not.toBeNull();
    expect(result?.team).toBe('KT');
    expect(result?.fip).toBe(4.20);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
