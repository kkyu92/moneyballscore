import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSavantTeamStatcast } from '../baseball-savant';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

global.fetch = vi.fn();

beforeEach(() => {
  vi.mocked(global.fetch as any).mockReset();
});

const EXPECTED_CSV =
  '﻿"team","team_id","year","pa","bip","ba","est_ba","est_ba_minus_ba_diff","slg","est_slg","est_slg_minus_slg_diff","woba","est_woba","est_woba_minus_woba_diff"\n' +
  '"Dodgers","LAD","2026","4700","3100",0.26,0.25,0.01,0.44,0.42,0.02,0.34,0.351,0.011\n' +
  '"Yankees","NYY","2026","4650","3080",0.255,0.245,0.01,0.43,0.41,0.02,0.33,0.339,0.009';

const STATCAST_CSV =
  '﻿"team","team_id","attempts","avg_hit_angle","anglesweetspotpercent","max_hit_speed","avg_hit_speed","ev50","fbld","gb","max_distance","avg_distance","avg_hr_distance","ev95plus","ev95percent","barrels","brl_percent","brl_pa"\n' +
  '"Dodgers","LAD","3200","12.3",33.1,"117","89.1","99.5","92.5","86.1","460","165","400","1250",38.5,"210",10.4,5.2\n' +
  '"Yankees","NYY","3150","11.8",32.4,"116.5","88.7","99.1","92.1","85.8","455","162","398","1220",37.2,"200",9.1,4.9';

function mockTwoFetches(a: string, b: string) {
  vi.mocked(global.fetch as any)
    .mockResolvedValueOnce({ ok: true, text: async () => a })
    .mockResolvedValueOnce({ ok: true, text: async () => b });
}

describe('baseball-savant.fetchSavantTeamStatcast', () => {
  it('merges expected_statistics(est_woba) + statcast(barrel/hard-hit/launch) by team_id', async () => {
    mockTwoFetches(EXPECTED_CSV, STATCAST_CSV);

    const teams = await fetchSavantTeamStatcast(2026);
    expect(teams).toHaveLength(2);
    expect(teams.find((t) => t.teamCode === 'LAD')).toEqual({
      teamCode: 'LAD',
      xwoba: 0.351,
      barrelPct: 10.4,
      hardHitPct: 38.5,
      launchAngle: 12.3,
    });
  });

  it('remaps Savant short codes to internal MLB_TEAMS codes (AZ/CWS/KC/SD/SF/TB/WSH)', async () => {
    const expected =
      '"team","team_id","year","pa","bip","ba","est_ba","est_ba_minus_ba_diff","slg","est_slg","est_slg_minus_slg_diff","woba","est_woba","est_woba_minus_woba_diff"\n' +
      '"D-backs","AZ","2026","4700","3100",0.26,0.25,0.01,0.44,0.42,0.02,0.34,0.33,0.01\n' +
      '"Nationals","WSH","2026","4650","3080",0.255,0.245,0.01,0.43,0.41,0.02,0.33,0.32,0.01';
    const statcast =
      '"team","team_id","attempts","avg_hit_angle","anglesweetspotpercent","max_hit_speed","avg_hit_speed","ev50","fbld","gb","max_distance","avg_distance","avg_hr_distance","ev95plus","ev95percent","barrels","brl_percent","brl_pa"\n' +
      '"D-backs","AZ","3200","13",33.1,"117","89.1","99.5","92.5","86.1","460","165","400","1250",37,"210",7,5.2\n' +
      '"Nationals","WSH","3150","13.5",32.4,"116.5","88.7","99.1","92.1","85.8","455","162","398","1220",36,"200",8,4.9';
    mockTwoFetches(expected, statcast);

    const teams = await fetchSavantTeamStatcast(2026);
    const codes = teams.map((t) => t.teamCode).sort();
    expect(codes).toEqual(['ARI', 'WSN']);
  });

  it('skips teams with invalid xwOBA (range 0~0.5)', async () => {
    const expected =
      '"team","team_id","year","pa","bip","ba","est_ba","est_ba_minus_ba_diff","slg","est_slg","est_slg_minus_slg_diff","woba","est_woba","est_woba_minus_woba_diff"\n' +
      '"Dodgers","LAD","2026","4700","3100",0.26,0.25,0.01,0.44,0.42,0.02,0.34,0.999,0.01';
    const statcast =
      '"team","team_id","attempts","avg_hit_angle","anglesweetspotpercent","max_hit_speed","avg_hit_speed","ev50","fbld","gb","max_distance","avg_distance","avg_hr_distance","ev95plus","ev95percent","barrels","brl_percent","brl_pa"\n' +
      '"Dodgers","LAD","3200","12.3",33.1,"117","89.1","99.5","92.5","86.1","460","165","400","1250",38.5,"210",10.4,5.2';
    mockTwoFetches(expected, statcast);

    const teams = await fetchSavantTeamStatcast(2026);
    expect(teams).toEqual([]);
  });

  it('throws on expected_statistics CSV format change (missing est_woba/team_id column)', async () => {
    mockTwoFetches('foo,bar\n1,2', STATCAST_CSV);

    await expect(fetchSavantTeamStatcast(2026)).rejects.toThrow(/parse fail/);
  });

  it('throws on statcast CSV format change (missing brl_percent/ev95percent/avg_hit_angle column)', async () => {
    mockTwoFetches(EXPECTED_CSV, 'foo,bar\n1,2');

    await expect(fetchSavantTeamStatcast(2026)).rejects.toThrow(/parse fail/);
  });
});
