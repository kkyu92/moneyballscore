import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectFancyStatsFallbacks,
  hasAnyFallback,
  fetchTeamStats,
} from '../scrapers/fancy-stats';

describe('detectFancyStatsFallbacks', () => {
  it('정상 값은 모두 false', () => {
    const flags = detectFancyStatsFallbacks({
      elo: 1500,
      woba: 0.320,
      fip: 4.0,
      sfr: 0.05,
    });
    expect(flags).toEqual({ elo: false, woba: false, fip: false, sfr: false });
  });

  it('모든 값 0 일 때 모두 true (페이지 구조 변경 시나리오)', () => {
    const flags = detectFancyStatsFallbacks({
      elo: 0,
      woba: 0,
      fip: 0,
      sfr: 0,
    });
    expect(flags).toEqual({ elo: true, woba: true, fip: true, sfr: true });
  });

  it('SFR 만 0 일 때 sfr 만 true (수비력 평균 팀 위양성 케이스)', () => {
    const flags = detectFancyStatsFallbacks({
      elo: 1480,
      woba: 0.310,
      fip: 4.2,
      sfr: 0,
    });
    expect(flags.sfr).toBe(true);
    expect(flags.elo).toBe(false);
    expect(flags.woba).toBe(false);
    expect(flags.fip).toBe(false);
  });

  it('NaN 도 falsy 처리', () => {
    const flags = detectFancyStatsFallbacks({
      elo: NaN,
      woba: 0.320,
      fip: NaN,
      sfr: 0.05,
    });
    expect(flags.elo).toBe(true);
    expect(flags.fip).toBe(true);
    expect(flags.woba).toBe(false);
    expect(flags.sfr).toBe(false);
  });
});

describe('hasAnyFallback', () => {
  it('모두 false 면 false', () => {
    expect(hasAnyFallback({ elo: false, woba: false, fip: false, sfr: false })).toBe(false);
  });

  it('하나라도 true 면 true', () => {
    expect(hasAnyFallback({ elo: false, woba: false, fip: false, sfr: true })).toBe(true);
    expect(hasAnyFallback({ elo: true, woba: false, fip: false, sfr: false })).toBe(true);
  });

  it('모두 true 면 true', () => {
    expect(hasAnyFallback({ elo: true, woba: true, fip: true, sfr: true })).toBe(true);
  });
});

describe('fetchTeamStats totalWar=0 stub 가시화', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        `<html><body><table><tbody>
          <tr><td>1</td><td>LG Twins</td><td>1550</td><td>0.330</td><td>4.10</td><td>0.5</td><td>1</td></tr>
          <tr><td>2</td><td>KT Wiz</td><td>1480</td><td>0.310</td><td>4.30</td><td>-0.2</td><td>2</td></tr>
        </tbody></table></body></html>`,
        { status: 200 },
      ),
    );
  });

  afterEach(() => {
    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('호출 결과 모든 팀 totalWar=0 stub + console.warn 1회 가시화', async () => {
    const result = await fetchTeamStats(2026);
    expect(result.every((t) => t.totalWar === 0)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const stubWarns = warnSpy.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('totalWar=0 stub'),
    );
    expect(stubWarns.length).toBe(1);
    expect(stubWarns[0][1]).toMatchObject({
      teamCount: result.length,
      teams: expect.arrayContaining(result.map((t) => t.team)),
    });
  });
});
