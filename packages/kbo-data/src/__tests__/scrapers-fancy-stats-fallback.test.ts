import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectFancyStatsFallbacks,
  hasAnyFallback,
  fetchTeamStats,
  fetchEloRatings,
  parsePitchersFromHtml,
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

describe('fetchEloRatings winPct=0.5 stub 가시화', () => {
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

  it('호출 결과 모든 팀 winPct=0.5 stub + console.warn 1회 가시화', async () => {
    const result = await fetchEloRatings(2026);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.winPct === 0.5)).toBe(true);
    const stubWarns = warnSpy.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('winPct=0.5 stub'),
    );
    expect(stubWarns.length).toBe(1);
    expect(stubWarns[0][1]).toMatchObject({
      teamCount: result.length,
      teams: expect.arrayContaining(result.map((r) => r.team)),
    });
  });

  it('teams 배열 0건이면 winPct stub warn 발생 X (안전)', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(`<html><body><table><tbody></tbody></table></body></html>`, { status: 200 }),
    );
    const result = await fetchEloRatings(2026);
    expect(result.length).toBe(0);
    const stubWarns = warnSpy.mock.calls.filter(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('winPct=0.5 stub'),
    );
    expect(stubWarns.length).toBe(0);
  });
});

describe('parsePitchersFromHtml xfip fallback to fip silent drift 가시화', () => {
  // table 0~3 batter (empty), 4 WAR / 5 FIP / 6 xFIP / 7 K/9. cells.length>=5 강제.
  const buildHtml = (xfipRows: string) => `
    <table><tbody></tbody></table>
    <table><tbody></tbody></table>
    <table><tbody></tbody></table>
    <table><tbody></tbody></table>
    <table><tbody>
      <tr><td>1</td><td>Ryu | 류현진</td><td>Hanwha Eagles</td><td>37</td><td>3.2</td></tr>
      <tr><td>2</td><td>Won | 원태인</td><td>Samsung Lions</td><td>25</td><td>2.8</td></tr>
    </tbody></table>
    <table><tbody>
      <tr><td>1</td><td>Ryu | 류현진</td><td>Hanwha Eagles</td><td>37</td><td>3.50</td></tr>
      <tr><td>2</td><td>Won | 원태인</td><td>Samsung Lions</td><td>25</td><td>3.80</td></tr>
    </tbody></table>
    <table><tbody>${xfipRows}</tbody></table>
    <table><tbody>
      <tr><td>1</td><td>Ryu | 류현진</td><td>Hanwha Eagles</td><td>37</td><td>9.5</td></tr>
      <tr><td>2</td><td>Won | 원태인</td><td>Samsung Lions</td><td>25</td><td>8.2</td></tr>
    </tbody></table>
  `;

  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('xfip 전부 정상 cover → console.warn 호출 X (silent drift 부재)', () => {
    const html = buildHtml(`
      <tr><td>1</td><td>Ryu | 류현진</td><td>Hanwha Eagles</td><td>37</td><td>3.40</td></tr>
      <tr><td>2</td><td>Won | 원태인</td><td>Samsung Lions</td><td>25</td><td>3.75</td></tr>
    `);
    const pitchers = parsePitchersFromHtml(html);
    expect(pitchers).toHaveLength(2);
    // xfip 정상 매핑 (fip 와 다른 값)
    expect(pitchers.find((p) => p.name === '류현진')?.xfip).toBe(3.40);
    expect(pitchers.find((p) => p.name === '원태인')?.xfip).toBe(3.75);
    const fallbackWarns = warnSpy.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('xfip fallback to fip silent drift'),
    );
    expect(fallbackWarns.length).toBe(0);
  });

  it('xfip 일부 결손 → console.warn 1회 + fallbackRatio 측정 + xfip=fip silent 박제', () => {
    // 류현진 만 xfip 있고 원태인 누락
    const html = buildHtml(`
      <tr><td>1</td><td>Ryu | 류현진</td><td>Hanwha Eagles</td><td>37</td><td>3.40</td></tr>
    `);
    const pitchers = parsePitchersFromHtml(html);
    expect(pitchers).toHaveLength(2);
    expect(pitchers.find((p) => p.name === '류현진')?.xfip).toBe(3.40);
    // 원태인 = xfip fallback (fip 값 silent 중복)
    const won = pitchers.find((p) => p.name === '원태인');
    expect(won?.xfip).toBe(3.80);
    expect(won?.fip).toBe(3.80);
    // snapshot-pitchers source 라벨링 silent drift evidence:
    // war>0 + xfip===fip 로 'kbo-basic1' 오분류 가능 — 본 테스트가 그 패턴 박제
    expect(won?.war).toBe(2.8);

    const fallbackWarns = warnSpy.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('xfip fallback to fip silent drift'),
    );
    expect(fallbackWarns.length).toBe(1);
    expect(fallbackWarns[0][1]).toMatchObject({
      fallbackCount: 1,
      totalPitchers: 2,
      fallbackRatio: '0.50',
    });
  });

  it('xfip 전부 결손 → console.warn 1회 + ratio=1.00', () => {
    const html = buildHtml('');
    const pitchers = parsePitchersFromHtml(html);
    expect(pitchers).toHaveLength(2);
    // 모든 투수 xfip = fip silent drift
    for (const p of pitchers) {
      expect(p.xfip).toBe(p.fip);
    }

    const fallbackWarns = warnSpy.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('xfip fallback to fip silent drift'),
    );
    expect(fallbackWarns.length).toBe(1);
    expect(fallbackWarns[0][1]).toMatchObject({
      fallbackCount: 2,
      totalPitchers: 2,
      fallbackRatio: '1.00',
    });
  });

  it('fipMap 0건 (table 5 비어있음) → console.warn 호출 X (안전)', () => {
    const html = `
      <table><tbody></tbody></table>
      <table><tbody></tbody></table>
      <table><tbody></tbody></table>
      <table><tbody></tbody></table>
      <table><tbody></tbody></table>
      <table><tbody></tbody></table>
      <table><tbody></tbody></table>
      <table><tbody></tbody></table>
    `;
    const pitchers = parsePitchersFromHtml(html);
    expect(pitchers).toHaveLength(0);
    const fallbackWarns = warnSpy.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('xfip fallback to fip silent drift'),
    );
    expect(fallbackWarns.length).toBe(0);
  });
});
