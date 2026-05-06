import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBatterLeaders } from '../scrapers/fangraphs';

describe('fetchBatterLeaders parseNum NaN fallback to 0 silent drift 가시화', () => {
  // FanGraphs row 구조: cells.length>=8 강제.
  // cells[0]=rank, cells[1]=team, cells[2]=name, cells[3]=age,
  // cells[4]=wrcPlus, cells[5]=iso, cells[6]=bbPct, cells[7]=kPct.
  const buildHtml = (
    wrcPlus: string,
    iso: string,
    bbPct: string,
    kPct: string,
  ) => `<html><body><table><tbody>
      <tr>
        <td>1</td>
        <td>LG Twins</td>
        <td>Hong</td>
        <td>27</td>
        <td>${wrcPlus}</td>
        <td>${iso}</td>
        <td>${bbPct}</td>
        <td>${kPct}</td>
      </tr>
    </tbody></table></body></html>`;

  let warnSpy: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    fetchSpy?.mockRestore();
  });

  const mockHtml = (html: string) => {
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(html, { status: 200 }));
  };

  it('정상 stat → NaN warn 호출 X', async () => {
    mockHtml(buildHtml('120', '0.180', '0.090', '0.220'));
    const result = await fetchBatterLeaders(2026);
    expect(result).toHaveLength(1);
    expect(result[0].wrcPlus).toBe(120);
    const nanWarns = warnSpy.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('parseNum NaN fallback to 0 silent drift'),
    );
    expect(nanWarns.length).toBe(0);
  });

  it('wrcPlus 셀 NaN → wrcPlus warn 1회 + ratio=1.00 + 평균 0 silent', async () => {
    mockHtml(buildHtml('', '0.180', '0.090', '0.220'));
    const result = await fetchBatterLeaders(2026);
    expect(result).toHaveLength(1);
    expect(result[0].wrcPlus).toBe(0);
    expect(result[0].iso).toBe(0.18);

    const nanWarns = warnSpy.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('parseNum NaN fallback to 0 silent drift'),
    );
    const wrcWarn = nanWarns.find(
      (call: unknown[]) =>
        typeof call[1] === 'object' &&
        call[1] !== null &&
        (call[1] as Record<string, unknown>).label === 'wrcPlus',
    );
    expect(wrcWarn).toBeDefined();
    expect(wrcWarn?.[1]).toMatchObject({
      label: 'wrcPlus',
      nanCount: 1,
      totalRows: 1,
      ratio: '1.00',
    });
  });

  it('전체 stat NaN → 4 warn 호출 + 모두 ratio=1.00', async () => {
    mockHtml(buildHtml('—', '—', '—', '—'));
    const result = await fetchBatterLeaders(2026);
    expect(result).toHaveLength(1);
    expect(result[0].wrcPlus).toBe(0);
    expect(result[0].iso).toBe(0);
    expect(result[0].bbPct).toBe(0);
    expect(result[0].kPct).toBe(0);

    const nanWarns = warnSpy.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('parseNum NaN fallback to 0 silent drift'),
    );
    expect(nanWarns.length).toBe(4);
    for (const call of nanWarns) {
      expect(call[1]).toMatchObject({ ratio: '1.00', nanCount: 1, totalRows: 1 });
    }
  });

  it('row 0건 (페이지 구조 변경 시나리오) → empty table warn 1회', async () => {
    mockHtml('<html><body><table><tbody></tbody></table></body></html>');
    const result = await fetchBatterLeaders(2026);
    expect(result).toHaveLength(0);
    const emptyWarns = warnSpy.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('empty table silent drift'),
    );
    expect(emptyWarns.length).toBe(1);
    expect(emptyWarns[0][1]).toMatchObject({ ratio: '1.00' });
  });
});
