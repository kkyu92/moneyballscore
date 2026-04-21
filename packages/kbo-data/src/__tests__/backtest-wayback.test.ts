import { describe, it, expect } from 'vitest';
import { parseEloTable } from '../backtest/wayback-team-stats';

describe('parseEloTable', () => {
  it('extracts team rows with Elo/wOBA/FIP/SFR', () => {
    const html = `
      <table>
        <tr><th>Current Elos & Stats</th><th>Playoff %</th></tr>
        <tr><th>Team</th><th>Elo</th><th>wOBA</th><th>FIP</th><th>SFR</th><th>1st</th></tr>
        <tr><td>1</td><td>LG Twins</td><td>1568</td><td>0.330</td><td>3.89</td><td>-0.6</td><td>98.4</td></tr>
        <tr><td>2</td><td>Hanwha Eagles</td><td>1453</td><td>0.298</td><td>4.23</td><td>2.7</td><td>0.0</td></tr>
      </table>
    `;
    const map = parseEloTable(html);
    expect(map.size).toBe(2);
    expect(map.get('LG')).toEqual({ elo: 1568, woba: 0.33, fip: 3.89, sfr: -0.6 });
    expect(map.get('HH')).toEqual({ elo: 1453, woba: 0.298, fip: 4.23, sfr: 2.7 });
  });

  it('ignores non-team rows (header, rank > 10)', () => {
    const html = `
      <table>
        <tr><td>Team</td><td>Elo</td><td>wOBA</td><td>FIP</td><td>SFR</td><td>X</td></tr>
        <tr><td>99</td><td>Nonsense</td><td>1</td><td>2</td><td>3</td><td>4</td></tr>
      </table>
    `;
    const map = parseEloTable(html);
    expect(map.size).toBe(0);
  });
});
