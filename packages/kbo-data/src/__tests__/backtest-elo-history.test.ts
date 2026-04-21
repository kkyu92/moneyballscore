import { describe, it, expect } from 'vitest';
import { parseTextBlock, parseEloHistory, getEloAt } from '../backtest/elo-history';

describe('parseTextBlock', () => {
  it('extracts date + elo from plotly text string', () => {
    const raw = [
      'date: 2007-04-06<br />elo: 1501.862<br />team: LG Twins',
      'date: 2007-04-07<br />elo: 1498.350<br />team: LG Twins',
      'date: 2007-04-08<br />elo: 1495.353<br />team: LG Twins',
    ].join('","'); // Plotly JSON-embedded join
    const pts = parseTextBlock(raw);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ date: '2007-04-06', elo: 1501.862 });
    expect(pts[2]).toEqual({ date: '2007-04-08', elo: 1495.353 });
  });

  it('ignores malformed pieces', () => {
    const raw = 'date: 2025-03-22<br />elo: 1500.0<br />team: X","garbage';
    const pts = parseTextBlock(raw);
    expect(pts.length).toBeGreaterThanOrEqual(1);
    expect(pts[0].date).toBe('2025-03-22');
  });
});

describe('parseEloHistory', () => {
  it('maps trace name → team code with text array', () => {
    // LG Twins trace + Doosan Bears trace
    const html = `
      {"name":"LG Twins","mode":"lines","y":[1500,1502],"text":["date: 2025-04-01<br />elo: 1500.000<br />team: LG Twins","date: 2025-04-02<br />elo: 1502.500<br />team: LG Twins"]},
      {"name":"Doosan Bears","mode":"lines","y":[1480,1478],"text":["date: 2025-04-01<br />elo: 1480.000<br />team: Doosan Bears","date: 2025-04-02<br />elo: 1478.000<br />team: Doosan Bears"]}
    `;
    const h = parseEloHistory(html);
    expect(h.has('LG')).toBe(true);
    expect(h.has('OB')).toBe(true);
    expect(h.get('LG')).toHaveLength(2);
    expect(h.get('LG')![0].date).toBe('2025-04-01');
  });
});

describe('getEloAt', () => {
  const hist = [
    { date: '2025-04-01', elo: 1500 },
    { date: '2025-04-05', elo: 1510 },
    { date: '2025-04-10', elo: 1490 },
  ];

  it('returns null before first data point', () => {
    expect(getEloAt(hist, '2025-03-31')).toBeNull();
    expect(getEloAt(hist, '2025-04-01')).toBeNull(); // exclusive
  });

  it('returns most recent prior point', () => {
    expect(getEloAt(hist, '2025-04-02')).toBe(1500);
    expect(getEloAt(hist, '2025-04-06')).toBe(1510);
    expect(getEloAt(hist, '2025-04-11')).toBe(1490);
  });

  it('handles empty history', () => {
    expect(getEloAt([], '2025-04-01')).toBeNull();
  });
});
